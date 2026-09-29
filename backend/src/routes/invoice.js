const express = require('express');
const {z} = require("zod");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {requireAuth} = require("../middleware/auth");
const {validate} = require("../middleware/validate");
const {query, queryOne, withTransaction} = require("../config/db");
const Settings = require("../models/Settings");
const {computeTotals, serializeInvoice} = require("../utils/invoice");
const {param} = require("express/lib/application");
const {update} = require("../models/Settings");

const router = express.Router();
router.use(requireAuth)

const uuid = z.uuid("Invalid id")
const idParam = z.object({id: uuid})
const dateStr = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()

const itemSchema = z.object({
    description: z.string().trim().max(500).default(""),
    quantity: z.number().min(0).max(1_000_000).default(1),
    rate: z.number().min(0).max(100_000_000).default(0),
})

const invoiceSchema = z.object({
    client_id: uuid.nullish(),
    invoice_number: z.string().trim().max(40).optional(),
    status: z.enum(["draft", "sent", "paid"]).default("draft"),
    issue_date: dateStr,
    due_date: dateStr,
    currency: z.string().trim().max(8).default("USD"),
    tax_rate: z.coerce.number().min(0).max(100).default(0),
    discount: z.coerce.number().min(0).max(100_000_000).default(0),
    notes: z.string().trim().max(4000).default(""),
    terms: z.string().trim().max(2000).default(""),
    items: z.array(itemSchema).default([]),
})

async function loadInvoice(userId, id) {
    const invoice = await queryOne(
        `SELECT i.*,
                c.name    AS client_name,
                c.email   AS client_email,
                c.company AS client_company,
                c.address AS client_address
         FROM invoices i
                  LEFT JOIN clients c ON c.id = i.client_id
         WHERE i.id = $1
           AND i.user_id = $2`,
        [id, userId]
    )
    if (!invoice) throw ApiError.notFound("Invoice not found");
    const {rows: items} = await query(
        `SELECT id, description, quantity, rate, amount, position
         FROM invoice_items
         WHERE invoice_id = $1
         ORDER BY position `,
        [id]
    )
    return serializeInvoice(invoice, items)
}

async function replaceItems(client, invoiceId, items) {
    await client.query(`DELETE
                        FROM invoice_items
                        WHERE invoice_id = $1`, [invoiceId]);
    for (const item of items) {
        await client.query(
            `INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount, position)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [invoiceId, item.description, item.quantity, item.rate, item.amount, item.position]
        )
    }
}

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const {status, client_id, search, sort = "issue_date", order = "desc"} =
            req.query;

        const params = [req.user.id]
        const where = ["i.user_id = $1"]

        if (client_id) {
            params.push(client_id)
            where.push(`i.client_id = $${params.length}`)
        }
        if (status && status !== "all") {
            if (status === "overdue")
                where.push(`i.status = 'sent' AND i.due_date < CURRENT_DATE`)
            else if (status === "sent")
                where.push(`i.status = 'sent' AND (i.due_date IS NULL OR i.due_date >= CURREN_DATE)`)
            else {
                params.push(status)
                where.push(`i.status = $${params.length}`)
            }
        }
        if (search) {
            params.push(`%${search}%`)
            where.push(
                `(i.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`
            )
        }
        const sortCol = {
            issue_date: "i.issue_date",
            total: "i.total",
            due_date: "i.due_date",
            created_at: "i.created_at"
        }[
            sort
            ] || "i.issue_date"
        const sortDir = order === "asc" ? "ASC" : "DESC"

        const {rows} = await query(
            `SELECT i.*, c.name AS client_name, c.company AS client_company
             FROM invoices i
                      LEFT JOIN clients c ON c.id = i.client_id
             WHERE ${where.join(" AND ")}
             ORDER BY ${sortCol} ${sortDir}, i.created_at DESC`,
            params
        )

        res.json({invoices: rows.map((r) => serializeInvoice(r))})
    })
)

router.get(
    "/:id",
    validate(idParam, "params"),
    asyncHandler(async (req, res) => {
        const invoice = await loadInvoice(req.user.id, req.params.id)
        res.json({invoice})
    })
)

router.post(
    "/",
    validate(invoiceSchema),
    asyncHandler(async (req, res) => {
        const body = req.body
        const totals = computeTotals(body.items, body.tax_rate, body.discount)
        const invoiceNumber =
            body.invoice_number || (await Settings.nextInvoiceNumber(req.user.id))

        const invoice = await withTransaction(async (client) => {
            const {rows} = await client.query(
                `INSERT INTO invoices
                 (user_id, client_id, invoice_number, status, issue_date, due_date,
                  currency, tax_rate, discount, subtotal, tax_amount, total, notes, terms, paid_at)
                 VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 RETURNING *`,
                [
                    req.user.id,
                    body.client_id || null,
                    invoiceNumber,
                    body.status,
                    body.issue_date || null,
                    body.due_date || null,
                    body.currency,
                    body.tax_rate,
                    totals.discount,
                    totals.subtotal,
                    totals.taxAmount,
                    totals.total,
                    body.notes,
                    body.terms,
                    body.status === "paid" ? new Date() : null,
                ]
            )

            await replaceItems(client, rows[0].id, totals.items)
            return rows[0]
        })

        res.status(201).json({invoice: await loadInvoice(req.user.id, invoice.id)})
    })
)

router.patch(
    "/:id",
    validate(idParam, "params"),
    validate(invoiceSchema.partial()),
    asyncHandler(async (req, res) => {
        const existing = await queryOne(
            `SELECT *
             FROM invoices
             WHERE id = $1
               AND user_id = $2`,
            [req.param.id, req.user.id]
        )
        if (!existing) throw ApiError.notFound("Invoice not found")

        const body = req.body
        const taxRate = body.tax_rate ?? Number(existing.tax_rate)
        const discount = body.discount ?? Number(existing.discount)

        await withTransaction(async (client) => {
            let totals = null
            if (body.items) totals = computeTotals(body.items, taxRate, discount)
            else if (body.tax_rate !== undefined || body.discount !== undefined) {
                const {rows: curItems} = await client.query(
                    `SELECT description, quantity, rate
                     FROM invoice_items
                     WHERE invoice_id = $1
                     ORDER BY position`,
                    [existing.id]
                )
                totals = computeTotals(curItems, taxRate, discount)
            }

            const sets = []
            const values = [existing.id]
            const set = (col, val) => {
                values.push(val)
                sets.push(`${col} = $${values.length}`)
            }

            if (body.client_id !== undefined) set("client_id", body.client_id || null)
            if (body.invoice_number !== undefined) set("invoice_number", body.invoice_number)
            if (body.status !== undefined) {
                set("status", body.status)
                set("paid_at", body.status === "paid" ? new Date() : null)
            }
            if (body.issue_date !== undefined) set("issue_date", body.issue_date)
            if (body.due_date !== undefined) set("due_date", body.due_date || null)
            if (body.currency !== undefined) set("currency", body.currency)
            if (body.notes !== undefined) set("notes", body.notes)
            if (body.terms !== undefined) set("terms", body.terms)
            if (totals) {
                set("tax_rate", taxRate)
                set("discount", totals.discount)
                set("subtotal", totals.subtotal)
                set("tax_amount", totals.taxAmount)
                set("total", totals.total)
            }

            if (sets.length) {
                await client.query(
                    `UPDATE invoices
                     SET ${sets.join(", ")},
                         updated_at = now()
                     WHERE id = $1`,
                    values
                )
            }
            if (totals && body.items) await replaceItems(client, existing.id, totals.items)
        })

        res.json({invoices: await loadInvoice(req.user.id, existing.id)})
    })
)

router.patch(
    "/:id/status",
    validate(idParam, "params"),
    validate(z.object({status: z.enum(["draft", "sent", "paid"])})),
    asyncHandler(async (req, res) => {
        const {status} = req.body
        const updated = await queryOne(
            `UPDATE invoices
             SET status     = $3,
                 paid_at    = $4,
                 updated_at = now()
             WHERE id = $1
               AND user_id = $2
             RETURNING id`,
            [req.params.id, req.user.id, status, status === "paid" ? new Date() : null],
        )
        if (!updated) throw ApiError.notFound("Invoice not found")
        res.json({invoice: await loadInvoice(req.user.id, req.params.id)})
    })
)

router.delete(
    "/:id",
    validate(idParam, "params"),
    asyncHandler(async (req, res) => {
        const result = await query(
            `DELETE
             FROM invoices
             WHERE id = $1
               AND user_id = $2`,
            [req.params.id, req.user.id]
        )
        if (!result.rowCount) throw ApiError.notFound("Invoice not found")
        res.json({ok: true})
    })
)

module.exports = router