const {Pool} = require('pg');
const env = require("./env")
const {SCHEMA_SQL} = require("./schema")

const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: {rejectUnauthorized: false},
    max: 10,
    idleTimeout: 30_000,
    connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
    console.error("Postgres pool error:", err.message);
});

async function query(text, params) {
    return pool.query(text, params);
}

async function queryOne(text, params) {
    const {rows} = await pool.query(text, params);
    return rows[0] || null;
}

async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function connectDB() {
    const {rows} = await pool.query("SELECT current_database() AS db");
    await pool.query(SCHEMA_SQL);
    console.log(`Postgres connected: ${rows[0].db} (schema ready)`);
}

module.exports = {pool, query, queryOne, withTransaction, connectDB};
