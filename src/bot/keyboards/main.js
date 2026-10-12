const { Markup } = require("telegraf");
const cartQuery = require("../../db/queries/cart");
const { config } = require("../../config");

// Build persistent keyboard with cart count (for customers)
const getMainKeyboard = async (userId = null) => {
    // Check if user is admin
    if (userId && userId === config.bot.ownerId) {
        return getAdminKeyboard();
    }

    let cartLabel = "🛒 Cart";

    if (userId) {
        try {
            const count = cartQuery.getCount(userId);
            if (count > 0) {
                cartLabel = `🛒 Cart (${count})`;
            }
        } catch (error) {
            // Silently fail - user will see default cart label
        }
    }

    return Markup.keyboard([
        ["🔍 Search", "👟 Brands"],
        ["🆕 New Drops", cartLabel],
        ["📦 My Orders", "❓ FAQ"],
    ]).resize();
};

// Build admin-specific keyboard
const getAdminKeyboard = () => {
    return Markup.keyboard([
        ["⏳ Pending", "📊 Sales"],
        ["⚠️ Low Stock", "➕ Add Product"],
        ["👟 Browse Shop", "❓ FAQ"],
    ]).resize();
};

// send or update main keyboard
const refreshMainKeyboard = async (
    ctx,
    text = "👇 What would you like to do?",
) => {
    const userId = ctx.from.id.toString();

    return ctx.reply(text, {
        parse_mode: "HTML",
        ...(await getMainKeyboard(userId)),
    });
};

module.exports = {
    getMainKeyboard,
    getAdminKeyboard,
    refreshMainKeyboard,
};
