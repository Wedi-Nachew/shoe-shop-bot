require("dotenv").config();

const config = {
    bot: {
        token: process.env.BOT_TOKEN,
        ownerId: process.env.OWNER_CHAT_ID,
        mediaChannelId: process.env.MEDIA_CHANNEL_ID,
    },
    shop: {
        name: process.env.SHOP_NAME,
        phone: process.env.SHOP_PHONE,
        location: process.env.SHOP_LOCATION,
        telegram: process.env.SHOP_TELEGRAM,
    },
    app: {
        productsPerPage: parseInt(process.env.PRODUCTS_PER_PAGE) || 10,
        maxCartItems: parseInt(process.env.MAX_CART_ITEMS) || 20,
    },
    db: {
        path: process.env.DB_PATH || "./data/shop.db",
    },
    web: {
        port: parseInt(process.env.WEB_PORT) || 3000,
        url: process.env.WEB_URL || "",
        isProduction: process.env.NODE_ENV === "production",
    },
};

const validateConfig = () => {
    const missingFields = [];

    if (!config.bot.token) missingFields.push("BOT_TOKEN");
    if (!config.bot.ownerId) missingFields.push("OWNER_CHAT_ID");

    if (missingFields.length > 0) {
        console.error("Missing required environment variables");
        missingFields.forEach((field) => console.error(`- ${field}`));
        process.exit(1);
    }

    if (config.web.isProduction && !config.web.url) {
        console.warn(
            "⚠️  WEB_URL not set. Dashboard WebApp button will not work.",
        );
    }

    if (!config.bot.mediaChannelId) {
        console.warn(
            "⚠️  MEDIA_CHANNEL_ID not set. Image uploads from dashboard will not work.",
        );
    }
};
module.exports = { config, validateConfig };
