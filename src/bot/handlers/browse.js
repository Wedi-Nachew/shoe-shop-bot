const { Markup } = require("telegraf");
const brandsQuery = require("../../db/queries/brands");
const productsQuery = require("../../db/queries/products");
const { config } = require("../../config");
const {
    buildBrandButtons,
    buildFilterButtons,
    buildProductActionButtons,
    buildSizePickerButtons,
    buildCarouselButtons,
} = require("../keyboards/inline");
const { formatProductCaption, escapeHtml } = require("../../utils/formmaters");
const { decodeFilters, encodeFilters } = require("../../utils/pagination");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PHOTO_FLOW_DELAY_MS = {
    afterDelete: 450,
    afterGallery: 1200,
};

const registerBrowseHandlers = (bot) => {
    // Brand List
    bot.hears("👟 Brands", (ctx) => {
        ctx.session.clear();

        const brands = brandsQuery.getAll();

        if (!brands.length) {
            return ctx.reply(
                "😔 No products available right now. Check back later!",
            );
        }

        const buttons = buildBrandButtons(brands);
        ctx.reply("👟 Choose a brand:", Markup.inlineKeyboard(buttons));
    });

    // Admin "Browse Shop" button
    bot.hears("👟 Browse Shop", (ctx) => {
        ctx.session.clear();

        const brands = brandsQuery.getAll();

        if (!brands.length) {
            return ctx.reply("😔 No products available right now.");
        }

        const buttons = buildBrandButtons(brands);
        ctx.reply("👟 Choose a brand:", Markup.inlineKeyboard(buttons));
    });

    // Brand Selected -> Show Filters
    bot.action(/^brand:(\d+)$/, async (ctx) => {
        const brandId = parseInt(ctx.match[1]);
        await showBrandFilters(ctx, brandId, {});
        ctx.answerCbQuery();
    });

    // Filter Toggled
    bot.action(/^fl:(.+)$/, async (ctx) => {
        const filters = decodeFilters(ctx.match[1]);

        if (!filters.brandId) {
            return ctx.answerCbQuery("Invalid filter");
        }

        await showBrandFilters(ctx, filters.brandId, filters);
        ctx.answerCbQuery();
    });

    // "Show Products" button → show first product as carousel
    bot.action(/^pg:(.+):(\d+)$/, async (ctx) => {
        const filterStr = ctx.match[1];
        const index = parseInt(ctx.match[2]);
        const filters = decodeFilters(filterStr);

        if (!filters.brandId) {
            return ctx.answerCbQuery("Invalid page");
        }

        // Edit the existing filters message into the first product card
        // to avoid creating extra chat messages.
        await showProductCarousel(ctx, filters, index, false);
        ctx.answerCbQuery();
    });

    // "Show All" button → send all products as individual cards
    bot.action(/^showall:(.+)$/, async (ctx) => {
        const filterStr = ctx.match[1];
        const filters = decodeFilters(filterStr);

        if (!filters.brandId) {
            return ctx.answerCbQuery("Invalid");
        }

        const total = productsQuery.countByFilters(filters);
        if (total === 0) {
            return ctx.answerCbQuery("No products found");
        }

        ctx.answerCbQuery(`Sending ${total} products...`);

        const products = productsQuery.findByFilters(filters, total, 0);
        for (const product of products) {
            await sendProductCard(ctx, product);
        }
    });

    // Carousel navigation: prev/next
    bot.action(/^nav:(.+):(\d+)$/, async (ctx) => {
        const filterStr = ctx.match[1];
        const index = parseInt(ctx.match[2]);
        const filters = decodeFilters(filterStr);

        if (!filters.brandId) {
            return ctx.answerCbQuery("Invalid");
        }

        await showProductCarousel(ctx, filters, index, false);
        ctx.answerCbQuery();
    });

    // New Drops — also show as carousel
    bot.hears("🆕 New Drops", async (ctx) => {
        ctx.session.clear();

        const total = productsQuery.countLatest();

        if (!total) {
            return ctx.reply(
                "😔 No new products available right now. Check back later!",
            );
        }

        // Show first latest product as a card
        await showLatestCarousel(ctx, 0, true);
    });

    // Latest carousel navigation
    bot.action(/^navl:(\d+)$/, async (ctx) => {
        const index = parseInt(ctx.match[1]);
        await showLatestCarousel(ctx, index, false);
        ctx.answerCbQuery();
    });

    // SIZE PICKER — Add to Cart flow
    bot.action(/^product_sizes:(\d+)$/, async (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const sizes = productsQuery.getAvailableSizes(productId);

        if (!sizes.length) {
            return ctx.answerCbQuery("❌ This product is out of stock");
        }

        const buttons = buildSizePickerButtons(productId, sizes, "pick");

        ctx.answerCbQuery();
        try {
            await ctx.editMessageReplyMarkup(
                Markup.inlineKeyboard(buttons).reply_markup,
            );
        } catch {
            await ctx.reply(
                "📏 Select your size:",
                Markup.inlineKeyboard(buttons),
            );
        }
    });

    // SIZE PICKER — Buy Now flow
    bot.action(/^product_buy:(\d+)$/, async (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const sizes = productsQuery.getAvailableSizes(productId);

        if (!sizes.length) {
            return ctx.answerCbQuery("❌ This product is out of stock");
        }

        const buttons = buildSizePickerButtons(productId, sizes, "buy");

        ctx.answerCbQuery();
        try {
            await ctx.editMessageReplyMarkup(
                Markup.inlineKeyboard(buttons).reply_markup,
            );
        } catch {
            await ctx.reply(
                "📏 Select your size to order:",
                Markup.inlineKeyboard(buttons),
            );
        }
    });

    // BACK to product action buttons (from size picker)
    bot.action(/^product_back:(\d+)$/, async (ctx) => {
        const productId = parseInt(ctx.match[1]);
        const sizes = productsQuery.getAvailableSizes(productId);
        const hasMultipleImages =
            productsQuery
                .getImages(productId)
                .filter((img) => img?.telegram_file_id).length > 1;
        const buttons = buildProductActionButtons(
            productId,
            sizes.length > 0,
            hasMultipleImages,
        );

        ctx.answerCbQuery();
        try {
            await ctx.editMessageReplyMarkup(
                Markup.inlineKeyboard(buttons).reply_markup,
            );
        } catch {}
    });

    // Show all photos for a product as media group
    bot.action(/^product_photos:(\d+)$/, async (ctx) => {
        const productId = parseInt(ctx.match[1]);

        if (!productId) {
            return ctx.answerCbQuery("Invalid product");
        }

        const images = productsQuery
            .getImages(productId)
            .filter((img) => img?.telegram_file_id);

        const product = productsQuery.findById(productId);
        if (!product) {
            return ctx.answerCbQuery("Product not found");
        }

        if (images.length <= 1) {
            return ctx.answerCbQuery("No more photos available");
        }

        const carouselContext = getCarouselContextFromMessage(
            ctx.callbackQuery?.message,
        );
        const latestCarouselContext = getLatestCarouselContextFromMessage(
            ctx.callbackQuery?.message,
        );

        try {
            await ctx.answerCbQuery("Opening photos...");

            const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
            const messageId = ctx.callbackQuery?.message?.message_id;

            let statusMessageId = null;

            if (chatId && messageId) {
                try {
                    await ctx.telegram.deleteMessage(chatId, messageId);
                } catch (err) {
                    console.error("Product card delete failed:", err.message);
                }
            }

            if (chatId) {
                try {
                    const statusMessage = await ctx.telegram.sendMessage(
                        chatId,
                        `🖼️ Sending ${Math.min(images.length, 10)} photos...`,
                    );
                    statusMessageId = statusMessage.message_id;
                } catch (err) {
                    console.error("Photo status message failed:", err.message);
                }
            }

            await wait(PHOTO_FLOW_DELAY_MS.afterDelete);

            const galleryImages = images.slice(0, 10);
            const media = galleryImages.map((img, idx) => {
                if (idx === 0) {
                    return {
                        type: "photo",
                        media: img.telegram_file_id,
                        caption:
                            `🖼️ <b>${escapeHtml(product.name)}</b>\n` +
                            `Showing ${galleryImages.length} photo${galleryImages.length !== 1 ? "s" : ""}`,
                        parse_mode: "HTML",
                    };
                }

                return {
                    type: "photo",
                    media: img.telegram_file_id,
                };
            });

            await ctx.replyWithMediaGroup(media);

            if (chatId && statusMessageId) {
                try {
                    await ctx.telegram.deleteMessage(chatId, statusMessageId);
                } catch (err) {
                    console.error("Photo status delete failed:", err.message);
                }
            }

            await wait(PHOTO_FLOW_DELAY_MS.afterGallery);

            if (carouselContext) {
                const filters = decodeFilters(carouselContext.filterStr);
                await showProductCarousel(
                    ctx,
                    filters,
                    carouselContext.index,
                    true,
                );
                return;
            }

            if (latestCarouselContext) {
                await showLatestCarousel(
                    ctx,
                    latestCarouselContext.index,
                    true,
                );
                return;
            }

            await sendProductCard(ctx, product);
        } catch (err) {
            console.error("Product gallery send failed:", err.message);
        }
    });

    // IGNORE: noop
    bot.action("noop", (ctx) => ctx.answerCbQuery());
};

// ===== CAROUSEL — show single product with navigation =====

const showProductCarousel = async (ctx, filters, index, isFirstSend) => {
    const filterStr = encodeFilters(filters);
    const total = productsQuery.countByFilters(filters);

    if (total === 0) {
        return ctx.answerCbQuery("No products found");
    }

    // Clamp index
    if (index < 0) index = 0;
    if (index >= total) index = total - 1;

    // Get single product at offset
    const products = productsQuery.findByFilters(filters, 1, index);
    if (!products.length) {
        return ctx.answerCbQuery("Product not found");
    }

    const product = products[0];
    const sizes = productsQuery.getAvailableSizes(product.id);
    const images = productsQuery
        .getImages(product.id)
        .filter((img) => img?.telegram_file_id);
    const image = images[0] || productsQuery.getImage(product.id);
    const caption = formatProductCaption(product, sizes);
    const buttons = buildCarouselButtons(
        product.id,
        sizes.length > 0,
        images.length > 1,
        filterStr,
        index,
        total,
    );

    if (isFirstSend) {
        // First time — send a new message
        if (image?.telegram_file_id) {
            try {
                await ctx.replyWithPhoto(image.telegram_file_id, {
                    caption,
                    parse_mode: "HTML",
                    ...Markup.inlineKeyboard(buttons),
                });
                return;
            } catch (err) {
                console.error("Photo send failed:", err.message);
            }
        }
        // Text-only fallback
        await ctx.replyWithHTML(caption, Markup.inlineKeyboard(buttons));
    } else {
        // Navigation — edit existing message in place
        if (image?.telegram_file_id) {
            try {
                await ctx.editMessageMedia(
                    {
                        type: "photo",
                        media: image.telegram_file_id,
                        caption,
                        parse_mode: "HTML",
                    },
                    Markup.inlineKeyboard(buttons),
                );
                return;
            } catch (err) {
                console.error("Edit media failed:", err.message);
                // Fallback: try editing as text
            }
        }

        // Text-only edit
        try {
            await ctx.editMessageText(caption, {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard(buttons),
            });
        } catch (err) {
            // If edit fails (e.g. switching from photo to text), send new
            console.error("Edit text failed:", err.message);
            await ctx.replyWithHTML(caption, Markup.inlineKeyboard(buttons));
        }
    }
};

// ===== LATEST DROPS CAROUSEL =====

const showLatestCarousel = async (ctx, index, isFirstSend) => {
    const total = productsQuery.countLatest();

    if (!total) {
        return ctx.reply("😔 No new products right now.");
    }

    if (index < 0) index = 0;
    if (index >= total) index = total - 1;

    const products = productsQuery.getLatest(1, index);
    if (!products.length) return;

    const product = products[0];
    const sizes = productsQuery.getAvailableSizes(product.id);
    const images = productsQuery
        .getImages(product.id)
        .filter((img) => img?.telegram_file_id);
    const image = images[0] || productsQuery.getImage(product.id);
    const caption =
        `🆕 <b>New Drop</b>\n\n` + formatProductCaption(product, sizes);

    // Build buttons — action + nav + no "back to filters"
    const buttons = buildProductActionButtons(
        product.id,
        sizes.length > 0,
        images.length > 1,
    );

    // Navigation
    if (total > 1) {
        const navRow = [];
        if (index > 0) {
            navRow.push(Markup.button.callback("⬅️ Prev", `navl:${index - 1}`));
        }
        navRow.push(Markup.button.callback(`${index + 1} / ${total}`, "noop"));
        if (index < total - 1) {
            navRow.push(Markup.button.callback("Next ➡️", `navl:${index + 1}`));
        }
        buttons.push(navRow);
    }

    if (isFirstSend) {
        if (image?.telegram_file_id) {
            try {
                await ctx.replyWithPhoto(image.telegram_file_id, {
                    caption,
                    parse_mode: "HTML",
                    ...Markup.inlineKeyboard(buttons),
                });
                return;
            } catch (err) {
                console.error("Photo send failed:", err.message);
            }
        }
        await ctx.replyWithHTML(caption, Markup.inlineKeyboard(buttons));
    } else {
        if (image?.telegram_file_id) {
            try {
                await ctx.editMessageMedia(
                    {
                        type: "photo",
                        media: image.telegram_file_id,
                        caption,
                        parse_mode: "HTML",
                    },
                    Markup.inlineKeyboard(buttons),
                );
                return;
            } catch (err) {
                console.error("Edit media failed:", err.message);
            }
        }

        try {
            await ctx.editMessageText(caption, {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard(buttons),
            });
        } catch {
            await ctx.replyWithHTML(caption, Markup.inlineKeyboard(buttons));
        }
    }
};

// ===== Send standalone product card (for search, deep links) =====

const sendProductCard = async (ctx, product) => {
    const sizes = productsQuery.getAvailableSizes(product.id);
    const images = productsQuery
        .getImages(product.id)
        .filter((img) => img?.telegram_file_id);
    const caption = formatProductCaption(product, sizes);
    const buttons = buildProductActionButtons(
        product.id,
        sizes.length > 0,
        images.length > 1,
    );

    const image = images[0] || productsQuery.getImage(product.id);

    if (image?.telegram_file_id) {
        try {
            await ctx.replyWithPhoto(image.telegram_file_id, {
                caption,
                parse_mode: "HTML",
                ...Markup.inlineKeyboard(buttons),
            });
            return;
        } catch (err) {
            console.error("Photo send failed:", err.message);
        }
    }

    await ctx.replyWithHTML(caption, Markup.inlineKeyboard(buttons));
};

// ===== Show brand filters =====

const showBrandFilters = async (ctx, brandId, filters = {}) => {
    const brand = brandsQuery.getById(brandId);
    if (!brand) return;

    const models = brandsQuery.getModels(brandId);
    const sizes = brandsQuery.getAvailableSizes(brandId, filters.modelId);

    const totalProducts = productsQuery.countByFilters({
        brandId,
        modelId: filters.modelId,
        size: filters.size,
    });

    let headerParts = [`${brand.emoji || "👟"} <b>${brand.name}</b>`];

    if (filters.modelId) {
        const model = models.find((m) => m.id === filters.modelId);
        if (model) headerParts.push(model.name);
    }

    if (filters.size) {
        headerParts.push(`Size ${filters.size}`);
    }

    let header = headerParts.join(" — ");
    header += `\n📦 ${totalProducts} product${totalProducts !== 1 ? "s" : ""} found`;

    if (models.length > 0 || sizes.length > 0) {
        header += "\n\n👇 Tap to filter:";
    }

    const filterButtons = buildFilterButtons(brandId, models, sizes, filters);

    // "Show Products" + "Show All" buttons
    if (totalProducts > 0) {
        const filterStr = encodeFilters({
            brandId,
            modelId: filters.modelId || 0,
            size: filters.size || 0,
        });
        filterButtons.push([
            Markup.button.callback(`👟 Browse (1 by 1)`, `pg:${filterStr}:0`),
            Markup.button.callback(`📋 Show All`, `showall:${filterStr}`),
        ]);
    }

    filterButtons.push([
        Markup.button.callback("◀️ Back to Brands", "back_brands"),
    ]);

    const extra = {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(filterButtons),
    };

    const message = ctx.callbackQuery?.message;
    const isMediaMessage = Boolean(
        message?.photo ||
        message?.video ||
        message?.animation ||
        message?.document,
    );

    // For product photo cards, replace the media message entirely so
    // filters are shown as clean text without the previous product image.
    if (isMediaMessage) {
        const chatId = message?.chat?.id;
        const messageId = message?.message_id;

        if (chatId && messageId) {
            try {
                await ctx.telegram.deleteMessage(chatId, messageId);
            } catch (err) {
                console.error("Failed to delete media message:", err.message);
            }
        }

        await ctx.replyWithHTML(header, Markup.inlineKeyboard(filterButtons));
        return;
    }

    try {
        await ctx.editMessageText(header, extra);
    } catch {
        await ctx.replyWithHTML(header, Markup.inlineKeyboard(filterButtons));
    }
};

const getCarouselContextFromMessage = (message) => {
    const keyboard = message?.reply_markup?.inline_keyboard;
    if (!Array.isArray(keyboard)) return null;

    const buttons = keyboard.flat().filter(Boolean);

    const backToFilterButton = buttons.find(
        (btn) =>
            typeof btn?.callback_data === "string" &&
            btn.callback_data.startsWith("fl:"),
    );

    if (!backToFilterButton) return null;

    const counterButton = buttons.find(
        (btn) =>
            typeof btn?.text === "string" && /^\d+\s*\/\s*\d+$/.test(btn.text),
    );

    if (!counterButton) return null;

    const currentIndex =
        parseInt(counterButton.text.split("/")[0].trim(), 10) - 1;
    if (Number.isNaN(currentIndex) || currentIndex < 0) return null;

    return {
        filterStr: backToFilterButton.callback_data.replace(/^fl:/, ""),
        index: currentIndex,
    };
};

const getLatestCarouselContextFromMessage = (message) => {
    const keyboard = message?.reply_markup?.inline_keyboard;
    if (!Array.isArray(keyboard)) return null;

    const buttons = keyboard.flat().filter(Boolean);

    const latestNavButton = buttons.find(
        (btn) =>
            typeof btn?.callback_data === "string" &&
            btn.callback_data.startsWith("navl:"),
    );

    if (!latestNavButton) return null;

    const counterButton = buttons.find(
        (btn) =>
            typeof btn?.text === "string" && /^\d+\s*\/\s*\d+$/.test(btn.text),
    );

    if (!counterButton) return null;

    const currentIndex =
        parseInt(counterButton.text.split("/")[0].trim(), 10) - 1;
    if (Number.isNaN(currentIndex) || currentIndex < 0) return null;

    return { index: currentIndex };
};

const registerBackHandler = (bot) => {
    bot.action("back_brands", async (ctx) => {
        const brands = brandsQuery.getAll();

        if (!brands.length) {
            return ctx.answerCbQuery("No brands available");
        }

        const buttons = buildBrandButtons(brands);
        const message = ctx.callbackQuery?.message;
        const isMediaMessage = Boolean(
            message?.photo ||
            message?.video ||
            message?.animation ||
            message?.document,
        );

        if (isMediaMessage) {
            const chatId = message?.chat?.id;
            const messageId = message?.message_id;

            if (chatId && messageId) {
                try {
                    await ctx.telegram.deleteMessage(chatId, messageId);
                } catch (err) {
                    console.error(
                        "Failed to delete media message:",
                        err.message,
                    );
                }
            }

            await ctx.reply(
                "👟 Choose a brand:",
                Markup.inlineKeyboard(buttons),
            );
            await ctx.answerCbQuery();
            return;
        }

        try {
            await ctx.editMessageText(
                "👟 Choose a brand:",
                Markup.inlineKeyboard(buttons),
            );
        } catch {
            await ctx.reply(
                "👟 Choose a brand:",
                Markup.inlineKeyboard(buttons),
            );
        }

        await ctx.answerCbQuery();
    });
};

module.exports = {
    registerBrowseHandlers,
    registerBackHandler,
    sendProductCard,
};
