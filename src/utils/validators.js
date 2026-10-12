// Validate Ethiopian phone number
//  Accepts: +251912345678, 0912345678, 912345678

const validatePhone = (phone) => {
    const cleaned = phone.replace(/[\s\-()]/g, "");

    // +251XXXXXXXXX
    if (/^\+251[0-9]{9}$/.test(cleaned)) return cleaned;

    // 09/7XXXXXXXX
    if (/^0(7|9)[0-9]{8}$/.test(cleaned)) return "+251" + cleaned.substring(1);

    // 7/9XXXXXXXX (without leading 0)
    if (/^(7|9)[0-9]{8}$/.test(cleaned)) return "+251" + cleaned;

    return null;
};

// Check if text is a menu button label
const isMenuButton = (text) => {
    const menuButtons = [
        // Customer buttons
        "🔍 Search",
        "👟 Brands",
        "🆕 New Drops",
        "🛒 Cart",
        "📦 My Orders",
        "❓ FAQ",
        // Admin buttons
        "⏳ Pending",
        "📊 Sales",
        "⚠️ Low Stock",
        "➕ Add Product",
        "👟 Browse Shop",
    ];
    // Also match cart with count like "🛒 Cart (3)"
    return menuButtons.some((btn) => text.startsWith(btn.split(" (")[0]));
};

module.exports = {
    validatePhone,
    isMenuButton,
};
