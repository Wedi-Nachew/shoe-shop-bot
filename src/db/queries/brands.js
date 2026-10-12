const { getDb } = require('../index');

const brands = {
    // Get all brands with product counts
    getAll() {
        const db = getDb();
        return db.prepare(`
            SELECT 
                b.*,
                COUNT(p.id) as product_count
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id AND p.in_stock = 1
            GROUP BY b.id
            HAVING product_count > 0
            ORDER BY b.sort_order, b.name
        `).all();
    },

    // Get brand by ID
    getById(id) {
        const db = getDb();
        return db.prepare('SELECT * FROM brands WHERE id = ?').get(id);
    },

    // Get brand by name
    getByName(name) {
        const db = getDb();
        return db.prepare('SELECT * FROM brands WHERE name = ?').get(name);
    },

    // Get models for a brand (only those with in-stock products)
    getModels(brandId) {
        const db = getDb();
        return db.prepare(`
            SELECT 
                m.*,
                COUNT(p.id) as product_count
            FROM models m
            JOIN products p ON m.id = p.model_id AND p.in_stock = 1
            WHERE m.brand_id = ?
            GROUP BY m.id
            HAVING product_count > 0
            ORDER BY m.sort_order, m.name
        `).all(brandId);
    },

    // Get available sizes for a brand (only sizes with stock > 0)
    getAvailableSizes(brandId, modelId = null) {
        const db = getDb();

        let query = `
            SELECT DISTINCT ps.size
            FROM product_sizes ps
            JOIN products p ON ps.product_id = p.id
            WHERE p.brand_id = ? 
            AND p.in_stock = 1 
            AND ps.in_stock > 0
        `;
        const params = [brandId];

        if (modelId) {
            query += ' AND p.model_id = ?';
            params.push(modelId);
        }

        query += ' ORDER BY CAST(ps.size AS INTEGER)';

        return db.prepare(query).all(...params);
    },

    // Find or create brand
    findOrCreate(name, emoji = '👟') {
        const db = getDb();

        let brand = db.prepare('SELECT * FROM brands WHERE name = ?').get(name);

        if (!brand) {
            const result = db.prepare(
                'INSERT INTO brands (name, emoji) VALUES (?, ?)'
            ).run(name, emoji);

            brand = { id: result.lastInsertRowid, name, emoji };
        }

        return brand;
    },

    // Find or create model
    findOrCreateModel(brandId, name, shortName = null) {
        const db = getDb();

        let model = db.prepare(
            'SELECT * FROM models WHERE brand_id = ? AND name = ?'
        ).get(brandId, name);

        if (!model) {
            const result = db.prepare(
                'INSERT INTO models (brand_id, name, short_name) VALUES (?, ?, ?)'
            ).run(brandId, name, shortName);

            model = { id: result.lastInsertRowid, brand_id: brandId, name, short_name: shortName };
        }

        return model;
    },

    // Create brand
    create(data) {
        const db = getDb();
        const result = db.prepare(
            'INSERT INTO brands (name, name_amharic, emoji, sort_order) VALUES (?, ?, ?, ?)'
        ).run(data.name, data.nameAmharic || null, data.emoji || '👟', data.sortOrder || 0);

        return result.lastInsertRowid;
    },

    // Update brand
    update(id, data) {
        const db = getDb();
        return db.prepare(`
            UPDATE brands 
            SET name = COALESCE(?, name),
                name_amharic = COALESCE(?, name_amharic),
                emoji = COALESCE(?, emoji),
                sort_order = COALESCE(?, sort_order)
            WHERE id = ?
        `).run(data.name, data.nameAmharic, data.emoji, data.sortOrder, id);
    },

    // Delete brand
    delete(id) {
        const db = getDb();
        return db.prepare('DELETE FROM brands WHERE id = ?').run(id);
    }
};

module.exports = brands;
