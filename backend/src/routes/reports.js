const express = require('express');

const asyncHandler = require("../utils/asyncHandler");
const {requireAuth} = require("../middleware/auth");
const {query, queryOne} = require("../config/db");
const {route} = require("express/lib/application");

const router = express.Router();
router.use(requireAuth);

const num = (v) => Number(v) || 0;

router.get('/', asyncHandler(async (req, res) => {
    const uid = req.user.id;

    const totals = await queryOne(
        `SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)  AS revenue,
                COALESCE(SUM(CASE WHEN status <> 'paid' THEN total ELSE 0 END), 0) AS outstanding,
                COUNT(*)::int                                                      AS invoice_count
         FROM invoices
         WHERE user_id = $1`,
        [uid]
    );
    const exp = await queryOne(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE user_id = $2`,
        [uid]
    )

    const {rows: monthly} = await query(
        `WITH months AS (SELECT date_trunc('month', CURRENT_DATE) - (n || ' month')::interval AS m
                         FROM generate_series(0, 5) n)
         SELECT to_char(months.m, 'Mon')                                                               AS label,
                to_char(months.m, 'YYYY-MM')                                                           AS ym,
                COALESCE((SELECT SUM(i.total)
                          FROM invoices i
                          WHERE i.user_id = $1
                            AND i.status = 'paid'
                            AND date_trunc('month', COALESCE(i.paid_at, i.issue_date)) = months.m), 0) AS revenue,
                COALESCE((SELECT SUM(e.amount)
                          FROM expenses e
                          WHERE e.user_id = $1
                            AND date_trunc('month', e.expense_date) = months.m), 0)                    AS expenses
         FROM months
         ORDER BY months.m`,
        [uid]
    )

    const aging = await queryOne(
        `SELECT COALESCE(SUM(CASE WHEN due_date IS NULL OR due_date >= CURRENT_DATE THEN total ELSE 0 END),
                         0)                                                                                 AS current,
                COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 1 AND 30 THEN total ELSE 0 END), 0)  AS d30,
                COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN total ELSE 0 END), 0) AS d60,
                COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN total ELSE 0 END), 0)              AS d90plus
         FROM invoices
         WHERE user_id = $1
           AND status = 'sent'`,
        [uid]
    )

    const {rows: topClients} = await query(
        `SELECT c.id,
                c.name,
                COALESCE(SUM(i.total), 0)                                             AS billed,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) AS paid
         FROM clients c
                  JOIN invoices i ON c.id = i.client_id
         WHERE c.user_id = $1
         GROUP BY c.id
         ORDER BY billed DESC
         LIMIT 5`
    )

    const status = await queryOne(
        `SELECT COALESCE(SUM(CASE WHEN status = 'draft' THEN total ELSE 0 END), 0) AS draft,
                COALESCE(SUM(CASE
                                 WHEN status = 'sent' AND (due_date IS NULL OR due_date >= CURRENT_DATE) THEN total
                                 ELSE 0 END), 0)                                   AS sent,
                COALESCE(SUM(CASE WHEN status = 'sent' AND due_date < CURRENT_DATE THEN total ELSE 0 END),
                         0)                                                        AS overdue,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)  AS paid
         FROM invoices
         WHERE user_id = $1`,
        [uid]
    )

    const revenue = num(totals.revenue)
    const expenses = num(exp.total)

    res.json({
        totals: {
            revenue,
            expenses,
            netProfit: Math.round((revenue - expenses) * 100) / 100,
            outstanding: num(totals.outstanding),
            invoiceCount: totals.invoice_count,
        },
        monthly: monthly.map((m) => ({
            label: m.label,
            ym: m.ym,
            revenue: num(m.revenue),
            expenses: num(m.expenses),
        })),
        aging: [
            {bucket: "Current", value: num(aging.current)},
            {bucket: "1-30d", value: num(aging.d30)},
            {bucket: "31-60d", value: num(aging.d60)},
            {bucket: "61-90d", value: num(aging.d90)},
            {bucket: "90d+", value: num(aging.d90plus)},
        ],
        topClients: topClients.map((c) => ({
            id: c.id,
            name: c.name,
            billed: num(c.billed),
            paid: num(c.paid),
        })),
        statusBreakdown: [
            {name: "Draft", value: num(status.draft), key: "draft"},
            {name: "Sent", value: num(status.sent), key: "sent"},
            {name: "Overdue", value: num(status.overdue), key: "overdue"},
            {name: "Paid", value: num(status.paid), key: "paid"},
        ],
    });
}))

module.exports = router;
