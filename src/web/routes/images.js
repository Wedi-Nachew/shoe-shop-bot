const express = require("express");
const bot = require("../../bot/instance");

const router = express.Router();

// In-memory cache for file URLs
const urlCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

//  GET /api/images/:fileId
//  Proxy Telegram image for web display
router.get("/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;

        // Check cache
        const cached = urlCache.get(fileId);
        if (cached && cached.expires > Date.now()) {
            return res.redirect(cached.url);
        }

        // Get file URL from Telegram
        const fileUrl = await bot.telegram.getFileLink(fileId);

        // Cache the URL
        urlCache.set(fileId, {
            url: fileUrl.href,
            expires: Date.now() + CACHE_TTL,
        });

        // Redirect to Telegram CDN
        res.redirect(fileUrl.href);
    } catch (error) {
        console.error("Image proxy error:", error.message);
        res.status(404).json({ error: "Image not found" });
    }
});

// Cleanup expired cache entries periodically
setInterval(
    () => {
        const now = Date.now();
        for (const [key, value] of urlCache) {
            if (value.expires < now) urlCache.delete(key);
        }
    },
    10 * 60 * 1000,
); // Every 10 minutes

module.exports = router;
