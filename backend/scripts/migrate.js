const {pool} = require("../src/config/db");
const {SCHEMA_SQL} = require("../src/config/schema");

(async () => {
    try {
        await pool.query(SCHEMA_SQL);
        console.log("✅ Schema applied.");
    } catch (error) {
        console.error("❌ Migration failed", error.message);
        process.exitCode = 1
    } finally {
        await pool.end();
    }
})()