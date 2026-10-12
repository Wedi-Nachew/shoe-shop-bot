const { getDb } = require('../index');

const stats = {
    // Overall sales stats
    getSalesStats(days = 30) {
        const db = getDb();
        return db.prepare(`
            SELECT
                COUNT(*) as total_orders,
                COALESCE(SUM(total), 0) as total_revenue,
                COALESCE(AVG(total), 0) as avg_order_value,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
            FROM orders
            WHERE created_at > datetime('now', '-' || ? || ' days')
        `).get(days);
    },

    // Daily revenue breakdown
    getDailyRevenue(days = 7) {
        const db = getDb();
        return db.prepare(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as order_count,
                COALESCE(SUM(total), 0) as revenue
            FROM orders
            WHERE created_at > datetime('now', '-' || ? || ' days')
            AND status != 'cancelled'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `).all(days);
    },

    // Top selling products
    getTopProducts(limit = 10, days = 30) {
        const db = getDb();
        return db.prepare(`
            SELECT
                oi.product_name,
                oi.product_colorway,
                SUM(oi.quantity) as total_sold,
                SUM(oi.quantity * oi.price_at_order) as total_revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at > datetime('now', '-' || ? || ' days')
            AND o.status != 'cancelled'
            GROUP BY oi.product_id
            ORDER BY total_sold DESC
            LIMIT ?
        `).all(days, limit);
    },

    // Most requested sizes
    getPopularSizes(days = 30) {
        const db = getDb();
        return db.prepare(`
            SELECT
                oi.size,
                COUNT(*) as times_ordered,
                SUM(oi.quantity) as total_quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at > datetime('now', '-' || ? || ' days')
            AND o.status != 'cancelled'
            GROUP BY oi.size
            ORDER BY total_quantity DESC
        `).all(days);
    },

    // Customer stats
    getCustomerStats(days = 30) {
        const db = getDb();
        return db.prepare(`
            SELECT
                COUNT(DISTINCT user_id) as unique_customers,
                COUNT(*) as total_orders,
                ROUND(CAST(COUNT(*) AS FLOAT) / MAX(COUNT(DISTINCT user_id), 1), 2) as orders_per_customer
            FROM orders
            WHERE created_at > datetime('now', '-' || ? || ' days')
        `).get(days);
    },

    // Product inventory summary
    getInventoryStats() {
        const db = getDb();
        return db.prepare(`
            SELECT
                COUNT(*) as total_products,
                COUNT(CASE WHEN in_stock = 1 THEN 1 END) as active_products,
                COUNT(CASE WHEN in_stock = 0 THEN 1 END) as hidden_products,
                COUNT(DISTINCT brand_id) as total_brands,
                COALESCE(AVG(price), 0) as avg_price,
                COALESCE(MIN(price), 0) as min_price,
                COALESCE(MAX(price), 0) as max_price
            FROM products
        `).get();
    },

    // Stock level summary (uses quantity-based inventory)
    getStockLevels() {
        const db = getDb();
        return db.prepare(`
            SELECT
                (SELECT COALESCE(SUM(in_stock), 0) FROM product_sizes) as total_units,
                (SELECT COUNT(*) FROM product_sizes WHERE in_stock > 0) as sizes_in_stock,
                (SELECT COUNT(*) FROM product_sizes WHERE in_stock = 0) as sizes_out_of_stock,
                (SELECT COUNT(DISTINCT product_id) FROM product_sizes WHERE in_stock = 0 
                    AND product_id NOT IN (
                        SELECT product_id FROM product_sizes WHERE in_stock > 0
                    )
                ) as fully_out_of_stock_products
        `).get();
    },

    // Low stock alerts (sizes with stock <= threshold)
    getLowStock(threshold = 2) {
        const db = getDb();
        return db.prepare(`
            SELECT 
                ps.product_id,
                p.name,
                p.colorway,
                b.name as brand_name,
                ps.size,
                ps.in_stock
            FROM product_sizes ps
            JOIN products p ON ps.product_id = p.id
            JOIN brands b ON p.brand_id = b.id
            WHERE ps.in_stock > 0 
            AND ps.in_stock <= ?
            AND p.in_stock = 1
            ORDER BY ps.in_stock ASC, p.name
        `).all(threshold);
    }
};

module.exports = stats;
