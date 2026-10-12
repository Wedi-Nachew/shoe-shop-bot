const { Markup } = require("telegraf");
const { ownerOnly } = require("../middleware/auth");
const productsQuery = require("../../db/queries/products");
const ordersQuery = require("../../db/queries/orders");
const brandsQuery = require("../../db/queries/brands");
const statsQuery = require("../../db/queries/stats");
const sessionsQuery = require("../../db/queries/sessions");
const {
    formatPrice,
    formatDate,
    escapeHtml,
} = require("../../utils/formmaters");
const { config } = require("../../config");

const FORWARD_DRAFT_STATE = "admin_forward_draft";
const FORWARD_EDIT_STATE = "admin_forward_edit";
const FORWARD_GROUP_WAIT_MS = 900;
const FORWARD_MAX_IMAGES = 4;
const DEFAULT_FORWARD_SIZES = ["40", "41", "42", "43"];
const DEFAULT_FORWARD_STOCK = 3;

const forwardedMediaBuffer = new Map();

const registerAdminHandlers = (bot) => {
    // ===== BUTTON HANDLERS (admin keyboard) =====

    // ⏳ Pending button
    bot.hears("⏳ Pending", ownerOnly, (ctx) => {
        showPendingOrders(ctx);
    });

    // 📊 Sales button
    bot.hears("📊 Sales", ownerOnly, (ctx) => {
        showSalesReport(ctx);
    });

    // ⚠️ Low Stock button
    bot.hears("⚠️ Low Stock", ownerOnly, (ctx) => {
        showLowStock(ctx);
    });

    // ➕ Add Product button
    bot.hears("➕ Add Product", ownerOnly, (ctx) => {
        startAddProduct(ctx);
    });

    // ===== SLASH COMMANDS (legacy) =====

    bot.command("add", ownerOnly, (ctx) => {
        startAddProduct(ctx);
    });

    bot.command("sales", ownerOnly, (ctx) => {
        showSalesReport(ctx);
    });

    bot.command("pending", ownerOnly, (ctx) => {
        showPendingOrders(ctx);
    });

    bot.command("lowstock", ownerOnly, (ctx) => {
        showLowStock(ctx);
    });

    // /stock [id] - Toggle stock status
    bot.command("stock", ownerOnly, (ctx) => {
        const args = ctx.message.text.split(" ");

        if (args.length < 2) {
            return ctx.reply("Usage: /stock [product_id]");
        }

        const productId = parseInt(args[1]);
        const product = productsQuery.findById(productId);

        if (!product) {
            return ctx.reply(`❌ Product #${productId} not found`);
        }

        productsQuery.toggleStock(productId);
        const updated = productsQuery.findById(productId);

        ctx.replyWithHTML(
            `${updated.in_stock ? "✅" : "❌"} <b>${product.name}</b> — ` +
                `${updated.in_stock ? "Now visible" : "Now hidden"}`,
        );
    });

    // /restock [id] [size] [quantity] - Restock a product
    bot.command("restock", ownerOnly, (ctx) => {
        const args = ctx.message.text.split(" ");

        if (args.length < 4) {
            return ctx.replyWithHTML(
                "Usage: <code>/restock [product_id] [size] [quantity]</code>\n\n" +
                    "Example: <code>/restock 5 42 10</code>",
            );
        }

        const productId = parseInt(args[1]);
        const size = args[2];
        const quantity = parseInt(args[3]);

        if (!productId || !size || !quantity || quantity < 1) {
            return ctx.reply("❌ Invalid arguments.");
        }

        const product = productsQuery.findById(productId);
        if (!product) {
            return ctx.reply(`❌ Product #${productId} not found`);
        }

        const stockBefore = productsQuery.getSizeStock(productId, size);
        productsQuery.incrementSizeStock(productId, size, quantity);
        const stockAfter = productsQuery.getSizeStock(productId, size);

        ctx.replyWithHTML(
            `📦 <b>Restocked!</b>\n\n` +
                `${product.name} — Size ${size}\n` +
                `Stock: ${stockBefore} → <b>${stockAfter}</b> (+${quantity})`,
        );
    });

    // /share [id] - Generate deep link for channel posting
    bot.command("share", ownerOnly, (ctx) => {
        const args = ctx.message.text.split(" ");

        if (args.length < 2) {
            return ctx.replyWithHTML(
                "Usage: <code>/share [product_id]</code>\n\n" +
                    "Generates a link you can share to your Telegram channel.",
            );
        }

        const productId = parseInt(args[1]);
        const product = productsQuery.findById(productId);

        if (!product) {
            return ctx.reply(`❌ Product #${productId} not found`);
        }

        const botUsername = ctx.botInfo.username;
        const deepLink = `https://t.me/${botUsername}?start=product_${productId}`;

        let shareText = `👟 <b>${product.name}</b>\n`;
        if (product.colorway) shareText += `🎨 ${product.colorway}\n`;
        shareText += `💰 ${formatPrice(product.price)}\n\n`;
        shareText += `🛒 Order now: ${deepLink}`;

        ctx.replyWithHTML(
            `📤 <b>Share to Channel:</b>\n\n` +
                `Copy this message and post it to your channel:\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                shareText +
                `\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `Direct link: <code>${deepLink}</code>`,
        );
    });

    // /cancel - Cancel current operation
    bot.command("cancel", ownerOnly, (ctx) => {
        clearForwardBuffersForUser(ctx.from.id.toString());
        ctx.session.clear();
        ctx.reply("✅ Operation cancelled.");
    });

    // Confirm forwarded draft save
    bot.action("admin_fwd_save", ownerOnly, async (ctx) => {
        const draft = getForwardDraftFromSession(ctx);

        if (!draft) {
            return ctx.answerCbQuery("No active draft.");
        }

        const missingFields = getMissingForwardDraftFields(draft);
        if (missingFields.length > 0) {
            await ctx.answerCbQuery("Draft is incomplete.");
            await ctx.replyWithHTML(
                `⚠️ Can't save yet. Missing required fields: <b>${escapeHtml(missingFields.join(", "))}</b>\n` +
                    "Tap ✏️ Edit, send missing values, then save again.",
            );
            return;
        }

        try {
            const saveResult = saveForwardDraftToDb(draft);
            ctx.session.clear();

            const botUsername = await getBotUsername(ctx);
            const deepLink = `https://t.me/${botUsername}?start=product_${saveResult.productId}`;

            await ctx.answerCbQuery("Saved");

            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
            } catch {}

            await ctx.replyWithHTML(
                `✅ <b>Product Added From Forwarded Post</b>\n\n` +
                    `🆔 ID: ${saveResult.productId}\n` +
                    `📦 ${escapeHtml(draft.name)}\n` +
                    `🏷 ${escapeHtml(draft.brandName)} → ${escapeHtml(draft.modelName)}\n` +
                    (draft.colorway
                        ? `🎨 ${escapeHtml(draft.colorway)}\n`
                        : "") +
                    `💰 ${formatPrice(draft.price)}\n` +
                    `📏 Sizes: ${escapeHtml(draft.sizes.join(", "))}\n` +
                    `📦 Stock: ${draft.stockPerSize} per size (${saveResult.totalUnits} total units)\n` +
                    `📸 Images saved: ${draft.imageFileIds.length}\n\n` +
                    `📤 Share link: <code>${deepLink}</code>`,
            );
        } catch (error) {
            console.error("Forward draft save failed:", error);
            await ctx.answerCbQuery("Save failed");
            await ctx.reply(`❌ Failed to save draft: ${error.message}`);
        }
    });

    // Start edit mode for forwarded draft
    bot.action("admin_fwd_edit", ownerOnly, async (ctx) => {
        const draft = getForwardDraftFromSession(ctx);

        if (!draft) {
            return ctx.answerCbQuery("No active draft.");
        }

        ctx.session.set(FORWARD_EDIT_STATE, { draft });
        await ctx.answerCbQuery();

        await ctx.replyWithHTML(
            "✏️ <b>Edit Draft</b>\n\n" +
                "Send one or more lines in this format:\n\n" +
                "<code>Name: Adidas Neighborhood Black\n" +
                "Brand: Adidas\n" +
                "Model: Neighborhood\n" +
                "Price: 7500\n" +
                "Sizes: 40,41,42,43\n" +
                "Stock: 3\n" +
                "Colorway: Black/White</code>\n\n" +
                "Tip: A single line without ':' is treated as Name.",
        );
    });

    // Cancel forwarded draft
    bot.action("admin_fwd_cancel", ownerOnly, async (ctx) => {
        clearForwardBuffersForUser(ctx.from.id.toString());
        ctx.session.clear();
        await ctx.answerCbQuery("Draft cancelled");

        try {
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        } catch {}

        await ctx.reply("❌ Draft cancelled. Nothing was saved.");
    });

    // Handle photo for product add
    bot.on("photo", async (ctx, next) => {
        if (!isOwner(ctx)) return next();

        if (isForwardedMessage(ctx.message)) {
            await handleForwardedPhoto(ctx, bot);
            return;
        }

        const state = ctx.session.getState();
        if (state !== "admin_add_photo") return next();

        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileId = photo.file_id;
        const caption = ctx.message.caption;

        if (!caption) {
            ctx.session.set("admin_add_caption", { imageFileId: fileId });
            return ctx.reply(
                "✅ Photo received!\n\nNow send the product details as text in the format shown above.",
            );
        }

        // Parse caption and create product
        await createProductFromText(ctx, caption, fileId);
    });

    // Handle text for product add (if photo was sent without caption)
    bot.on("text", async (ctx, next) => {
        if (!isOwner(ctx)) return next();

        if (isForwardedMessage(ctx.message)) {
            await createAndSendForwardDraft(ctx, ctx.message.text || "", []);
            return;
        }

        const state = ctx.session.getState();

        if (state === FORWARD_EDIT_STATE) {
            const sessionData = ctx.session.getData();
            const draft = sessionData?.draft;

            if (!draft) {
                ctx.session.clear();
                await ctx.reply(
                    "⚠️ Draft session expired. Forward the post again.",
                );
                return;
            }

            const editResult = applyForwardDraftEdits(draft, ctx.message.text);

            if (editResult.errors.length > 0) {
                await ctx.replyWithHTML(
                    "⚠️ Some edits were ignored:\n" +
                        editResult.errors
                            .map((error) => `• ${escapeHtml(error)}`)
                            .join("\n"),
                );
            }

            if (!editResult.updated) {
                await ctx.reply(
                    "No valid edits detected. Send fields like Name:, Brand:, Model:, Price:, Sizes:, Stock:.",
                );
                return;
            }

            ctx.session.set(FORWARD_DRAFT_STATE, { draft: editResult.draft });
            await sendForwardDraftPreview(
                ctx,
                editResult.draft,
                "✅ Draft updated.",
            );
            return;
        }

        if (state === "admin_add_caption") {
            const sessionData = ctx.session.getData();
            await createProductFromText(
                ctx,
                ctx.message.text,
                sessionData.imageFileId,
            );
            return;
        }

        return next();
    });
};

// ===== Helper Functions =====

const startAddProduct = (ctx) => {
    ctx.session.set("admin_add_photo");

    ctx.replyWithHTML(
        "➕ <b>Add New Product</b>\n\n" +
            "📸 Send me a photo of the product with this caption:\n\n" +
            "<code>Product Name\n" +
            "Colorway\n" +
            "Brand: Jordan\n" +
            "Model: Jordan 4\n" +
            "Price: 8500\n" +
            "Sizes: 40-44\n" +
            "Stock: 3</code>\n\n" +
            "• <b>Sizes</b> can be: 40-44 or 40,41,42,43,44\n" +
            "• <b>Stock</b> per size (optional, defaults to 1)\n" +
            "• <b>Model</b> is optional\n\n" +
            "Or send /cancel to cancel.",
    );
};

const showPendingOrders = (ctx) => {
    const pending = ordersQuery.getPending(20);

    if (!pending.length) {
        return ctx.reply("✅ No pending orders!");
    }

    let text = `⏳ <b>${pending.length} Pending Order${pending.length !== 1 ? "s" : ""}:</b>\n\n`;

    pending.forEach((order) => {
        text += `<b>#${order.id}</b> — ${formatPrice(order.total)} (${order.item_count} items)\n`;
        text += `👤 ${order.user_name || "Unknown"} • 📅 ${formatDate(order.created_at)}\n\n`;
    });

    ctx.replyWithHTML(text);
};

const showSalesReport = (ctx) => {
    const sales = statsQuery.getSalesStats(30);
    const inventory = statsQuery.getInventoryStats();
    const stockLevels = statsQuery.getStockLevels();

    let text = "📊 <b>Sales Report (30 Days)</b>\n\n";

    text += `💰 Revenue: <b>${formatPrice(sales.total_revenue)}</b>\n`;
    text += `📦 Orders: ${sales.total_orders}\n`;
    text += `📈 Avg Order: ${formatPrice(sales.avg_order_value)}\n\n`;

    text += `<b>Order Status:</b>\n`;
    text += `⏳ Pending: ${sales.pending}\n`;
    text += `✅ Confirmed: ${sales.confirmed}\n`;
    text += `📦 Delivered: ${sales.delivered}\n`;
    text += `❌ Cancelled: ${sales.cancelled}\n\n`;

    text += `<b>Inventory:</b>\n`;
    text += `👟 Products: ${inventory.total_products} (${inventory.active_products} active)\n`;
    text += `📦 Total Units: ${stockLevels.total_units}\n`;
    text += `📏 Sizes in Stock: ${stockLevels.sizes_in_stock}\n`;
    text += `🚫 Sizes Out: ${stockLevels.sizes_out_of_stock}\n`;

    ctx.replyWithHTML(text);
};

const showLowStock = (ctx) => {
    const lowItems = statsQuery.getLowStock(3);

    if (!lowItems.length) {
        return ctx.reply("✅ No low stock items!");
    }

    let text = `⚠️ <b>Low Stock Alert (≤3 units):</b>\n\n`;

    lowItems.forEach((item) => {
        text += `• ${item.brand_name} ${item.name}`;
        if (item.colorway) text += ` (${item.colorway})`;
        text += `\n  Size ${item.size}: <b>${item.in_stock}</b> left\n`;
    });

    text += `\nRestock with: <code>/restock [id] [size] [qty]</code>`;

    ctx.replyWithHTML(text);
};

const isOwner = (ctx) => {
    return ctx.from.id.toString() === config.bot.ownerId;
};

const isForwardedMessage = (message) => {
    return Boolean(
        message?.forward_origin ||
        message?.forward_from ||
        message?.forward_from_chat ||
        message?.forward_sender_name ||
        message?.forward_date,
    );
};

const handleForwardedPhoto = async (ctx, bot) => {
    const photo = ctx.message.photo?.[ctx.message.photo.length - 1];
    if (!photo) return;

    const fileId = photo.file_id;
    const mediaGroupId = ctx.message.media_group_id;
    const caption = (ctx.message.caption || "").trim();

    if (!mediaGroupId) {
        await createAndSendForwardDraft(ctx, caption, [fileId]);
        return;
    }

    const userId = ctx.from.id.toString();
    const key = `${userId}:${mediaGroupId}`;

    let entry = forwardedMediaBuffer.get(key);
    if (!entry) {
        entry = {
            chatId: ctx.chat.id,
            userId,
            text: caption,
            fileIds: [],
            timer: null,
        };
        forwardedMediaBuffer.set(key, entry);
    }

    if (caption && !entry.text) {
        entry.text = caption;
    }

    if (!entry.fileIds.includes(fileId)) {
        entry.fileIds.push(fileId);
    }

    if (entry.timer) {
        clearTimeout(entry.timer);
    }

    entry.timer = setTimeout(async () => {
        await flushForwardedMediaGroupDraft(bot, key);
    }, FORWARD_GROUP_WAIT_MS);

    if (entry.fileIds.length === 1) {
        await ctx.reply("📥 Forward detected. Collecting album photos...");
    }
};

const flushForwardedMediaGroupDraft = async (bot, key) => {
    const entry = forwardedMediaBuffer.get(key);
    if (!entry) return;

    forwardedMediaBuffer.delete(key);

    try {
        const draft = createForwardDraft(entry.text, entry.fileIds);
        sessionsQuery.set(entry.userId, FORWARD_DRAFT_STATE, { draft });

        await bot.telegram.sendMessage(
            entry.chatId,
            buildForwardDraftSummary(draft),
            {
                parse_mode: "HTML",
                ...buildForwardDraftKeyboard(),
            },
        );
    } catch (error) {
        console.error("Failed to flush forwarded media group:", error);
        try {
            await bot.telegram.sendMessage(
                entry.chatId,
                "❌ Failed to parse forwarded post. Please forward again.",
            );
        } catch {}
    }
};

const clearForwardBuffersForUser = (userId) => {
    const prefix = `${userId}:`;

    for (const [key, entry] of forwardedMediaBuffer.entries()) {
        if (!key.startsWith(prefix)) continue;

        if (entry?.timer) {
            clearTimeout(entry.timer);
        }
        forwardedMediaBuffer.delete(key);
    }
};

const createAndSendForwardDraft = async (ctx, rawText, imageFileIds) => {
    const draft = createForwardDraft(rawText, imageFileIds);
    ctx.session.set(FORWARD_DRAFT_STATE, { draft });
    await sendForwardDraftPreview(ctx, draft);
};

const sendForwardDraftPreview = async (ctx, draft, prefixText = "") => {
    const text = buildForwardDraftSummary(draft);
    const message = prefixText ? `${prefixText}\n\n${text}` : text;

    await ctx.replyWithHTML(message, buildForwardDraftKeyboard());
};

const buildForwardDraftKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("✅ Save", "admin_fwd_save"),
            Markup.button.callback("✏️ Edit", "admin_fwd_edit"),
        ],
        [Markup.button.callback("❌ Cancel", "admin_fwd_cancel")],
    ]);
};

const buildForwardDraftSummary = (draft) => {
    const missingFields = getMissingForwardDraftFields(draft);

    const nameText = draft.name
        ? `<b>${escapeHtml(draft.name)}</b>`
        : "<i>missing</i>";
    const brandText = draft.brandName
        ? `<b>${escapeHtml(draft.brandName)}</b>`
        : "<i>missing</i>";
    const modelText = draft.modelName
        ? `<b>${escapeHtml(draft.modelName)}</b>`
        : "<i>missing</i>";
    const priceText = draft.price
        ? `<b>${formatPrice(draft.price)}</b>`
        : "<i>missing</i>";
    const sizeText = draft.sizes.length
        ? `<b>${escapeHtml(`${draft.sizes.join(", ")} (${draft.stockPerSize} each)`)}</b>`
        : "<i>missing</i>";

    let text = "🧾 <b>Forwarded Product Draft</b>\n\n";
    text += `📸 Images captured: <b>${draft.imageFileIds.length}</b>`;
    if (draft.truncatedImages) {
        text += ` (keeping first ${FORWARD_MAX_IMAGES})`;
    }
    text += "\n";
    text += `📦 Name: ${nameText}\n`;
    text += `🏷 Brand: ${brandText}\n`;
    text += `🧬 Model: ${modelText}\n`;
    if (draft.colorway) {
        text += `🎨 Colorway: <b>${escapeHtml(draft.colorway)}</b>\n`;
    }
    text += `💰 Price: ${priceText}\n`;
    text += `📏 Sizes: ${sizeText}\n`;

    if (draft.usedDefaultSizes) {
        text += "ℹ️ Applied default sizes: 40, 41, 42, 43\n";
    }

    if (draft.usedDefaultStock) {
        text += "ℹ️ Applied default stock: 3 per size\n";
    }

    if (missingFields.length > 0) {
        text +=
            `\n⚠️ Missing required: <b>${escapeHtml(missingFields.join(", "))}</b>\n` +
            "Save is blocked until these fields are filled via ✏️ Edit.";
    } else {
        text +=
            "\n✅ Required fields are ready. Tap Save to create the product.";
    }

    return text;
};

const getForwardDraftFromSession = (ctx) => {
    const state = ctx.session.getState();
    if (state !== FORWARD_DRAFT_STATE && state !== FORWARD_EDIT_STATE) {
        return null;
    }

    const sessionData = ctx.session.getData();
    return sessionData?.draft || null;
};

const getMissingForwardDraftFields = (draft) => {
    const missing = [];

    if (!draft.name) missing.push("Name");
    if (!draft.brandName) missing.push("Brand");
    if (!draft.modelName) missing.push("Model");
    if (!draft.price || draft.price <= 0) missing.push("Price");

    return missing;
};

const createForwardDraft = (rawText, imageFileIds = []) => {
    const text = (rawText || "").trim();
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const name = extractLabeledValue(lines, /^name\s*[:\-]\s*(.+)$/i);
    let brandName = extractLabeledValue(lines, /^brand\s*[:\-]\s*(.+)$/i);
    let modelName = extractLabeledValue(lines, /^model\s*[:\-]\s*(.+)$/i);
    const colorway = extractLabeledValue(
        lines,
        /^(?:colorway|color)\s*[:\-]\s*(.+)$/i,
    );

    const parsedPrice = parsePriceFromLines(lines);
    const explicitSizes = parseSizesFromLines(lines);
    const parsedStock = parseStockFromLines(lines);

    const inferred = inferBrandAndModel(lines, brandName, modelName);
    brandName = brandName || inferred.brandName;
    modelName = modelName || inferred.modelName;

    const uniqueImageIds = Array.from(
        new Set((imageFileIds || []).filter(Boolean)),
    );
    const truncatedImages = uniqueImageIds.length > FORWARD_MAX_IMAGES;

    const hasExplicitSizes = explicitSizes.length > 0;
    const sizes = hasExplicitSizes ? explicitSizes : [...DEFAULT_FORWARD_SIZES];

    const stockPerSize =
        parsedStock && parsedStock > 0 ? parsedStock : DEFAULT_FORWARD_STOCK;

    return {
        name: name || null,
        brandName: brandName || null,
        modelName: modelName || null,
        colorway: colorway || null,
        price: parsedPrice || null,
        sizes,
        stockPerSize,
        imageFileIds: uniqueImageIds.slice(0, FORWARD_MAX_IMAGES),
        rawText: text,
        usedDefaultSizes: !hasExplicitSizes,
        usedDefaultStock: !parsedStock,
        truncatedImages,
    };
};

const applyForwardDraftEdits = (draft, editText) => {
    const lines = (editText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const nextDraft = {
        ...draft,
        sizes: [...(draft.sizes || [])],
    };

    const errors = [];
    let updated = false;

    if (lines.length === 1 && !lines[0].includes(":")) {
        nextDraft.name = lines[0];
        updated = true;
        return { draft: nextDraft, updated, errors };
    }

    for (const line of lines) {
        if (!line.includes(":")) {
            errors.push(`Ignored line without ':': ${line}`);
            continue;
        }

        const [rawKey, ...valueParts] = line.split(":");
        const key = rawKey.trim().toLowerCase();
        const value = valueParts.join(":").trim();

        if (!value && key !== "colorway" && key !== "color") {
            errors.push(`Missing value for ${rawKey.trim()}.`);
            continue;
        }

        if (key === "name") {
            nextDraft.name = value;
            updated = true;
            continue;
        }

        if (key === "brand") {
            nextDraft.brandName = value;
            updated = true;
            continue;
        }

        if (key === "model") {
            nextDraft.modelName = value;
            updated = true;
            continue;
        }

        if (key === "price") {
            const parsedPrice = parsePriceValue(value);
            if (!parsedPrice) {
                errors.push(
                    "Price must contain a valid number (example: 7500).",
                );
                continue;
            }
            nextDraft.price = parsedPrice;
            updated = true;
            continue;
        }

        if (key === "sizes" || key === "size") {
            const parsedSizes = parseSizesValue(value);
            if (parsedSizes.length === 0) {
                errors.push("Sizes must look like 40-43 or 40,41,42,43.");
                continue;
            }
            nextDraft.sizes = parsedSizes;
            nextDraft.usedDefaultSizes = false;
            updated = true;
            continue;
        }

        if (key === "stock" || key === "qty" || key === "quantity") {
            const parsedStock = parseInt(value, 10);
            if (!parsedStock || parsedStock < 1) {
                errors.push("Stock must be a positive integer.");
                continue;
            }
            nextDraft.stockPerSize = parsedStock;
            nextDraft.usedDefaultStock = false;
            updated = true;
            continue;
        }

        if (key === "colorway" || key === "color") {
            nextDraft.colorway = value || null;
            updated = true;
            continue;
        }

        errors.push(`Unknown field: ${rawKey.trim()}`);
    }

    return {
        draft: nextDraft,
        updated,
        errors,
    };
};

const saveForwardDraftToDb = (draft) => {
    const brand = brandsQuery.findOrCreate(draft.brandName);

    const shortName = buildModelShortName(draft.modelName);
    const model = brandsQuery.findOrCreateModel(
        brand.id,
        draft.modelName,
        shortName,
    );

    const sizeData = draft.sizes.map((size) => ({
        size,
        inStock: draft.stockPerSize,
    }));

    const productId = productsQuery.create({
        brandId: brand.id,
        modelId: model.id,
        name: draft.name,
        colorway: draft.colorway || null,
        price: draft.price,
        sizes: sizeData,
        imageFileId: draft.imageFileIds[0] || null,
    });

    draft.imageFileIds.slice(1).forEach((imageFileId) => {
        productsQuery.addImage(productId, imageFileId, false);
    });

    return {
        productId,
        totalUnits: sizeData.length * draft.stockPerSize,
    };
};

const buildModelShortName = (modelName) => {
    return (modelName || "")
        .replace(/^(Air\s+)?/i, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 4);
};

const extractLabeledValue = (lines, regex) => {
    for (const line of lines) {
        const match = line.match(regex);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    return null;
};

const parsePriceFromLines = (lines) => {
    for (const line of lines) {
        if (!/(price|fixed\s*price|etb|birr)/i.test(line)) {
            continue;
        }

        const parsed = parsePriceValue(line);
        if (parsed) return parsed;
    }

    return null;
};

const parsePriceValue = (value) => {
    const match = (value || "").match(/(\d[\d,]*(?:\.\d+)?)/);
    if (!match) return null;

    const parsed = parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const parseStockFromLines = (lines) => {
    for (const line of lines) {
        const match = line.match(/(?:stock|qty|quantity)\s*[:\-]?\s*(\d+)/i);
        if (!match?.[1]) continue;

        const value = parseInt(match[1], 10);
        if (value > 0) return value;
    }

    return null;
};

const parseSizesFromLines = (lines) => {
    for (const line of lines) {
        if (!/\bsize\b|\bsizes\b/i.test(line)) {
            continue;
        }

        const parsedSizes = parseSizesValue(line);
        if (parsedSizes.length > 0) {
            return parsedSizes;
        }
    }

    return [];
};

const parseSizesValue = (rawValue) => {
    if (!rawValue) return [];

    const rangeMatch = rawValue.match(/(\d{2})\s*-\s*(\d{2})/);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);

        if (start > 0 && end >= start && end - start <= 20) {
            const range = [];
            for (let size = start; size <= end; size += 1) {
                if (size >= 30 && size <= 55) {
                    range.push(size.toString());
                }
            }
            return range;
        }
    }

    const numberMatches = rawValue.match(/\b\d{2}\b/g) || [];
    const deduped = Array.from(
        new Set(
            numberMatches
                .map((value) => parseInt(value, 10))
                .filter((size) => size >= 30 && size <= 55)
                .map((size) => size.toString()),
        ),
    );

    return deduped.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
};

const inferBrandAndModel = (lines, brandName, modelName) => {
    const result = {
        brandName: brandName || null,
        modelName: modelName || null,
    };

    const candidate = pickDescriptorLine(lines);
    if (!candidate) return result;

    const normalizedCandidate = candidate.toLowerCase();
    const knownBrands = getKnownBrandNames();

    for (const knownBrand of knownBrands) {
        if (
            normalizedCandidate === knownBrand ||
            normalizedCandidate.startsWith(`${knownBrand} `)
        ) {
            if (!result.brandName) {
                result.brandName = toTitleCase(knownBrand);
            }

            if (!result.modelName) {
                const model = candidate.slice(knownBrand.length).trim();
                if (model) {
                    result.modelName = model;
                }
            }

            return result;
        }
    }

    if (result.brandName && !result.modelName) {
        const brandLower = result.brandName.toLowerCase();
        if (normalizedCandidate.startsWith(`${brandLower} `)) {
            const model = candidate.slice(result.brandName.length).trim();
            if (model) {
                result.modelName = model;
            }
        }
    }

    return result;
};

const pickDescriptorLine = (lines) => {
    const noisePattern =
        /(price|fixed\s*price|size|stock|qty|quantity|https?:\/\/|www\.|@|inbox|maps\.|phone|tel|call|new\s*arrivals?)/i;

    for (const line of lines) {
        const cleaned = line.replace(/^[^A-Za-z0-9]+/, "").trim();

        if (!cleaned || cleaned.length < 3) continue;
        if (/^(brand|model|name|colorway|color)\s*[:\-]/i.test(cleaned))
            continue;
        if (noisePattern.test(cleaned)) continue;
        if (/^\d+$/.test(cleaned)) continue;

        return cleaned;
    }

    return null;
};

const getKnownBrandNames = () => {
    const staticBrands = [
        "adidas",
        "nike",
        "jordan",
        "new balance",
        "puma",
        "reebok",
        "converse",
        "vans",
        "asics",
        "fila",
        "skechers",
    ];

    const dynamicBrands = brandsQuery
        .getAll()
        .map((brand) => brand.name.toLowerCase());

    return Array.from(new Set([...dynamicBrands, ...staticBrands])).sort(
        (a, b) => b.length - a.length,
    );
};

const toTitleCase = (text) => {
    return (text || "")
        .split(" ")
        .filter(Boolean)
        .map(
            (word) =>
                `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
        )
        .join(" ");
};

const getBotUsername = async (ctx) => {
    if (ctx.botInfo?.username) {
        return ctx.botInfo.username;
    }

    const me = await ctx.telegram.getMe();
    return me.username;
};

const createProductFromText = async (ctx, text, imageFileId = null) => {
    try {
        const lines = text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

        if (lines.length < 3) {
            return ctx.reply(
                "❌ Not enough information. Need at least: Name, Brand, Price.",
            );
        }

        // Parse fields
        const name = lines[0];
        let colorway = null;
        let brandName = null;
        let modelName = null;
        let price = null;
        let sizes = [];
        let stockPerSize = 1;

        for (const line of lines) {
            const lower = line.toLowerCase();

            if (lower.startsWith("brand:")) {
                brandName = line.split(":").slice(1).join(":").trim();
            } else if (lower.startsWith("model:")) {
                modelName = line.split(":").slice(1).join(":").trim();
            } else if (lower.startsWith("price:")) {
                price = parseFloat(line.match(/[\d.]+/)?.[0]);
            } else if (
                lower.startsWith("sizes:") ||
                lower.startsWith("size:")
            ) {
                const sizeStr = line.split(":").slice(1).join(":").trim();
                if (sizeStr.includes("-")) {
                    const [start, end] = sizeStr
                        .split("-")
                        .map((s) => parseInt(s.trim()));
                    if (start && end && end >= start) {
                        for (let i = start; i <= end; i++)
                            sizes.push(i.toString());
                    }
                } else {
                    sizes = sizeStr
                        .split(/[,\s]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                }
            } else if (lower.startsWith("stock:")) {
                stockPerSize = parseInt(line.match(/\d+/)?.[0]) || 1;
            } else if (
                !brandName &&
                !lower.startsWith("brand") &&
                lines.indexOf(line) === 1
            ) {
                // Second line is colorway if it's not a field
                colorway = line;
            }
        }

        // Validate
        if (!brandName)
            return ctx.reply("❌ Missing Brand. Add: Brand: Jordan");
        if (!price || price <= 0)
            return ctx.reply("❌ Missing or invalid Price. Add: Price: 8500");
        if (sizes.length === 0)
            return ctx.reply("❌ Missing Sizes. Add: Sizes: 40-44");

        // Create brand
        const brand = brandsQuery.findOrCreate(brandName);

        // Create model if provided
        let model = null;
        if (modelName) {
            // Auto-generate short name
            const shortName = modelName
                .replace(/^(Air\s+)?/i, "")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .substring(0, 4);
            model = brandsQuery.findOrCreateModel(
                brand.id,
                modelName,
                shortName,
            );
        }

        // Create product with stock quantities
        const sizeData = sizes.map((s) => ({ size: s, inStock: stockPerSize }));

        const productId = productsQuery.create({
            brandId: brand.id,
            modelId: model?.id || null,
            name,
            colorway,
            price,
            sizes: sizeData,
            imageFileId,
        });

        const totalUnits = sizes.length * stockPerSize;

        ctx.session.clear();

        // Generate deep link
        const botUsername = ctx.botInfo.username;
        const deepLink = `https://t.me/${botUsername}?start=product_${productId}`;

        await ctx.replyWithHTML(
            `✅ <b>Product Added!</b>\n\n` +
                `🆔 ID: ${productId}\n` +
                `📦 ${name}\n` +
                (colorway ? `🎨 ${colorway}\n` : "") +
                `🏷 ${brandName}` +
                (modelName ? ` → ${modelName}` : "") +
                `\n` +
                `💰 ${formatPrice(price)}\n` +
                `📏 Sizes: ${sizes.join(", ")}\n` +
                `📦 Stock: ${stockPerSize} per size (${totalUnits} total units)\n\n` +
                `📤 Share link: <code>${deepLink}</code>`,
        );
    } catch (error) {
        console.error("Create product error:", error);
        ctx.reply(`❌ Failed to create product: ${error.message}`);
    }
};

module.exports = { registerAdminHandlers };
