const { Markup } = require("telegraf");
const cartQuery = require("../../db/queries/cart");
const productsQuery = require("../../db/queries/products");
const { getMainKeyboard } = require("../keyboards/main");
const { formatPrice, formatCartItem } = require("../../utils/formmaters");

const registerCartHandlers = (bot) => {
    // PICK SIZE — Add to Cart (from size picker)
    bot.action(/^pick_size:(\d+):(.+)$/, async (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const size = ctx.match[2];
        const userId = ctx.from.id.toString();

        // Verify product exists and is in stock
        const product = productsQuery.findById(productId);
        if (!product || !product.in_stock) {
            return ctx.answerCbQuery("❌ Product is no longer available");
        }

        // Check size stock
        const sizeStock = productsQuery.getSizeStock(productId, size);
        if (sizeStock <= 0) {
            return ctx.answerCbQuery("❌ This size is out of stock");
        }

        // Check current cart quantity for this item
        const existing = cartQuery.exists(userId, productId, size);
        if (existing && existing.quantity >= sizeStock) {
            return ctx.answerCbQuery(
                `⚠️ Only ${sizeStock} available in size ${size}`,
            );
        }

        // Add to cart
        cartQuery.add(userId, productId, size);

        ctx.answerCbQuery(`✅ ${product.name} (Size ${size}) added to cart!`);

        // Send updated keyboard
        await ctx.reply("✅ Added to cart!", await getMainKeyboard(userId));
    });

    // BUY SIZE — Buy Now (add to cart + start checkout)
    bot.action(/^buy_size:(\d+):(.+)$/, async (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const size = ctx.match[2];
        const userId = ctx.from.id.toString();

        // Verify product exists and is in stock
        const product = productsQuery.findById(productId);
        if (!product || !product.in_stock) {
            return ctx.answerCbQuery("❌ Product is no longer available");
        }

        // Check size stock
        const sizeStock = productsQuery.getSizeStock(productId, size);
        if (sizeStock <= 0) {
            return ctx.answerCbQuery("❌ This size is out of stock");
        }

        // Check current cart quantity
        const existing = cartQuery.exists(userId, productId, size);
        if (existing && existing.quantity >= sizeStock) {
            return ctx.answerCbQuery(
                `⚠️ Only ${sizeStock} available in size ${size}`,
            );
        }

        // Add to cart
        cartQuery.add(userId, productId, size);

        ctx.answerCbQuery(`✅ Added! Starting checkout...`);

        // Start checkout flow immediately
        ctx.session.set("checkout_phone", {});

        await ctx.replyWithHTML(
            `✅ <b>${product.name}</b> (Size ${size}) added to cart!\n\n` +
                "📱 <b>Step 1/2: Phone Number</b>\n\n" +
                "Please share your phone number so we can contact you about your order.",
            Markup.keyboard([
                [Markup.button.contactRequest("📱 Share My Number")],
                ["❌ Cancel"],
            ]).resize().oneTime(),
        );
    });

    // Legacy cart: handler (for backwards compatibility)
    bot.action(/^cart:(\d+):(.+)$/, async (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const size = ctx.match[2];
        const userId = ctx.from.id.toString();

        const product = productsQuery.findById(productId);
        if (!product || !product.in_stock) {
            return ctx.answerCbQuery("❌ Product is no longer available");
        }

        const sizeStock = productsQuery.getSizeStock(productId, size);
        if (sizeStock <= 0) {
            return ctx.answerCbQuery("❌ This size is out of stock");
        }

        const existing = cartQuery.exists(userId, productId, size);
        if (existing && existing.quantity >= sizeStock) {
            return ctx.answerCbQuery(
                `⚠️ Only ${sizeStock} available in size ${size}`,
            );
        }

        cartQuery.add(userId, productId, size);
        ctx.answerCbQuery(`✅ ${product.name} (Size ${size}) added to cart!`);
        await ctx.reply("✅ Added to cart!", await getMainKeyboard(userId));
    });

    // View Cart
    bot.hears(/🛒 Cart/, async (ctx) => {
        ctx.session.clear();

        const userId = ctx.from.id.toString();
        const items = cartQuery.get(userId);

        if (!items.length) {
            return ctx.replyWithHTML(
                "🛒 <b>Your cart is empty</b>\n\n" +
                    "Browse products and tap 🛒 Add to Cart to get started.",
                await getMainKeyboard(userId),
            );
        }

        const total = cartQuery.getTotal(userId);

        let text = "🛒 <b>Your Cart:</b>\n\n";

        items.forEach((item, index) => {
            text += formatCartItem(item, index + 1);
            text += "\n\n";
        });

        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `💰 <b>Total: ${formatPrice(total)}</b>`;

        // Build cart action buttons
        const buttons = [];

        // Per-item controls
        items.forEach((item) => {
            buttons.push([
                Markup.button.callback(
                    `➖`,
                    `cart_dec:${item.product_id}:${item.size}`,
                ),
                Markup.button.callback(
                    `${item.name.substring(0, 15)} (${item.size}) × ${item.quantity}`,
                    "noop",
                ),
                Markup.button.callback(
                    `➕`,
                    `cart_inc:${item.product_id}:${item.size}`,
                ),
                Markup.button.callback(
                    `🗑`,
                    `cart_rm:${item.product_id}:${item.size}`,
                ),
            ]);
        });

        // Checkout and clear buttons
        buttons.push([
            Markup.button.callback("✅ Checkout", "checkout"),
            Markup.button.callback("🗑 Clear Cart", "cart_clear"),
        ]);

        ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
    });

    // Increment quantity
    bot.action(/^cart_inc:(\d+):(.+)$/, (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const size = ctx.match[2];
        const userId = ctx.from.id.toString();

        // Check stock
        const sizeStock = productsQuery.getSizeStock(productId, size);
        const existing = cartQuery.exists(userId, productId, size);

        if (existing && existing.quantity >= sizeStock) {
            return ctx.answerCbQuery(`⚠️ Only ${sizeStock} available`);
        }

        cartQuery.add(userId, productId, size, 1);
        ctx.answerCbQuery("➕ Quantity updated");
        refreshCart(ctx);
    });

    // Decrement Quantity
    bot.action(/^cart_dec:(\d+):(.+)$/, (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const size = ctx.match[2];
        const userId = ctx.from.id.toString();

        const existing = cartQuery.exists(userId, productId, size);
        if (!existing) return ctx.answerCbQuery("Item not found");

        if (existing.quantity <= 1) {
            cartQuery.removeItem(userId, productId, size);
            ctx.answerCbQuery("🗑 Item removed");
        } else {
            cartQuery.setQuantity(
                userId,
                productId,
                size,
                existing.quantity - 1,
            );
            ctx.answerCbQuery("➖ Quantity updated");
        }

        refreshCart(ctx);
    });

    // Remove Item
    bot.action(/^cart_rm:(\d+):(.+)$/, (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const size = ctx.match[2];
        const userId = ctx.from.id.toString();

        cartQuery.removeItem(userId, productId, size);
        ctx.answerCbQuery("🗑 Item removed");
        refreshCart(ctx);
    });

    // Clear Cart
    bot.action("cart_clear", async (ctx) => {
        const userId = ctx.from.id.toString();
        cartQuery.clear(userId);
        ctx.answerCbQuery("🗑 Cart cleared");

        try {
            ctx.editMessageText(
                "🛒 <b>Your cart is empty</b>\n\nBrowse products and tap 🛒 Add to Cart to get started.",
                { parse_mode: "HTML" },
            );
        } catch {}

        await ctx.reply("Cart cleared ✅", await getMainKeyboard(userId));
    });
};

const refreshCart = async (ctx) => {
    const userId = ctx.from.id.toString();
    const items = cartQuery.get(userId);

    if (!items.length) {
        try {
            await ctx.editMessageText(
                "🛒 <b>Your cart is empty</b>\n\nBrowse products and tap 🛒 Add to Cart to get started.",
                { parse_mode: "HTML" },
            );
        } catch {}

        return ctx.reply("Cart is empty", await getMainKeyboard(userId));
    }

    const total = cartQuery.getTotal(userId);

    let text = "🛒 <b>Your Cart:</b>\n\n";
    items.forEach((item, index) => {
        text += formatCartItem(item, index + 1);
        text += "\n\n";
    });
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 <b>Total: ${formatPrice(total)}</b>`;

    const buttons = [];
    items.forEach((item) => {
        buttons.push([
            Markup.button.callback(
                `➖`,
                `cart_dec:${item.product_id}:${item.size}`,
            ),
            Markup.button.callback(
                `${item.name.substring(0, 15)} (${item.size}) × ${item.quantity}`,
                "noop",
            ),
            Markup.button.callback(
                `➕`,
                `cart_inc:${item.product_id}:${item.size}`,
            ),
            Markup.button.callback(
                `🗑`,
                `cart_rm:${item.product_id}:${item.size}`,
            ),
        ]);
    });

    buttons.push([
        Markup.button.callback("✅ Checkout", "checkout"),
        Markup.button.callback("🗑 Clear Cart", "cart_clear"),
    ]);

    try {
        await ctx.editMessageText(text, {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard(buttons),
        });
    } catch {
        await ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
    }
};

module.exports = { registerCartHandlers };
