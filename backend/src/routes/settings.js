const express = require("express");
const {z} = require("zod");

const asyncHandler = require("../utils/asyncHandler");
const {requireAuth} = require("../middleware/auth");
const {validate} = require("../middleware/validate");
const Settings = require("../models/settings");

const router = express.Router();
router.use(requireAuth)

const settingsSchema = z.object({
    company_name: z.string().trim().max(120).optional(),
    logo_url: z.string().trim().max(500_000).optional(),
    address: z.string().trim().max(400).optional(),
    email: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(40).optional(),
    currency: z.string().trim().max(8).optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    invoice_prefix: z.string().trim().max(12).optional(),
    accent_color: z.string().trim().max(32).optional(),
})

router.get("/", asyncHandler(async (req, res) => {
    const settings = await Settings.ensure(req.user.id);
    res.json({settings});
}))

router.patch(
    "/",
    validate(settingsSchema),
    asyncHandler(async (req, res) => {
        const settings = await Settings.update(req.user.id, req.body);
        res.json({settings});
    })
)

module.exports = router;

