const express = require("express");
const multer = require("multer");
const bot = require("../../bot/instance");
const { config } = require("../../config");

const router = express.Router();

// Memory storage — never touches disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
        }
    },
});

//  POST /api/upload
//  Upload image → Telegram → return file_id
router.post("/", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image provided" });
        }

        const mediaChannelId = config.bot.mediaChannelId;

        if (!mediaChannelId) {
            return res.status(500).json({
                error: "MEDIA_CHANNEL_ID not configured",
            });
        }

        // Send photo to private media channel
        const result = await bot.telegram.sendPhoto(
            mediaChannelId,
            { source: req.file.buffer },
            { caption: `Product image upload — ${new Date().toISOString()}` },
        );

        // Get highest resolution photo file_id
        const photos = result.photo;
        const fileId = photos[photos.length - 1].file_id;

        res.json({
            success: true,
            fileId,
            message: "Image uploaded successfully",
        });
    } catch (error) {
        console.error("Upload error:", error.message);
        res.status(500).json({ error: "Failed to upload image" });
    }
});

module.exports = router;
