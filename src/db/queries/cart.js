const { getDb } = require("../index");

const cart = {
    // Get user cart with product details
    get(userId) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT 
                c.id,
                c.product_id,
                c.size,
                c.quantity,
                c.added_at,
                p.name,
                p.colorway,
                p.price,
                b.name as brand_name
            FROM cart c
            JOIN products p ON c.product_id = p.id
            JOIN brands b ON p.brand_id = b.id
            WHERE c.user_id = ?
            ORDER BY c.added_at DESC
        `,
            )
            .all(userId);
    },

    // Get cart item count (total quantity)
    getCount(userId) {
        const db = getDb();
        const result = db
            .prepare(
                `
            SELECT COALESCE(SUM(quantity), 0) as count
            FROM cart WHERE user_id = ?
        `,
            )
            .get(userId);
        return result.count;
    },

    // Get cart total price
    getTotal(userId) {
        const db = getDb();
        const result = db
            .prepare(
                `
            SELECT COALESCE(SUM(c.quantity * p.price), 0) as total
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `,
            )
            .get(userId);
        return result.total;
    },

    // Add item to cart (or increment quantity)
    add(userId, productId, size, quantity = 1) {
        const db = getDb();
        return db
            .prepare(
                `
            INSERT INTO cart (user_id, product_id, size, quantity)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, product_id, size)
            DO UPDATE SET quantity = quantity + ?
        `,
            )
            .run(userId, productId, size, quantity, quantity);
    },

    // Set exact quantity
    setQuantity(userId, productId, size, quantity) {
        const db = getDb();

        if (quantity <= 0) {
            return this.removeItem(userId, productId, size);
        }

        return db
            .prepare(
                `
            UPDATE cart SET quantity = ?
            WHERE user_id = ? AND product_id = ? AND size = ?
        `,
            )
            .run(quantity, userId, productId, size);
    },

    // Remove specific item
    removeItem(userId, productId, size) {
        const db = getDb();
        return db
            .prepare(
                `
            DELETE FROM cart
            WHERE user_id = ? AND product_id = ? AND size = ?
        `,
            )
            .run(userId, productId, size);
    },

    // Remove by cart id
    removeById(cartId, userId) {
        const db = getDb();
        return db
            .prepare(
                `
            DELETE FROM cart WHERE id = ? AND user_id = ?
        `,
            )
            .run(cartId, userId);
    },

    // Clear entire cart
    clear(userId) {
        const db = getDb();
        return db.prepare("DELETE FROM cart WHERE user_id = ?").run(userId);
    },

    // Check if item exists in cart
    exists(userId, productId, size) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT id, quantity FROM cart
            WHERE user_id = ? AND product_id = ? AND size = ?
        `,
            )
            .get(userId, productId, size);
    },
};

module.exports = cart;
