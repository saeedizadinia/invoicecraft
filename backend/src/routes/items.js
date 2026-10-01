const express = require("express");
const {z} = require("zod");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {requireAuth} = require("../middleware/auth");
const {validate} = require("../middleware/validate");
const {query, queryOne} = require("../config/db");
const {setsAndValues} = require("../utils/update");

const router = express.Router();
router.use(requireAuth);

const uuid = z.uuid("Invalid id")
const idParam = z.object({id: uuid})

const itemSchema = z.object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).optional(),
    rate: z.coerce.number().min(0).max(100_000_000).default(0),
    unit: z.string().trim().max(24).optional(),
})

router.get("/", asyncHandler(async (req, res) => {
    const {rows} = await query(
        `SELECT *
         FROM catalog_items
         WHERE user_id = $1
         ORDER BY name `,
        [req.user.id]
    )
    res.json({items: rows.map((r) => ({...r, rate: Number(r.rate)}))});
}))

router.post(
    "/",
    validate(itemSchema),
    asyncHandler(async (req, res) => {
        const body = req.body;
        const item = await queryOne(
            `INSERT INTO catalog_items (user_id, name, description, rate, unit)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.id, body.name, body.description || "", body.rate, body.unit || ""]
        )
    }))

router.patch(
    "/:id",
    validate(idParam, "params"),
    validate(itemSchema.partial()),
    asyncHandler(async (req, res) => {
        const fields = ["name", "description", "rate", "unit"];
        const {setsAndValues} = require("../utils/update")
        const sv = setsAndValues(req, fields)
        const sets = sv[1]
        const values = sv[2]

        const item = await queryOne(
            `UPDATE catalog_items
             SET ${sets.join(", ")},
                 updated_at = now()
             WHERE id = $1
               AND user_id = $2
             RETURNING *`,
            values
        )
        if (!item) throw ApiError.notFound("Item not found");
        res.json({item: {...item, rate: Number(item.rate)}});
    })
)

router.delete(
    "/:id",
    validate(idParam, "params"),
    asyncHandler(async (req, res) => {
        const r = await query(`DELETE
                               FROM catalog_items
                               WHERE id = $1
                                 AND user_id = $2`,
            [req.params.id, req.user.id]
        );
        if (!r.rowCount) throw ApiError.notFound("Item not found");
        res.json({ok: true});
    }))

module.exports = router;