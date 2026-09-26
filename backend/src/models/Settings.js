const {query, queryOne, withTransaction} = require("../config/db");

const COLS = `user_id, company_name, logo_url, address, email, phone,
currency, tax_rate, invoice_prefix, next_seq, accent_color, created_at, updated_at`

async function ensure(userId) {
    await query(
        `INSERT INTO company_settings(user_id)
         VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
    )
    return queryOne(
        `SELECT ${COLS}
         FROM company_settings
         WHERE user_id = $1`,
        [userId]
    )
}

async function update(userId, fields) {
    await ensure(userId)
    const allowed = [
        "company_name", "logo_url", "address", "email", "phone",
        "currency", "tax_rate", "invoice_prefix", "accent_color"
    ]
    const sets = []
    const values = [userId]
    for (const key of allowed) {
        if (fields[key] !== undefined) {
            values.push(fields[key])
            sets.push(`${key} = $${values.length}`)
        }
    }

    if (!sets.length) return ensure(userId)
    return queryOne(
        `UPDATE company_settings
         SET ${sets.join(", ")},
             updated_at = now()
         WHERE user_id = $1 RETURNING ${COLS}`,
        values
    )
}

async function nextInvoiceNumber(userId) {
    return withTransaction(async (client) => {
        await client.query(
            `INSERT INTO company_settings(user_id)
             VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        )
        const {rows} = await client.query(
            `UPDATE company_settings
             SET next_seq   = next_seq + 1,
                 updated_at = now()
             WHERE user_id = $1 RETURNING invoice_prefix, next_seq`,
            [userId]
        )
        const {invoice_prefix, next_seq} = rows[0]
        const seq = next_seq - 1
        return `${invoice_prefix}${String(seq).padStart(4, "0")}`
    })
}

module.exports = {ensure, update, nextInvoiceNumber}