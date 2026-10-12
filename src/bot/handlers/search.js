const productsQuery = require("../../db/queries/products");
const { sendProductCard } = require("./browse");
const { isMenuButton } = require("../../utils/validators");

const registerSearchHandlers = (bot) => {
    // Search entry
    bot.hears("🔍 Search", (ctx) => {
        ctx.session.set("search");

        ctx.reply(
            "🔍 <b>Search Products</b>\n\n" +
                "Type what you're looking for:\n\n" +
                '• Brand name — <i>"Jordan"</i>\n' +
                '• Model — <i>"Air Max 90"</i>\n' +
                '• Colorway — <i>"University Blue"</i>\n' +
                '• Or anything — <i>"black sneakers"</i>',
            { parse_mode: "HTML" },
        );
    });

    // Text input handler
    bot.on("text", async (ctx, next) => {
        const text = ctx.message.text.trim();

        // Skip if it's a menu button
        if (isMenuButton(text)) return next();

        // Skip if it's a command
        if (text.startsWith("/")) return next();

        // Check if user has an active session that isn't search
        const state = ctx.session.getState();

        // If in checkout flow or admin flow, pass to next handler
        if (state && state !== "search") return next();

        // If no state and not search, still treat as search
        // (makes bot more forgiving — any random text = search)
        if (text.length < 2) {
            return ctx.reply("🔍 Type at least 2 characters to search.");
        }

        // Perform search
        const results = productsQuery.search(text, 20);

        if (!results.length) {
            return ctx.replyWithHTML(
                `😔 No results for "<b>${escapeLight(text)}</b>"\n\n` +
                    `Try:\n` +
                    `• Brand name (Jordan, Nike, Adidas)\n` +
                    `• Model name (Air Max, Dunk Low)\n` +
                    `• Colorway (black, university blue)`,
            );
        }

        // Clear search state
        ctx.session.clear();

        await ctx.replyWithHTML(
            `🔍 Found <b>${results.length}</b> result${results.length !== 1 ? "s" : ""} for "<b>${escapeLight(text)}</b>":`,
        );

        // Send product cards (limit to 10 to avoid spam)
        const toShow = results.slice(0, 10);
        for (const product of toShow) {
            await sendProductCard(ctx, product);
        }

        if (results.length > 10) {
            await ctx.reply(
                `📦 Showing 10 of ${results.length} results. Try a more specific search to narrow down.`,
            );
        }
    });
};

const escapeLight = (text) => {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

module.exports = { registerSearchHandlers };
