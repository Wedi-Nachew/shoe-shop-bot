const { getDb } = require("../index");

const products = {
    // Find by ID with all details
    findById(id) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT 
                p.*,
                b.name as brand_name,
                b.emoji as brand_emoji,
                m.name as model_name,
                m.short_name as model_short_name
            FROM products p
            JOIN brands b ON p.brand_id = b.id
            LEFT JOIN models m ON p.model_id = m.id
            WHERE p.id = ?
        `,
            )
            .get(id);
    },

    // Search products
    search(query, limit = 20) {
        const db = getDb();
        const searchTerm = `%${query}%`;

        return db
            .prepare(
                `
            SELECT 
                p.*,
                b.name as brand_name,
                b.emoji as brand_emoji,
                m.name as model_name
            FROM products p
            JOIN brands b ON p.brand_id = b.id
            LEFT JOIN models m ON p.model_id = m.id
            WHERE p.in_stock = 1 AND (
                p.name LIKE ? OR
                p.name_amharic LIKE ? OR
                p.colorway LIKE ? OR
                p.description LIKE ? OR
                b.name LIKE ? OR
                m.name LIKE ?
            )
            ORDER BY p.created_at DESC
            LIMIT ?
        `,
            )
            .all(
                searchTerm,
                searchTerm,
                searchTerm,
                searchTerm,
                searchTerm,
                searchTerm,
                limit,
            );
    },

    // Filter products by brand/model/size with pagination
    findByFilters(filters = {}, limit = 5, offset = 0) {
        const db = getDb();

        let query = `
            SELECT 
                p.*,
                b.name as brand_name,
                b.emoji as brand_emoji,
                m.name as model_name
            FROM products p
            JOIN brands b ON p.brand_id = b.id
            LEFT JOIN models m ON p.model_id = m.id
            WHERE p.in_stock = 1
        `;
        const params = [];

        if (filters.brandId) {
            query += " AND p.brand_id = ?";
            params.push(filters.brandId);
        }

        if (filters.modelId) {
            query += " AND p.model_id = ?";
            params.push(filters.modelId);
        }

        if (filters.size) {
            query += ` AND EXISTS (
                SELECT 1 FROM product_sizes ps
                WHERE ps.product_id = p.id
                AND ps.size = ?
                AND ps.in_stock > 0
            )`;
            params.push(filters.size);
        }

        if (filters.minPrice) {
            query += " AND p.price >= ?";
            params.push(filters.minPrice);
        }

        if (filters.maxPrice) {
            query += " AND p.price <= ?";
            params.push(filters.maxPrice);
        }

        query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        return db.prepare(query).all(...params);
    },

    // Count products matching filters
    countByFilters(filters = {}) {
        const db = getDb();

        let query =
            "SELECT COUNT(*) as total FROM products p WHERE p.in_stock = 1";
        const params = [];

        if (filters.brandId) {
            query += " AND p.brand_id = ?";
            params.push(filters.brandId);
        }

        if (filters.modelId) {
            query += " AND p.model_id = ?";
            params.push(filters.modelId);
        }

        if (filters.size) {
            query += ` AND EXISTS (
                SELECT 1 FROM product_sizes ps
                WHERE ps.product_id = p.id
                AND ps.size = ?
                AND ps.in_stock > 0
            )`;
            params.push(filters.size);
        }

        return db.prepare(query).get(...params).total;
    },

    // Get latest products
    getLatest(limit = 10, offset = 0) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT 
                p.*,
                b.name as brand_name,
                b.emoji as brand_emoji,
                m.name as model_name
            FROM products p
            JOIN brands b ON p.brand_id = b.id
            LEFT JOIN models m ON p.model_id = m.id
            WHERE p.in_stock = 1
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `,
            )
            .all(limit, offset);
    },

    // Count latest in-stock products
    countLatest() {
        const db = getDb();
        return db
            .prepare(
                "SELECT COUNT(*) as total FROM products WHERE in_stock = 1",
            )
            .get().total;
    },

    // Get ALL sizes for a product (including out of stock, shows quantity)
    getSizes(productId) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT size, in_stock
            FROM product_sizes
            WHERE product_id = ?
            ORDER BY CAST(size AS INTEGER)
        `,
            )
            .all(productId);
    },

    // Get only available sizes (quantity > 0)
    getAvailableSizes(productId) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT size, in_stock
            FROM product_sizes
            WHERE product_id = ? AND in_stock > 0
            ORDER BY CAST(size AS INTEGER)
        `,
            )
            .all(productId);
    },

    // Get stock quantity for a specific size
    getSizeStock(productId, size) {
        const db = getDb();
        const result = db
            .prepare(
                `
            SELECT in_stock FROM product_sizes
            WHERE product_id = ? AND size = ?
        `,
            )
            .get(productId, size);

        return result ? result.in_stock : 0;
    },

    // Get primary image for product
    getImage(productId) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT telegram_file_id
            FROM product_images
            WHERE product_id = ?
            ORDER BY is_primary DESC, id ASC
            LIMIT 1
        `,
            )
            .get(productId);
    },

    // Get all images for product
    getImages(productId) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT *
            FROM product_images
            WHERE product_id = ?
            ORDER BY is_primary DESC, id ASC
        `,
            )
            .all(productId);
    },

    // Create product with sizes and optional image
    // sizes can be:
    //   ['40', '41', '42']              → each gets in_stock = 1
    //   [{ size: '40', inStock: 5 }]    → each gets specified quantity
    create(data) {
        const db = getDb();

        const createTransaction = db.transaction((productData) => {
            // Insert product
            const result = db
                .prepare(
                    `
                INSERT INTO products (
                    brand_id, model_id, name, name_amharic,
                    colorway, description, price, in_stock, is_featured
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                )
                .run(
                    productData.brandId,
                    productData.modelId || null,
                    productData.name,
                    productData.nameAmharic || null,
                    productData.colorway || null,
                    productData.description || null,
                    productData.price,
                    productData.inStock !== undefined ? productData.inStock : 1,
                    productData.isFeatured || 0,
                );

            const productId = result.lastInsertRowid;

            // Insert sizes with quantities
            if (productData.sizes && productData.sizes.length > 0) {
                const sizeStmt = db.prepare(
                    "INSERT INTO product_sizes (product_id, size, in_stock) VALUES (?, ?, ?)",
                );

                for (const sizeEntry of productData.sizes) {
                    if (typeof sizeEntry === "object" && sizeEntry !== null) {
                        // { size: '42', inStock: 5 }
                        sizeStmt.run(
                            productId,
                            sizeEntry.size.toString(),
                            sizeEntry.inStock !== undefined
                                ? sizeEntry.inStock
                                : 1,
                        );
                    } else {
                        // Simple string '42' → defaults to quantity 1
                        sizeStmt.run(productId, sizeEntry.toString(), 1);
                    }
                }
            }

            // Insert image if provided
            if (productData.imageFileId) {
                db.prepare(
                    "INSERT INTO product_images (product_id, telegram_file_id, is_primary) VALUES (?, ?, 1)",
                ).run(productId, productData.imageFileId);
            }

            return productId;
        });

        return createTransaction(data);
    },

    // Update product
    update(id, data) {
        const db = getDb();

        const fields = [];
        const params = [];

        if (data.name !== undefined) {
            fields.push("name = ?");
            params.push(data.name);
        }
        if (data.nameAmharic !== undefined) {
            fields.push("name_amharic = ?");
            params.push(data.nameAmharic);
        }
        if (data.colorway !== undefined) {
            fields.push("colorway = ?");
            params.push(data.colorway);
        }
        if (data.description !== undefined) {
            fields.push("description = ?");
            params.push(data.description);
        }
        if (data.price !== undefined) {
            fields.push("price = ?");
            params.push(data.price);
        }
        if (data.inStock !== undefined) {
            fields.push("in_stock = ?");
            params.push(data.inStock ? 1 : 0);
        }
        if (data.isFeatured !== undefined) {
            fields.push("is_featured = ?");
            params.push(data.isFeatured ? 1 : 0);
        }

        if (fields.length === 0) return null;

        fields.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);

        return db
            .prepare(
                `
            UPDATE products SET ${fields.join(", ")} WHERE id = ?
        `,
            )
            .run(...params);
    },

    // Toggle product-level stock status (visible/hidden)
    toggleStock(id) {
        const db = getDb();
        return db
            .prepare(
                `
            UPDATE products 
            SET in_stock = CASE WHEN in_stock = 1 THEN 0 ELSE 1 END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
            )
            .run(id);
    },

    // Set exact stock quantity for a specific size
    setSizeStock(productId, size, quantity) {
        const db = getDb();
        return db
            .prepare(
                `
            UPDATE product_sizes 
            SET in_stock = ? 
            WHERE product_id = ? AND size = ?
        `,
            )
            .run(quantity, productId, size);
    },

    // Decrement stock for a specific size (used during order confirmation)
    decrementSizeStock(productId, size, quantity = 1) {
        const db = getDb();

        // Prevent going below 0
        return db
            .prepare(
                `
            UPDATE product_sizes 
            SET in_stock = MAX(in_stock - ?, 0)
            WHERE product_id = ? AND size = ?
        `,
            )
            .run(quantity, productId, size);
    },

    // Increment stock for a specific size (used for restocking or order cancellation)
    incrementSizeStock(productId, size, quantity = 1) {
        const db = getDb();
        return db
            .prepare(
                `
            UPDATE product_sizes 
            SET in_stock = in_stock + ?
            WHERE product_id = ? AND size = ?
        `,
            )
            .run(quantity, productId, size);
    },

    // Add image
    addImage(productId, telegramFileId, isPrimary = false) {
        const db = getDb();

        if (isPrimary) {
            db.prepare(
                "UPDATE product_images SET is_primary = 0 WHERE product_id = ?",
            ).run(productId);
        }

        return db
            .prepare(
                "INSERT INTO product_images (product_id, telegram_file_id, is_primary) VALUES (?, ?, ?)",
            )
            .run(productId, telegramFileId, isPrimary ? 1 : 0);
    },

    // Add sizes to existing product
    addSizes(productId, sizes) {
        const db = getDb();
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO product_sizes (product_id, size, in_stock) VALUES (?, ?, ?)
        `);

        for (const sizeEntry of sizes) {
            if (typeof sizeEntry === "object" && sizeEntry !== null) {
                stmt.run(
                    productId,
                    sizeEntry.size.toString(),
                    sizeEntry.inStock || 1,
                );
            } else {
                stmt.run(productId, sizeEntry.toString(), 1);
            }
        }
    },

    // Delete product
    delete(id) {
        const db = getDb();
        return db.prepare("DELETE FROM products WHERE id = ?").run(id);
    },

    // Increment view count
    incrementViews(id) {
        const db = getDb();
        return db
            .prepare(
                "UPDATE products SET view_count = view_count + 1 WHERE id = ?",
            )
            .run(id);
    },

    // Get all products (for admin — includes stock details)
    getAll(limit = 100, offset = 0) {
        const db = getDb();
        return db
            .prepare(
                `
            SELECT 
                p.*,
                b.name as brand_name,
                m.name as model_name,
                (SELECT COUNT(*) FROM product_sizes ps WHERE ps.product_id = p.id AND ps.in_stock > 0) as available_size_count,
                (SELECT COALESCE(SUM(ps.in_stock), 0) FROM product_sizes ps WHERE ps.product_id = p.id) as total_stock,
                (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) as image_count
            FROM products p
            JOIN brands b ON p.brand_id = b.id
            LEFT JOIN models m ON p.model_id = m.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `,
            )
            .all(limit, offset);
    },

    // Count all products
    countAll() {
        const db = getDb();
        return db.prepare("SELECT COUNT(*) as total FROM products").get().total;
    },
};

module.exports = products;
