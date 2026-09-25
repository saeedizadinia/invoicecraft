const {rateLimit, ipKeyGenerator} = require("express-rate-limit");

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 15,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req, res) => req.user?.id || ipKeyGenerator(req, res),
    message: {
        error: {message: "Too many AI requests - please wait a minute and retry."},
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req, res) => ipKeyGenerator(req, res),
    message: {
        error: {message: "Too many auth attempts - please wait 15 minutes and retry."},
    }
})

module.exports = {aiLimiter, authLimiter};