const express = require("express");
const {z} = require("zod");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {requireAuth} = require("../middleware/auth");
const {validate} = require("../middleware/validate");
const {query, queryOne, withTransaction} = require("../config/db");
const {route} = require("express/lib/application");
const {setsAndValues} = require("../utils/update");
const req = require("express/lib/request");
const client = require("../config/db");

const router = express.Router();
router.use(requireAuth);

const uuid = z.uuid("Invalid id")
const idParam = z.object({id: uuid})
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional();

const paymentSchema = z.object({
    invoiceId: uuid,
    amount: z.coerce.number().min(0.01).max(100_000_000),
    method: z.string().trim().max(40).optional(),
    paid_on: dateStr,
    notes: z.string().trim().max(500).optional(),
})

const num = (v) => Number(v) || 0

async function reconcileInvoice(client, invoiceId) {
    const {rows} = await client.query(
        `SELECT i.total, COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) AS paid
         FROM invoices i
         WHERE i.id = $1`,
        [invoiceId]
    )
    if (!rows[0]) return;
    const {total, paid} = rows[0]
    if (num(paid) >= num(total) && num(total) > 0) {
        await client.query(
            `UPDATE invoices
             SET status     = 'paid',
                 paid_at=COALESCE(paid_at, now()),
                 updated_at = now()
             WHERE id = $1`,
            [invoiceId]
        )
    } else {
        await client.query(
            `UPDATE invoices
             SET status     = CASE WHEN status = 'paid' THEN 'sent' ELSE status END,
                 paid_at    = CASE WHEN status = 'paid' THEN NULL ELSE paid_at END,
                 updated_at = now()
             WHERE id = $1`,
            [invoiceId]
        )
    }
}

router.get("/", async (req, res) => {
    const {rows} = await query(
        `SELECT p.*, i.invoice_number, i.total AS invoice_total, c.name AS client_name
         FROM payments p
                  JOIN invoices i ON i.id = p.invoice_id
                  LEFT JOIN clients c ON c.id = i.client_id
         WHERE p.user_id = $1
         ORDER BY p.paid_on DESC, p.created_at DESC `,
        [req.user.id]
    )

    const totals = await queryOne(
        `SELECT COALESCE(SUM(amount), 0)         AS total,
                COALESCE(SUM(CASE
                                 WHEN date_trunc('month', paid_on) = date_trunc('month', CURRENT_DATE) THEN amount
                                 ELSE 0 END), 0) AS this_month
         FROM payments
         WHERE user_id = $1`,
        [req.user.id]
    )

    req.json({
        payments: rows.map((p) => ({
            ...p,
            amount: num(p.amount),
            invoice_total: num(p.invoice_total),
        })),
        totals: {total: num(totals.total), thisMonth: num(totals.this_month)},
    })
})

router.post(
    "/",
    validate(paymentSchema),
    asyncHandler(async (req, res) => {
        const body = req.body;
        const invoice = await queryOne(
            `SELECT id
             FROM invoices
             WHERE id = $1
               AND user_id = $2`,
            [body.invoiceId, req.user.id]
        )
        if (!invoice) throw ApiError.notFound("Invoice not found");

        const payment = await withTransaction(async (client) => {
            const {rows} = await client.query(
                `INSERT INTO payments (user_id, invoice_id, amount, method, paid_on, notes)
                 VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6)
                 RETURNING *`,
                [req.user.id, body.invoiceId, body.amount, body.method || "", body.paid_on || null, body.notes || ""]
            )
            await reconcileInvoice(client, body.invoiceId)
            return rows[0]
        })

        res.status(201).json({payment: {...payment, amount: num(payment.amount)}})
    })
)

router.delete(
    "/:id",
    validate(idParam, "params"),
    asyncHandler(async (req, res) => {
        const existing = await queryOne(
            `SELECT invoice_id
             FROM payments
             WHERE id = $1
               AND user_id = $2`,
            [req.params.id, req.user.id]
        )
        if (!existing) throw ApiError.notFound("Payment not found");

        await withTransaction(async (client) => {
            await client.query(`DELETE
                                FROM payments
                                WHERE id = $1
                                  AND user_id = $2`, [req.params.id, req.user.id]);
            await reconcileInvoice(client, existing.invoice_id)
        })

        res.json({ok: true})
    })
)

module.exports = router