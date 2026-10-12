const { Markup } = require("telegraf");
const cartQuery = require("../../db/queries/cart");
const ordersQuery = require("../../db/queries/orders");
const { config } = require("../../config");
const { getMainKeyboard } = require("../keyboards/main");
const {
    formatPrice,
    formatOrderSummary,
    formatOrderNotification,
} = require("../../utils/formmaters");
const { validatePhone } = require("../../utils/validators");
const { ORDER_STATUS_LABELS } = require("../../config/constants");

const registerOrderHandlers = (bot) => {
    // CHECKOUT ENTRY
    bot.action("checkout", (ctx) => {
        const userId = ctx.from.id.toString();
        const items = cartQuery.get(userId);

        if (!items.length) {
            return ctx.answerCbQuery("Cart is empty");
        }

        ctx.answerCbQuery();

        // Start checkout flow
        ctx.session.set("checkout_phone", {});

        ctx.replyWithHTML(
            "📱 <b>Step 1/2: Phone Number</b>\n\n" +
                "Share your phone number so we can contact you about your order.",
            Markup.keyboard([
                [Markup.button.contactRequest("📱 Share My Number")],
                ["❌ Cancel"],
            ]).resize().oneTime(),
        );
    });

    // Receive shared contact (Telegram Contact button)
    bot.on("contact", async (ctx, next) => {
        const state = ctx.session.getState();
        if (state !== "checkout_phone") return next();

        const contact = ctx.message.contact;

        // Only accept the user's own contact
        if (contact.user_id !== ctx.from.id) {
            return ctx.reply("⚠️ Please share your own phone number.");
        }

        let phone = contact.phone_number;
        // Normalize: add + if missing
        if (!phone.startsWith("+")) {
            phone = "+" + phone;
        }

        // Save phone and ask for address
        ctx.session.set("checkout_address", { phone });

        await ctx.replyWithHTML(
            `✅ Phone: <b>${phone}</b>\n\n` +
                "📍 <b>Step 2/2: Delivery Address</b>\n\n" +
                "Where should we deliver your order?\n\n" +
                "Example: <code>Bole, near Edna Mall, Addis Ababa</code>",
            Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        "❌ Cancel Checkout",
                        "checkout_cancel",
                    ),
                ],
            ]),
        );

        // Restore main keyboard
        const userId = ctx.from.id.toString();
        await ctx.reply("👇", await getMainKeyboard(userId));
    });

    // Receive phone number (typed manually)
    bot.on("text", async (ctx, next) => {
        const state = ctx.session.getState();
        if (state !== "checkout_phone") return next();

        const text = ctx.message.text.trim();

        // Handle cancel button
        if (text === "❌ Cancel") {
            ctx.session.clear();
            const userId = ctx.from.id.toString();
            await ctx.reply("❌ Checkout cancelled. Your cart items are still saved.", await getMainKeyboard(userId));
            return;
        }

        const phone = validatePhone(text);

        if (!phone) {
            return ctx.replyWithHTML(
                "❌ Invalid phone number. Please use one of these formats:\n\n" +
                    "• <code>0912345678</code>\n" +
                    "• <code>+251912345678</code>\n" +
                    "• <code>912345678</code>\n\n" +
                    "Or tap the button below to share your number automatically.",
            );
        }

        // Save phone and ask for address
        ctx.session.set("checkout_address", { phone });

        ctx.replyWithHTML(
            `✅ Phone: <b>${phone}</b>\n\n` +
                "📍 <b>Step 2/2: Delivery Address</b>\n\n" +
                "Where should we deliver your order?\n\n" +
                "Example: <code>Bole, near Edna Mall, Addis Ababa</code>",
            Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        "❌ Cancel Checkout",
                        "checkout_cancel",
                    ),
                ],
            ]),
        );
    });

    // CHECKOUT: RECEIVE ADDRESS -> CONFIRM
    bot.on("text", async (ctx, next) => {
        const state = ctx.session.getState();
        if (state !== "checkout_address") return next();

        const address = ctx.message.text.trim();
        const sessionData = ctx.session.getData();

        if (address.length < 5) {
            return ctx.reply("📍 Please provide a more detailed address.");
        }

        // Get cart for confirmation
        const userId = ctx.from.id.toString();
        const items = cartQuery.get(userId);
        const total = cartQuery.getTotal(userId);

        if (!items.length) {
            ctx.session.clear();
            return ctx.reply("❌ Your cart is empty. Checkout cancelled.");
        }

        // Save address and show confirmation
        ctx.session.set("checkout_confirm", {
            phone: sessionData.phone,
            address,
        });

        let confirmText = "📋 <b>Confirm Your Order:</b>\n\n";
        confirmText += `👤 ${ctx.from.first_name || "Customer"}\n`;
        confirmText += `📱 ${sessionData.phone}\n`;
        confirmText += `📍 ${address}\n\n`;
        confirmText += `🛒 <b>Items:</b>\n`;

        items.forEach((item) => {
            confirmText += `• ${item.name}`;
            if (item.colorway) confirmText += ` (${item.colorway})`;
            confirmText += ` — Size ${item.size} × ${item.quantity}\n`;
            confirmText += `  ${formatPrice(item.price * item.quantity)}\n`;
        });

        confirmText += `\n💰 <b>Total: ${formatPrice(total)}</b>`;

        ctx.replyWithHTML(
            confirmText,
            Markup.inlineKeyboard([
                [Markup.button.callback("✅ Confirm Order", "order_confirm")],
                [Markup.button.callback("❌ Cancel", "checkout_cancel")],
            ]),
        );
    });

    // ORDER CONFIRMED
    bot.action("order_confirm", async (ctx) => {
        const userId = ctx.from.id.toString();
        const sessionData = ctx.session.getData();

        if (!sessionData.phone) {
            ctx.session.clear();
            return ctx.answerCbQuery("Session expired. Please try again.");
        }

        try {
            const result = ordersQuery.createFromCart(userId, {
                name: ctx.from.first_name || "Customer",
                username: ctx.from.username || null,
                phone: sessionData.phone,
                address: sessionData.address,
            });

            // Clear session
            ctx.session.clear();

            ctx.answerCbQuery("✅ Order placed!");

            // Rich order confirmation message
            try {
                await ctx.editMessageText(
                    `🎉 <b>Order #${result.orderId} Received!</b>\n\n` +
                        `💰 Total: ${formatPrice(result.total)}\n` +
                        `📱 We'll contact you at ${sessionData.phone}\n\n` +
                        `We'll review your order and confirm it shortly.\n` +
                        `Track your order in 📦 My Orders`,
                    {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback("📦 View Order", `order_view:${result.orderId}`)],
                        ]),
                    },
                );
            } catch {}

            // Send updated keyboard
            await ctx.reply("✅ Order placed successfully!", await getMainKeyboard(userId));

            // Notify owner
            await notifyOwner(ctx, result.orderId);
        } catch (error) {
            ctx.session.clear();

            if (error.message.includes("Insufficient stock")) {
                ctx.answerCbQuery("❌ Some items are out of stock");
                await ctx.replyWithHTML(
                    `😔 <b>Order couldn't be placed</b>\n\n` +
                        `Some items in your cart are no longer available in the requested quantity.\n\n` +
                        `Please check your cart and try again.`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback("🛒 Go to Cart", "view_cart")],
                    ]),
                );
            } else {
                console.error("Order creation failed:", error);
                ctx.answerCbQuery("❌ Order failed");
                await ctx.reply("❌ Something went wrong. Please try again.");
            }
        }
    });

    // View cart action (from error messages)
    bot.action("view_cart", async (ctx) => {
        ctx.answerCbQuery();
        // Trigger the cart view by sending the cart emoji text
        const userId = ctx.from.id.toString();
        const items = cartQuery.get(userId);

        if (!items.length) {
            return ctx.reply("🛒 Your cart is empty.");
        }

        // Just redirect them
        await ctx.reply("Tap 🛒 Cart below to view your cart.", await getMainKeyboard(userId));
    });

    // CANCEL CHECKOUT
    bot.action("checkout_cancel", async (ctx) => {
        ctx.session.clear();
        ctx.answerCbQuery("Checkout cancelled");

        try {
            ctx.editMessageText(
                "❌ Checkout cancelled. Your cart items are still saved.",
            );
        } catch {}

        // Restore main keyboard
        const userId = ctx.from.id.toString();
        await ctx.reply("👇", await getMainKeyboard(userId));
    });

    // MY ORDERS
    bot.hears("📦 My Orders", (ctx) => {
        ctx.session.clear();
        const userId = ctx.from.id.toString();
        const userOrders = ordersQuery.getUserOrders(userId, 10);

        if (!userOrders.length) {
            return ctx.replyWithHTML(
                "📦 <b>No orders yet</b>\n\n" +
                    "Start shopping and your orders will appear here!",
            );
        }

        let text = "📦 <b>Your Orders:</b>\n\n";

        const buttons = [];

        userOrders.forEach((order) => {
            const statusLabel =
                ORDER_STATUS_LABELS[order.status] || order.status;
            text += `<b>Order #${order.id}</b> — ${statusLabel}\n`;
            text += `💰 ${formatPrice(order.total)} • ${order.item_count} item${order.item_count !== 1 ? "s" : ""}\n`;
            text += `📅 ${new Date(order.created_at).toLocaleDateString()}\n\n`;

            buttons.push([
                Markup.button.callback(
                    `📋 Order #${order.id} Details`,
                    `order_view:${order.id}`,
                ),
            ]);
        });

        ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
    });

    // VIEW ORDER DETAILS
    bot.action(/^order_view:(\d+)$/, (ctx) => {
        const orderId = parseInt(ctx.match[1]);
        const order = ordersQuery.getWithItems(orderId);

        if (!order) {
            return ctx.answerCbQuery("Order not found");
        }

        // Verify this order belongs to the user (or user is admin)
        const isOwner = ctx.from.id.toString() === config.bot.ownerId;
        if (order.user_id !== ctx.from.id.toString() && !isOwner) {
            return ctx.answerCbQuery("Order not found");
        }

        const text = formatOrderSummary(order, order.items);

        ctx.answerCbQuery();
        ctx.replyWithHTML(text);
    });

    // OWNER: ACCEPT ORDER
    bot.action(/^order_accept:(\d+)$/, async (ctx) => {
        if (ctx.from.id.toString() !== config.bot.ownerId) return;

        const orderId = parseInt(ctx.match[1]);

        try {
            const result = ordersQuery.updateStatus(orderId, "confirmed");

            if (!result.changed) {
                return ctx.answerCbQuery("Order already confirmed");
            }

            ctx.answerCbQuery("✅ Order confirmed");

            // Update owner's message
            const order = ordersQuery.getById(orderId);
            try {
                await ctx.editMessageText(
                    ctx.callbackQuery.message.text + "\n\n✅ <b>CONFIRMED</b>",
                    {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            [
                                Markup.button.callback(
                                    "🚚 Mark Shipped",
                                    `order_ship:${orderId}`,
                                ),
                            ],
                            [
                                Markup.button.callback(
                                    "❌ Cancel Order",
                                    `order_cancel:${orderId}`,
                                ),
                            ],
                        ]),
                    },
                );
            } catch {}

            // Notify customer
            try {
                await ctx.telegram.sendMessage(
                    order.user_id,
                    `✅ Great news! Your <b>Order #${orderId}</b> has been confirmed!\n\n` +
                        `We'll prepare it for delivery. 🚚`,
                    { parse_mode: "HTML" },
                );
            } catch (err) {
                console.error("Failed to notify customer:", err.message);
            }
        } catch (error) {
            console.error("Accept order failed:", error);
            ctx.answerCbQuery("❌ Failed to confirm order");
        }
    });

    // OWNER: REJECT/ CANCEL ORDER
    bot.action(/^order_reject:(\d+)$/, async (ctx) => {
        if (ctx.from.id.toString() !== config.bot.ownerId) return;
        await cancelOrder(ctx, parseInt(ctx.match[1]), "rejected");
    });

    bot.action(/^order_cancel:(\d+)$/, async (ctx) => {
        if (ctx.from.id.toString() !== config.bot.ownerId) return;
        await cancelOrder(ctx, parseInt(ctx.match[1]), "cancelled");
    });

    // OWNER: MARK SHIPPED
    bot.action(/^order_ship:(\d+)$/, async (ctx) => {
        if (ctx.from.id.toString() !== config.bot.ownerId) return;

        const orderId = parseInt(ctx.match[1]);

        try {
            ordersQuery.updateStatus(orderId, "shipped");
            ctx.answerCbQuery("🚚 Marked as shipped");

            const order = ordersQuery.getById(orderId);

            try {
                await ctx.editMessageText(
                    ctx.callbackQuery.message.text + "\n\n🚚 <b>SHIPPED</b>",
                    {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            [
                                Markup.button.callback(
                                    "📦 Mark Delivered",
                                    `order_deliver:${orderId}`,
                                ),
                            ],
                        ]),
                    },
                );
            } catch {}

            // Notify customer
            try {
                await ctx.telegram.sendMessage(
                    order.user_id,
                    `🚚 Your <b>Order #${orderId}</b> has been shipped!\n\nIt should arrive soon. 📦`,
                    { parse_mode: "HTML" },
                );
            } catch {}
        } catch (error) {
            console.error("Ship order failed:", error);
            ctx.answerCbQuery("❌ Failed");
        }
    });

    // OWNER: MARK DELIVERED
    bot.action(/^order_deliver:(\d+)$/, async (ctx) => {
        if (ctx.from.id.toString() !== config.bot.ownerId) return;

        const orderId = parseInt(ctx.match[1]);

        try {
            ordersQuery.updateStatus(orderId, "delivered");
            ctx.answerCbQuery("📦 Marked as delivered");

            const order = ordersQuery.getById(orderId);

            try {
                await ctx.editMessageText(
                    ctx.callbackQuery.message.text + "\n\n📦 <b>DELIVERED</b>",
                    { parse_mode: "HTML" },
                );
            } catch {}

            // Notify customer
            try {
                await ctx.telegram.sendMessage(
                    order.user_id,
                    `📦 Your <b>Order #${orderId}</b> has been delivered!\n\n` +
                        `Thank you for shopping with us! 🙏`,
                    { parse_mode: "HTML" },
                );
            } catch {}
        } catch (error) {
            console.error("Deliver order failed:", error);
            ctx.answerCbQuery("❌ Failed");
        }
    });
};

const cancelOrder = async (ctx, orderId, status) => {
    try {
        const result = ordersQuery.updateStatus(orderId, "cancelled");
        const order = ordersQuery.getById(orderId);

        ctx.answerCbQuery("❌ Order cancelled");

        try {
            await ctx.editMessageText(
                ctx.callbackQuery.message.text + `\n\n❌ <b>CANCELLED</b>`,
                { parse_mode: "HTML" },
            );
        } catch {}

        // Notify customer
        try {
            const reasonText =
                status === "rejected"
                    ? "Unfortunately, the shop was unable to fulfill your order."
                    : "Your order has been cancelled.";

            await ctx.telegram.sendMessage(
                order.user_id,
                `❌ <b>Order #${orderId}</b> — Cancelled\n\n${reasonText}\n\n` +
                    `If you have questions, contact us via ❓ FAQ.`,
                { parse_mode: "HTML" },
            );
        } catch {}
    } catch (error) {
        console.error("Cancel order failed:", error);
        ctx.answerCbQuery("❌ Failed to cancel");
    }
};

const notifyOwner = async (ctx, orderId) => {
    const order = ordersQuery.getWithItems(orderId);
    if (!order) return;

    const text = formatOrderNotification(order, order.items);

    try {
        await ctx.telegram.sendMessage(config.bot.ownerId, text, {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        "✅ Accept",
                        `order_accept:${orderId}`,
                    ),
                ],
                [
                    Markup.button.callback(
                        "❌ Reject",
                        `order_reject:${orderId}`,
                    ),
                ],
            ]),
        });
    } catch (error) {
        console.error("Failed to notify owner:", error.message);
    }
};

module.exports = { registerOrderHandlers };
