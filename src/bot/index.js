const { config, validateConfig } = require("../config");
const { initializeSchema } = require("../db");
const { app } = require("../web/server");
const { Markup } = require("telegraf");
const bot = require("./instance");

// Validate env
validateConfig();

// Initialize database
initializeSchema();

// MIDDLEWARE
const { sessionMiddleware } = require("./middleware/state");
const { activityLogger } = require("./middleware/logger");

bot.use(sessionMiddleware);
bot.use(activityLogger);

// ==========================================
// REGISTER HANDLERS
// ==========================================
const { registerStartHandlers } = require("./handlers/start");
const { registerAdminHandlers } = require("./handlers/admin");
const { registerOrderHandlers } = require("./handlers/orders");
const { registerCartHandlers } = require("./handlers/cart");
const {
    registerBrowseHandlers,
    registerBackHandler,
} = require("./handlers/browse");
const { registerFaqHandlers } = require("./handlers/faq");
const { registerSearchHandlers } = require("./handlers/search");
const { ownerOnly } = require("./middleware/auth");

registerStartHandlers(bot);
registerAdminHandlers(bot);
registerOrderHandlers(bot);
registerCartHandlers(bot);
registerBrowseHandlers(bot);
registerBackHandler(bot);
registerFaqHandlers(bot);
registerSearchHandlers(bot);

// ==========================================
// /admin COMMAND — Opens web dashboard
// ==========================================
bot.command("admin", ownerOnly, (ctx) => {
    const webUrl = config.web.url;

    if (!webUrl) {
        const port = config.web.port;
        ctx.replyWithHTML(
            "👨‍💼 <b>Admin Dashboard</b>\n\n" +
                "⚠️ WEB_URL not configured.\n\n" +
                "<b>For local development:</b>\n" +
                `Open in browser: <code>http://localhost:${port}/admin</code>\n\n` +
                "<b>For production:</b>\n" +
                "Set <code>WEB_URL</code> in your environment variables.",
        );
        return;
    }

    const dashboardUrl = `${webUrl}/admin`;

    ctx.reply(
        "👨‍💼 Admin Dashboard",
        Markup.inlineKeyboard([
            [Markup.button.webApp("🌐 Open Dashboard", dashboardUrl)],
        ]),
    );
});

// ==========================================
// ERROR HANDLING
// ==========================================
bot.catch((err, ctx) => {
    console.error("Bot error:", err.message);
    try {
        ctx.reply("😔 Something went wrong. Please try again.");
    } catch {}
});

// ==========================================
// START BOT - Webhook (production) or Polling (development)
// ==========================================
const start = async () => {
    const port = config.web.port;

    if (config.web.isProduction && config.web.url) {
        // ==== PRODUCTION: Start Webhook ====
        console.log("Starting in webhook mode...");

        // 1. Delete existing webhook (if any)
        await bot.telegram.deleteWebhook();

        // 2. Set webhook path
        const secretPath = `/webhook/${config.bot.token}`;
        const webhookUrl = `${config.web.url}${secretPath}`;

        // 3. Add webhook handler to Express server
        app.use(secretPath, (req, res) => {
            return bot.handleUpdate(req.body, res);
        });

        // 4. Parse JSON bodies for webhook requests
        const bodyParser = require("express").json();
        app.use(secretPath, bodyParser);

        // 5. Start Express server
        app.listen(port, "0.0.0.0", async () => {
            console.log(`🌐 Server listening on port ${port}`);

            // Set webhook with Telegram
            try {
                await bot.telegram.setWebhook(webhookUrl, {
                    allowed_updates: ["message", "callback_query"],
                    drop_pending_updates: true,
                });

                const webhookInfo = await bot.telegram.getWebhookInfo();
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log(`🤖 ${config.shop.name} bot is running!`);
                console.log(`   Mode: Webhook`);
                console.log(`   URL: ${webhookUrl}`);
                console.log(
                    `   Pending updates: ${webhookInfo.pending_update_count}`,
                );
                console.log(`   Dashboard: ${config.web.url}/admin`);
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            } catch (err) {
                console.error("❌ Failed to set webhook:", err.message);
                console.log("⚠️  Falling back to polling mode...");
                await bot.telegram.deleteWebhook();
                await bot.launch();
                console.log("🤖 Bot running in polling mode (fallback)");
            }
        });
    } else {
        // ====== POLLING MODE (development) ======
        console.log("🔧 Starting in POLLING mode...");

        // 1. Make sure no webhook is set
        await bot.telegram.deleteWebhook();

        // 2. Start bot with long polling
        await bot.launch();

        // 3. Start Express server
        app.listen(port, () => {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`🤖 ${config.shop.name} bot is running!`);
            console.log(`   Mode: Long Polling`);
            console.log(`   Owner ID: ${config.bot.ownerId}`);
            console.log(`   API: http://localhost:${port}/api`);
            console.log(`   Dashboard: http://localhost:${port}/admin`);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        });
    }
};

// Launch the bot
start().catch((err) => {
    console.error("❌ Fatal startup error:", err.message);
    process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
