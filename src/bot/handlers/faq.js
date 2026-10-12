const { Markup } = require("telegraf");
const faqData = require("../../config/faq-data");
const { config } = require("../../config");
const { escapeHtml } = require("../../utils/formmaters");

const registerFaqHandlers = (bot) => {
    // FAQ MENU
    bot.hears("❓ FAQ", (ctx) => {
        ctx.session.clear();
        showFaqMenu(ctx);
    });

    // FAQ ITEM
    bot.action(/^faq:(.+)$/, (ctx) => {
        const key = ctx.match[1];
        const faq = faqData[key];

        if (!faq) return ctx.answerCbQuery("Not found");

        ctx.answerCbQuery();

        try {
            ctx.editMessageText(faq.answer, {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("◀️ Back to FAQ", "faq_back")],
                ]),
            });
        } catch {
            ctx.replyWithHTML(
                faq.answer,
                Markup.inlineKeyboard([
                    [Markup.button.callback("◀️ Back to FAQ", "faq_back")],
                ]),
            );
        }
    });

    // BACK TO FAQ
    bot.action("faq_back", (ctx) => {
        ctx.answerCbQuery();
        showFaqMenu(ctx, true);
    });

    // CONATCT
    bot.action("contact", (ctx) => {
        ctx.answerCbQuery();

        const shopName = escapeHtml(config.shop.name);

        let text = `📞 <b>Contact ${shopName}</b>\n\n`;
        if (config.shop.phone) text += `📱 Phone: ${config.shop.phone}\n`;
        if (config.shop.telegram)
            text += `✈️ Telegram: ${config.shop.telegram}\n`;
        if (config.shop.location)
            text += `📍 Location: ${config.shop.location}\n`;
        text += `\nWe respond within 1 hour during business hours (9 AM - 8 PM).`;

        try {
            ctx.editMessageText(text, {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("◀️ Back to FAQ", "faq_back")],
                ]),
            });
        } catch {
            ctx.replyWithHTML(text);
        }
    });
};

const showFaqMenu = (ctx, edit = false) => {
    const buttons = Object.entries(faqData).map(([key, data]) => [
        Markup.button.callback(`${data.emoji} ${data.question}`, `faq:${key}`),
    ]);

    buttons.push([Markup.button.callback("📞 Contact Us", "contact")]);

    const text = "❓ <b>Frequently Asked Questions</b>\n\nTap a question:";
    const opts = {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
    };

    if (edit) {
        try {
            return ctx.editMessageText(text, opts);
        } catch {}
    }

    ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
};

module.exports = { registerFaqHandlers };
