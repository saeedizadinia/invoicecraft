const {GoogleGenAI, Type} = require("@google/genai")
const {z} = require("zod");

const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const ai = env.geminiApiKey ? new GoogleGenAI({apiKey: env.geminiApiKey}) : null;

function requireAI() {
    if (!ai) throw ApiError.internal("GEMINI_API_KEY is not configured on the server.")
}

async function generate({contents, config}) {
    const result = await ai.models.generateContent({
        model: env.geminiModel,
        contents,
        config,
    })
    const text = typeof result.text === "function" ? result.text() : result.text;
    if (!text) throw new Error("Empty response from Gemini")
    return text
}

const receiptResponseSchema = {
    type: Type.OBJECT,
    required: ["vendor", "total", "lineItems"],
    properties: {
        vendor: {type: Type.STRING, description: "Merchant / vendor name"},
        date: {type: Type.STRING, description: "ISO date YYYY-MM-DD if visible, else empty"},
        currency: {type: Type.STRING, description: "3-letter code like USD, else empty"},
        subtotal: {type: Type.NUMBER},
        tax: {type: Type.NUMBER},
        total: {type: Type.NUMBER},
        category: {type: Type.STRING, description: "Expense category e.g. Meals, Software, Travel"},
        notes: {type: Type.STRING},
        lineItems: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                required: ["description", "quantity", "rate"],
                properties: {
                    description: {type: Type.STRING},
                    quantity: {type: Type.NUMBER},
                    rate: {type: Type.NUMBER, description: "Unit price"},
                }
            }
        },
    }
}

const receiptValidator = z.object({
    vendor: z.string().default(""),
    date: z.string().default(""),
    currency: z.string().default(""),
    subtotal: z.number().default(0),
    tax: z.number().default(0),
    total: z.number().default(0),
    category: z.string().default(""),
    notes: z.string().default(""),
    lineItems: z.array(z.object({
        description: z.string().default(""),
        quantity: z.coerce.number().default(1),
        rate: z.coerce.number().default(0),
    })).default([]),
})


async function parseReceipt({buffer, mimeType}) {
    requireAI()
    const prompt = [
        "You are an accounts-payable assistant. Extract structured data from this receipt or invoice image/PDF.",
        "Return the vendor, date, currency, each line item(description, quantity, unit rate), subtotal, tax, and grand total.",
        "If a value is not visible, use an empty string or 0. Quantities default to 1 when not shown.",
        "Suggest a sensible expense category.",
    ].join("\n");

    const text = await generate({
        contents: [
            {
                role: "user",
                parts: [
                    {text: prompt},
                    {inlineData: {mimeType, data: buffer.toString("base64")}},
                ],
            },
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: receiptResponseSchema,
            temperature: 0.1,
        },
    });

    return receiptValidator.parse(JSON.parse(text));
}

async function businessSummary(data) {
    requireAI()
    const prompt = [
        "You are a friendly financial analyst for a small business owner.",
        "Given this month's billing data (JSON), write a concise 2-3 sentence plain-English summary.",
        "Mention revenue trend vs last month with a percentage if computable, count and dollar total of overdue invoices,",
        "and one actionable suggestion (e.g. follow up with a specific client). Be specific with numbers. No markdown, no bullet points.",
        "",
        "DATA:",
        JSON.stringify(data),
    ].join("\n");

    const text = await generate({
        contents: [{role: "user", parts: [{text: prompt}]}],
        config: {temperature: 0.5}
    });
    return text.trim()
}

async function paymentReminder({tone, invoice, client, company, daysOverdue}) {
    requireAI()
    const toneGuide = tone === "firm"
        ? "firm but professional -- this invoice is significantly overdue"
        : tone === "final"
            ? "serious and direct -- a final notice before escalation, still courteous"
            : "warm, polite and friendly -- a gentle nudge";

    const prompt = [
        `Write a payment reminder email. Tone: ${toneGuide}.`,
        "Return a short subject line, then  a blank line, then the email body.",
        "Use the merchant/company name as the signature. Keep it under 130 words. Plain text, no markdown.",
        "",
        "CONTEXT:",
        JSON.stringify({invoice, client, company, daysOverdue}),
    ].join("\n");

    const text = await generate({
        contents: [{role: "user", parts: [{text: prompt}]}],
        config: {temperature: 0.6}
    });

    const trimmed = text.trim();
    const nl = trimmed.indexOf("\n");
    let subject = ""
    let body = trimmed
    if (nl > -1) {
        subject = trimmed.slice(0, nl).replace(/^subject:\s*/i, "").trim();
        body = trimmed.slice(nl + 1).trim()
    }
    return {subject, body}
}

async function writeNote({kind, prompt, items, client}) {
    requireAI()
    const target = kind === "terms"
        ? "professional payment-terms / notes text for the bottom of an invoice"
        : "a concise, professional service description for an invoice line item or summary";

    const full = [
        `Write ${target}.`,
        prompt ? `The user's request: ${prompt}` : "",
        "Keep it polished and brief (1-3 sentences). Plain text only, no markdown, no preamble.",
        items?.length ? `Line items for context: ${JSON.stringify(items)}` : "",
        client ? `Client: ${JSON.stringify(client)}` : "",
    ]
        .filter(Boolean)
        .join("\n")

    const text = await generate({
        contents: [{role: "user", parts: [{text: full}]}],
        config: {temperature: 0.7}
    })

    return text.trim()
}

module.exports = {
    parseReceipt,
    businessSummary,
    paymentReminder,
    writeNote
}