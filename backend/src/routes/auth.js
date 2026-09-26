const express = require('express');
const {z} = require("zod");

const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {signToken, cookieOptions} = require("../utils/jwt");
const {validate} = require("../middleware/validate");
const {requireAuth} = require("../middleware/auth");
const {authLimiter} = require("../middleware/rateLimit");
const User = require("../models/User");
const Settings = require("../models/Settings");

const router = express.Router();

const registeredSchema = z.object({
    name: z.string().trim().min(1).max(80),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(128),
    companyName: z.string().trim().max(120).optional(),
    address: z.string().trim().max(400).optional(),
})

const loginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1).max(128),
})

const profileSchema = z.object({
    name: z.string().trim().min(1).max(80),
})

const passwordSchema = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
})

function issueSession(res, user) {
    const token = signToken({sub: user.id});
    res.cookie(env.cookieName, token, cookieOptions);
}

router.post(
    "/register",
    authLimiter,
    validate(registeredSchema),
    asyncHandler(async (req, res) => {
        const {name, email, password, companyName, address} = req.body;

        const existing = await User.findByEmail(email);
        if (existing) throw ApiError.conflict("Email already registered");

        const passwordHash = await User.hashPassword(password);
        const user = await User.create({name, email, passwordHash});

        await Settings.ensure(user.id);
        if (companyName || address) {
            await Settings.update(user.id, {
                company_name: companyName || "",
                address: address || "",
                email,
            })
        }

        issueSession(res, user);
        res.status(201).json({user})
    })
)

router.post(
    "/login",
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        const {email, password} = req.body;

        const record = await User.findByEmail(email);
        if (!record) throw ApiError.unauthorized("Invalid credentials");

        const ok = await User.comparePassword(password, record.password_hash);
        if (!ok) throw ApiError.unauthorized("Invalid credentials");

        const user = {
            id: record.id,
            email: record.email,
            name: record.name,
            created_at: record.created_at,
            updated_at: record.updated_at,
        }
        issueSession(res, user);
        res.json({user})
    })
)

router.post(
    "/logout",
    (
        req,
        res
    ) => {
        res.clearCookie(env.cookieName, {...cookieOptions, maxAge: 0});
        res.json({ok: true});
    }
)

router.get(
    "/me",
    requireAuth,
    asyncHandler(async (req, res) => {
        res.json({user: req.user});
    })
)

router.patch(
    "/profile",
    requireAuth,
    validate(profileSchema),
    asyncHandler(async (req, res) => {
        const user = await User.updateName(req.user.id, req.body.name);

        res.json({user})
    })
)

router.patch(
    "/password",
    authLimiter,
    requireAuth,
    validate(passwordSchema),
    asyncHandler(async (req, res) => {
        const record = await User.findByIdWithHash(req.user.id);
        if (!record) throw ApiError.unauthorized("Session no longer valid");

        const ok = await User.comparePassword(
            req.body.currentPassword,
            record.password_hash
        );
        if (!ok) throw ApiError.unauthorized("Current password is incorrect");

        const passwordHash = await User.hashPassword(req.body.newPassword);
        await User.updatePassword(req.user.id, passwordHash);
        res.json({ok: true})
    })
)

module.exports = router;

