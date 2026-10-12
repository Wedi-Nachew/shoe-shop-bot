const { Markup } = require("telegraf");
const { encodeFilters } = require("../../utils/pagination");
const { BRAND_EMOJIS } = require("../../config/constants");

// Brand selection buttons (2 per row)
const buildBrandButtons = (brands) => {
    const buttons = [];
    let row = [];

    for (const brand of brands) {
        const label = `${BRAND_EMOJIS[brand.name.toUpperCase()] || "👟"} ${brand.name} (${brand.product_count})`;
        row.push(Markup.button.callback(label, `brand:${brand.id}`));

        if (row.length === 2) {
            buttons.push([...row]);
            row = [];
        }
    }
    if (row.length) buttons.push(row);

    return buttons;
};

// Filters buttons for brand page (models + sizes)
const buildFilterButtons = (brandId, models, sizes, activeFilters = []) => {
    const buttons = [];

    // Model filter
    if (models && models.length > 0) {
        let modelRow = [];
        for (const m of models) {
            const isActive = activeFilters.modelId === m.id;
            const label = isActive ? `☑️ ${m.name}` : m.short_name || m.name;

            const newModelId = isActive ? 0 : m.id;
            const filterStr = encodeFilters({
                brandId,
                modelId: newModelId,
                size: activeFilters.size,
            });
            modelRow.push(Markup.button.callback(label, `fl:${filterStr}`));

            if (modelRow.length === 4) {
                buttons.push([...modelRow]);
                modelRow = [];
            }
        }
        if (modelRow.length) buttons.push(modelRow);
    }

    // Size filter
    if (sizes && sizes.length > 0) {
        let sizeRow = [];
        for (const s of sizes) {
            const isActive = activeFilters.size === s.size;
            const label = isActive ? `☑️ ${s.size}` : s.size;

            const newSize = isActive ? 0 : s.size;
            const filterStr = encodeFilters({
                brandId,
                modelId: activeFilters.modelId,
                size: newSize,
            });

            sizeRow.push(Markup.button.callback(label, `fl:${filterStr}`));

            if (sizeRow.length === 4) {
                buttons.push([...sizeRow]);
                sizeRow = [];
            }
        }
        if (sizeRow.length) buttons.push(sizeRow);
    }

    return buttons;
};

// Product action buttons (Add to Cart + Buy Now + optional gallery)
const buildProductActionButtons = (
    productId,
    hasSizes,
    hasMultipleImages = false,
) => {
    const buttons = [];

    if (!hasSizes) {
        buttons.push([Markup.button.callback("❌ Out of Stock", "noop")]);
    } else {
        buttons.push([
            Markup.button.callback(
                "🛒 Add to Cart",
                `product_sizes:${productId}`,
            ),
            Markup.button.callback("🛍️ Buy Now", `product_buy:${productId}`),
        ]);
    }

    if (hasMultipleImages) {
        buttons.push([
            Markup.button.callback(
                "🖼️ View all photos",
                `product_photos:${productId}`,
            ),
        ]);
    }

    return buttons;
};

// Size picker buttons (after tapping Add to Cart or Buy Now)
const buildSizePickerButtons = (productId, sizes, mode = "pick") => {
    const buttons = [];
    let row = [];

    const prefix = mode === "buy" ? "buy_size" : "pick_size";

    for (const s of sizes) {
        let label = `${s.size}`;
        if (s.in_stock <= 3) {
            label = `${s.size} (${s.in_stock} left)`;
        }

        row.push(
            Markup.button.callback(label, `${prefix}:${productId}:${s.size}`),
        );

        if (row.length === 3) {
            buttons.push([...row]);
            row = [];
        }
    }
    if (row.length) buttons.push(row);

    // Back button
    buttons.push([
        Markup.button.callback("◀️ Back", `product_back:${productId}`),
    ]);

    return buttons;
};

// Carousel navigation buttons for single-product view
// filterStr = "brandId:modelId:size", index = current product index, total = total products
const buildCarouselButtons = (
    productId,
    hasSizes,
    hasMultipleImages,
    filterStr,
    index,
    total,
) => {
    const buttons = buildProductActionButtons(
        productId,
        hasSizes,
        hasMultipleImages,
    );

    // Row 2: Prev / Counter / Next
    const navRow = [];

    if (index > 0) {
        navRow.push(
            Markup.button.callback("⬅️ Prev", `nav:${filterStr}:${index - 1}`),
        );
    }

    navRow.push(Markup.button.callback(`${index + 1} / ${total}`, "noop"));

    if (index < total - 1) {
        navRow.push(
            Markup.button.callback("Next ➡️", `nav:${filterStr}:${index + 1}`),
        );
    }

    buttons.push(navRow);

    // Row 3: Back to filters (preserve active filters)
    const parts = filterStr.split(":");
    const brandId = parts[0];
    if (brandId && brandId !== "0") {
        buttons.push([
            Markup.button.callback("◀️ Back to Filters", `fl:${filterStr}`),
        ]);
    }

    return buttons;
};

module.exports = {
    buildBrandButtons,
    buildFilterButtons,
    buildProductActionButtons,
    buildSizePickerButtons,
    buildCarouselButtons,
};
