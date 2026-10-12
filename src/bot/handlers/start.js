const { config } = require("../../config");
const { getMainKeyboard } = require("../keyboards/main");
const { escapeHtml } = require("../../utils/formmaters");
const { sendProductCard } = require("./browse");
const productsQuery = require("../../db/queries/products");

const registerStartHandlers = (bot) => {
    // /start command — with deep linking support
    bot.start(async (ctx) => {
        const userId = ctx.from.id.toString();

        // Clear any active sessions
        ctx.session.clear();

        // Check for deep link parameter: /start product_5
        const startPayload = ctx.startPayload;
        if (startPayload && startPayload.startsWith("product_")) {
            const productId = parseInt(startPayload.replace("product_", ""));
            if (productId) {
                const product = productsQuery.findById(productId);
                if (product && product.in_stock) {
                    await ctx.reply(
                        "👟 Here's the product you're looking for:",
                        await getMainKeyboard(userId),
                    );
                    await sendProductCard(ctx, product);
                    return;
                }
            }

            // Product not found or out of stock — show welcome
            await ctx.replyWithHTML(
                "😔 Sorry, that product is no longer available.\n\n" +
                    "Check out what we have:",
                await getMainKeyboard(userId),
            );
            return;
        }

        const shopName = escapeHtml(config.shop.name);

        ctx.replyWithHTML(
            `👟 Welcome to <b>${shopName}</b>!\n\n` +
                `Find your perfect pair, search by name, and order directly here.\n\n` +
                "👇 Use the menu below to get started:",
            await getMainKeyboard(userId),
        );
    });

    // /help
    bot.help((ctx) => {
        ctx.replyWithHTML(
            `<b>How to use this bot:</b>\n\n` +
                `🔍 <b>Search</b> — Type a shoe name to find it\n` +
                `👟 <b>Brands</b> — Browse by brand and filter\n` +
                `🆕 <b>New Drops</b> — See latest arrivals\n` +
                `🛒 <b>Cart</b> — View your shopping cart\n` +
                `📦 <b>My Orders</b> — Track your orders\n` +
                `❓ <b>FAQ</b> — Delivery, payment, returns\n\n` +
                `Need help? Tap ❓ FAQ or contact us directly.`,
        );
    });
};

module.exports = {
    registerStartHandlers,
};
