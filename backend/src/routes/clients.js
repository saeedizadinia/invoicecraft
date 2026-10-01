const express = require('express')
const {z} = require('zod')

const asyncHandler = require("../utils/asyncHandler")
const ApiError = require("../utils/ApiError")
const {requireAuth} = require("../middleware/auth")
const {validate} = require("../middleware/validate")
const {query, queryOne} = require("../config/db")

const router = express.Router()
router.use(requireAuth)

const uuid = z.uuid("Invalid id")
const idParam = z.object({id: uuid})

const clientSchema = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.email().trim().or(z.literal("")).optional(),
    company: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(40).optional(),
    address: z.string().trim().max(400).optional(),
    notes: z.string().trim().max(2000).optional(),
})

router.get("/", asyncHandler(async (req, res) => {
    const {rows} = await query(
        `SELECT c.*,
                COUNT(i.id)::int                                                       AS invoice_count,
                COALESCE(SUM(i.total), 0)                                              AS total_billed,
                COALESCE(SUM(CASE WHEN i.status <> 'paid' THEN i.total ELSE 0 END), 0) AS outstanding
         FROM clients c
                  LEFT JOIN invoices i ON i.client_id = c.id
         WHERE c.user_id = $1
         GROUP BY c.id, c.created_at
         ORDER BY c.created_at DESC `,
        [req.user.id]
    )

    const clients = rows.map((r) => ({
        ...r,
        total_billed: Number(r.total_billed),
        outstanding: Number(r.outstanding),
    }))
    res.json({clients})
}))

router.get(
    "/:id",
    validate(idParam, "params"),
    asyncHandler(async (req, res) => {
        const client = await queryOne(
            `SELECT *
             FROM clients
             WHERE id = $1
               AND user_id = $2`,
            [req.params.id, req.user.id]
        )
        if (!client) throw ApiError.notFound("Client not found")

        const {rows: invoices} = await query(
            `SELECT id,
                    invoice_number,
                    status,
                    issue_date,
                    due_date,
                    total,
                    currency,
                    created_at
             FROM invoices
             WHERE client_id = $1
               AND user_id = $2
             ORDER BY issue_date DESC, created_at DESC`,
            [req.params.id, req.user.id]
        )

        const totalBilled = invoices.reduce((total, invoice) => total + Number(invoice.total), 0)
        const outstanding = invoices
            .filter(invoice => invoice.status !== "paid")
            .reduce((total, invoice) => total + Number(invoice.total), 0);

        res.json({
            client,
            invoices: invoices.map(i => ({...i, total: Number(i.total)})),
            stats: {totalBilled, outstanding, count: invoices.length},
        })
    }))

router.post(
    "/",
    validate(clientSchema),
    asyncHandler(async (req, res) => {
        const reqBody = req.body
        const client = await queryOne(
            `INSERT INTO clients (user_id, name, email, company, phone, address, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                req.user.id,
                reqBody.name,
                reqBody.email || "",
                reqBody.company || "",
                reqBody.phone || "",
                reqBody.address || "",
                reqBody.notes || "",
            ]
        );
        res.status(201).json({client})
    }))

router.patch(
    "/:id",
    validate(idParam, "params"),
    validate(clientSchema.partial()),
    asyncHandler(async (req, res) => {
        const fields = ["name", "email", "company", "phone", "address", "notes"]
        const {setsAndValues} = require("../utils/update")
        const sv = setsAndValues(req, fields)
        const sets = sv[1]
        const values = sv[2]

        const client = await queryOne(
            `UPDATE clients
             SET ${sets.join(", ")},
                 updated_at = now()
             WHERE id = $1
               AND user_id = $2
             RETURNING *`,
            values
        )
        if (!client) throw ApiError.notFound("Client not found")
        res.json({client})
    })
)

router.delete(
    "/:id",
    validate(idParam, "params"),
    asyncHandler(async (req, res) => {
        const result = await query(
            `DELETE
             FROM clients
             WHERE id = $1
               AND user_id = $2`,
            [req.params.id, req.user.id]
        );
        if (!result.rowCount) throw ApiError.notFound("Client not found")
        res.json({ok: true})
    })
)

module.exports = router