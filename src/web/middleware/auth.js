const crypto = require("crypto");
const { config } = require("../../config");

//  Validate Telegram WebApp initData
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

const telegramAuth = (req, res, next) => {
    // In development, allow bypass with owner ID header
    if (!config.web.isProduction && process.env.DEV_AUTH === "true") {
        const devUserId = req.headers["x-dev-user-id"];
        if (devUserId === config.bot.ownerId) {
            req.telegramUser = {
                id: parseInt(config.bot.ownerId),
                first_name: "Dev Owner",
            };
            return next();
        }
    }

    const initData = req.headers["x-telegram-init-data"];

    if (!initData) {
        return res.status(401).json({ error: "Missing Telegram auth data" });
    }

    try {
        const validated = validateInitData(initData);

        if (!validated) {
            return res.status(401).json({ error: "Invalid auth data" });
        }

        // Check if user is owner
        if (validated.user.id.toString() !== config.bot.ownerId) {
            return res
                .status(403)
                .json({ error: "Access denied. Owner only." });
        }

        // Check auth_date is not too old (24 hours)
        const authAge = Date.now() / 1000 - validated.auth_date;
        if (authAge > 86400) {
            return res
                .status(401)
                .json({ error: "Auth expired. Reopen dashboard." });
        }

        req.telegramUser = validated.user;
        next();
    } catch (err) {
        console.error("Auth error:", err.message);
        return res.status(401).json({ error: "Auth validation failed" });
    }
};

// Validate and parse Telegram initData
const validateInitData = (initData) => {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) return null;

    // Remove hash from params for verification
    params.delete("hash");

    // Sort params alphabetically and build data-check-string
    const dataCheckArr = [];
    params.sort();
    params.forEach((value, key) => {
        dataCheckArr.push(`${key}=${value}`);
    });
    const dataCheckString = dataCheckArr.join("\n");

    // Create secret key from bot token
    const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(config.bot.token)
        .digest();

    // Calculate hash
    const calculatedHash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

    // Compare hashes
    if (calculatedHash !== hash) return null;

    // Parse user data
    const userStr = params.get("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const authDate = parseInt(params.get("auth_date"));

    return { user, auth_date: authDate };
};

module.exports = { telegramAuth, validateInitData };
