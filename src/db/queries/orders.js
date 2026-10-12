const { getDb } = require('../index');

const orders = {
    // Create order from user's cart
    createFromCart(userId, userData) {
        const db = getDb();

        return db.transaction(() => {
            // Get cart items with current prices
            const cartItems = db.prepare(`
                SELECT 
                    c.product_id,
                    c.size,
                    c.quantity,
                    p.name,
                    p.colorway,
                    p.price
                FROM cart c
                JOIN products p ON c.product_id = p.id
                WHERE c.user_id = ?
            `).all(userId);

            if (cartItems.length === 0) {
                throw new Error('Cart is empty');
            }

            // Validate stock availability before creating order
            for (const item of cartItems) {
                const sizeStock = db.prepare(`
                    SELECT in_stock FROM product_sizes
                    WHERE product_id = ? AND size = ?
                `).get(item.product_id, item.size);

                if (!sizeStock || sizeStock.in_stock < item.quantity) {
                    const available = sizeStock ? sizeStock.in_stock : 0;
                    throw new Error(
                        `Insufficient stock for ${item.name} (Size ${item.size}): ` +
                        `requested ${item.quantity}, available ${available}`
                    );
                }
            }

            // Calculate total
            const total = cartItems.reduce((sum, item) => {
                return sum + (item.quantity * item.price);
            }, 0);

            // Create order
            const orderResult = db.prepare(`
                INSERT INTO orders (
                    user_id, user_name, user_username,
                    user_phone, delivery_address, total, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                userData.name || null,
                userData.username || null,
                userData.phone || null,
                userData.address || null,
                total,
                userData.notes || null
            );

            const orderId = orderResult.lastInsertRowid;

            // Create order items
            const insertItem = db.prepare(`
                INSERT INTO order_items (
                    order_id, product_id, product_name,
                    product_colorway, size, quantity, price_at_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            for (const item of cartItems) {
                insertItem.run(
                    orderId,
                    item.product_id,
                    item.name,
                    item.colorway,
                    item.size,
                    item.quantity,
                    item.price
                );
            }

            // Clear cart
            db.prepare('DELETE FROM cart WHERE user_id = ?').run(userId);

            // Log activity
            db.prepare(`
                INSERT INTO activity_log (user_id, user_name, action, details)
                VALUES (?, ?, 'order_created', ?)
            `).run(userId, userData.name, JSON.stringify({
                orderId, total, items: cartItems.length
            }));

            return { orderId, total, itemCount: cartItems.length };
        })();
    },

    // Get order by ID
    getById(orderId) {
        const db = getDb();
        return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    },

    // Get order items
    getItems(orderId) {
        const db = getDb();
        return db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    },

    // Get order with items
    getWithItems(orderId) {
        const db = getDb();

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (!order) return null;

        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        return order;
    },

    // Get user's orders
    getUserOrders(userId, limit = 10) {
        const db = getDb();
        return db.prepare(`
            SELECT 
                o.*,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ?
        `).all(userId, limit);
    },

    // Get pending orders (for owner)
    getPending(limit = 20) {
        const db = getDb();
        return db.prepare(`
            SELECT 
                o.*,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'pending'
            GROUP BY o.id
            ORDER BY o.created_at ASC
            LIMIT ?
        `).all(limit);
    },

    // Get all orders (for admin)
    getAll(status = null, limit = 50, offset = 0) {
        const db = getDb();

        let query = `
            SELECT 
                o.*,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
        `;
        const params = [];

        if (status) {
            query += ' WHERE o.status = ?';
            params.push(status);
        }

        query += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return db.prepare(query).all(...params);
    },

    // Update order status with inventory management
    updateStatus(orderId, newStatus) {
        const db = getDb();

        return db.transaction(() => {
            // Get current order
            const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
            if (!order) throw new Error(`Order #${orderId} not found`);

            const oldStatus = order.status;

            // Prevent invalid transitions
            if (oldStatus === newStatus) return { changed: false };

            // Get order items for stock management
            const items = db.prepare(
                'SELECT * FROM order_items WHERE order_id = ?'
            ).all(orderId);

            // STOCK DECREMENT: When order is confirmed
            // Only decrement if moving TO confirmed from a non-confirmed state
            if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
                const decrementStmt = db.prepare(`
                    UPDATE product_sizes 
                    SET in_stock = MAX(in_stock - ?, 0)
                    WHERE product_id = ? AND size = ?
                `);

                for (const item of items) {
                    if (item.product_id) {
                        decrementStmt.run(item.quantity, item.product_id, item.size);
                    }
                }

                // Log stock change
                db.prepare(`
                    INSERT INTO activity_log (user_id, action, details)
                    VALUES (?, 'stock_decremented', ?)
                `).run(order.user_id, JSON.stringify({
                    orderId,
                    items: items.map(i => ({
                        productId: i.product_id,
                        name: i.product_name,
                        size: i.size,
                        quantity: i.quantity
                    }))
                }));
            }

            // STOCK INCREMENT: When confirmed order is cancelled
            // Only increment if moving FROM confirmed to cancelled
            if (newStatus === 'cancelled' && oldStatus === 'confirmed') {
                const incrementStmt = db.prepare(`
                    UPDATE product_sizes 
                    SET in_stock = in_stock + ?
                    WHERE product_id = ? AND size = ?
                `);

                for (const item of items) {
                    if (item.product_id) {
                        incrementStmt.run(item.quantity, item.product_id, item.size);
                    }
                }

                // Log stock change
                db.prepare(`
                    INSERT INTO activity_log (user_id, action, details)
                    VALUES (?, 'stock_restored', ?)
                `).run(order.user_id, JSON.stringify({
                    orderId,
                    reason: 'order_cancelled',
                    items: items.map(i => ({
                        productId: i.product_id,
                        name: i.product_name,
                        size: i.size,
                        quantity: i.quantity
                    }))
                }));
            }

            // Update order status
            db.prepare(`
                UPDATE orders
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(newStatus, orderId);

            // Log status change
            db.prepare(`
                INSERT INTO activity_log (user_id, action, details)
                VALUES (?, 'order_status_changed', ?)
            `).run(order.user_id, JSON.stringify({
                orderId,
                from: oldStatus,
                to: newStatus
            }));

            return { changed: true, oldStatus, newStatus };
        })();
    },

    // Count orders by status
    countByStatus() {
        const db = getDb();
        return db.prepare(`
            SELECT 
                status,
                COUNT(*) as count
            FROM orders
            GROUP BY status
        `).all();
    }
};

module.exports = orders;
