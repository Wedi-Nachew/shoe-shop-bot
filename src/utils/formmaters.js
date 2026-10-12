const { ORDER_STATUS_LABELS } = require("../config/constants");

// Format price with ETB and thousands separator
const formatPrice = (price) => {
    return `${Number(price).toLocaleString()} ETB`;
};

// Build short product caption for photo messages
const formatProductCaption = (product, sizes = []) => {
    let text = `<b>${escapeHtml(product.name)}</b>\n`;
    if (product.colorway) text += `🎨 ${escapeHtml(product.colorway)}\n`;
    if (product.brand_name) text += `🏷 ${escapeHtml(product.brand_name)}`;

    // Size availability
    if (sizes.length > 0) {
        text += `  •  📏 ${sizes.length} size${sizes.length !== 1 ? 's' : ''} available`;

        // Low stock badge
        const totalStock = sizes.reduce((sum, s) => sum + s.in_stock, 0);
        if (totalStock <= 5) {
            text += `\n⚡ <i>Low stock — order soon!</i>`;
        }
    }
    text += `\n`;

    text += `💰 <b>${formatPrice(product.price)}</b>`;
    return text;
};

// Build detailed product text (for text-only messages)
const formatProductDetail = (product, sizes = []) => {
    let text = `<b>${escapeHtml(product.name)}</b>\n`;
    if (product.colorway) text += `🎨 ${escapeHtml(product.colorway)}\n`;
    if (product.brand_name) text += `🏷 ${escapeHtml(product.brand_name)}\n`;
    text += `💰 <b>${formatPrice(product.price)}</b>\n`;

    if (sizes.length > 0) {
        text += `\n📏 Available sizes: ${sizes.map((s) => s.size).join(", ")}`;
    }

    if (product.description) {
        text += `\n\n${escapeHtml(product.description)}`;
    }

    return text;
};

// Format cart summary
const formatCartItem = (item, index) => {
    let text = `${index}. <b>${escapeHtml(item.name)}</b>`;
    if (item.colorway) text += ` — ${escapeHtml(item.colorway)}`;
    text += `\n   📏 Size: ${item.size}`;
    text += `\n   💰 ${formatPrice(item.price)} × ${item.quantity} = <b>${formatPrice(item.price * item.quantity)}</b>`;
    return text;
};

// Format order summary for customer
const formatOrderSummary = (order, items) => {
    const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;

    let text = `📦 <b>Order #${order.id}</b>\n`;
    text += `Status: ${statusLabel}\n`;
    text += `📅 ${formatDate(order.created_at)}\n\n`;

    items.forEach((item, i) => {
        text += `${i + 1}. ${item.product_name}`;
        if (item.product_colorway) text += ` — ${item.product_colorway}`;
        text += ` (${item.size})`;
        text += `\n   ${item.quantity}× ${formatPrice(item.price_at_order)}\n`;
    });

    text += `\n💰 <b>Total: ${formatPrice(order.total)}</b>`;
    return text;
};

// Format order notification for shop owner
const formatOrderNotification = (order, items) => {
    let text = `🔔 <b>NEW ORDER #${order.id}</b>\n\n`;
    text += `👤 ${escapeHtml(order.user_name || "Unknown")}`;
    if (order.user_username) text += ` (@${order.user_username})`;
    text += `\n📱 ${order.user_phone || "No phone"}`;
    if (order.delivery_address)
        text += `\n📍 ${escapeHtml(order.delivery_address)}`;
    text += `\n\n`;

    items.forEach((item) => {
        text += `• ${item.product_name}`;
        if (item.product_colorway) text += ` (${item.product_colorway})`;
        text += ` — Size ${item.size}`;
        text += `\n  ${item.quantity}× ${formatPrice(item.price_at_order)}\n`;
    });

    text += `\n💰 <b>Total: ${formatPrice(order.total)}</b>`;

    if (order.notes) {
        text += `\n\n📝 Note: ${escapeHtml(order.notes)}`;
    }

    return text;
};

//   Format date nicely
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

//   Escape HTML special characters for Telegram HTML parse mode
const escapeHtml = (text) => {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

//   Truncate text with ellipsis
const truncate = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
};

module.exports = {
    formatPrice,
    formatProductCaption,
    formatProductDetail,
    formatCartItem,
    formatOrderSummary,
    formatOrderNotification,
    formatDate,
    escapeHtml,
    truncate,
};
