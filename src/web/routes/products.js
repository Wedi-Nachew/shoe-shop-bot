const express = require("express");
const productsQuery = require("../../db/queries/products");
const brandsQuery = require("../../db/queries/brands");
const { getDb } = require("../../db");

const router = express.Router();

//  GET /api/products
//  List products with optional search/filter
router.get("/", (req, res) => {
    try {
        const { search, brand, model, page = 0, limit = 50 } = req.query;
        const offset = parseInt(page) * parseInt(limit);

        if (search) {
            const results = productsQuery.search(search, parseInt(limit));
            return res.json({ products: results, total: results.length });
        }

        const filters = {};
        if (brand) filters.brandId = parseInt(brand);
        if (model) filters.modelId = parseInt(model);

        const products = productsQuery.getAll(parseInt(limit), offset);
        const total = productsQuery.countAll();

        // Attach sizes and images to each product
        const enriched = products.map((p) => ({
            ...p,
            sizes: productsQuery.getSizes(p.id),
            image: productsQuery.getImage(p.id),
        }));

        res.json({ products: enriched, total });
    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

//  GET /api/products/:id
//  Get single product with all details
router.get("/:id", (req, res) => {
    try {
        const product = productsQuery.findById(parseInt(req.params.id));

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        product.sizes = productsQuery.getSizes(product.id);
        product.images = productsQuery.getImages(product.id);
        product.image = productsQuery.getImage(product.id);

        res.json(product);
    } catch (error) {
        console.error("Get product error:", error);
        res.status(500).json({ error: "Failed to fetch product" });
    }
});

//  POST /api/products
//  Create new product
router.post("/", (req, res) => {
    try {
        const {
            name,
            colorway,
            description,
            price,
            brandId,
            brandName,
            modelId,
            modelName,
            modelShortName,
            sizes,
            imageFileId,
            imageFileIds,
        } = req.body;

        // Validate required fields
        if (!name || !price) {
            return res
                .status(400)
                .json({ error: "Name and price are required" });
        }

        // Resolve brand
        let resolvedBrandId = brandId;
        if (!resolvedBrandId && brandName) {
            const brand = brandsQuery.findOrCreate(brandName);
            resolvedBrandId = brand.id;
        }

        if (!resolvedBrandId) {
            return res.status(400).json({ error: "Brand is required" });
        }

        // Resolve model
        let resolvedModelId = modelId || null;
        if (!resolvedModelId && modelName) {
            const model = brandsQuery.findOrCreateModel(
                resolvedBrandId,
                modelName,
                modelShortName || null,
            );
            resolvedModelId = model.id;
        }

        // Validate sizes
        if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
            return res
                .status(400)
                .json({ error: "At least one size is required" });
        }

        const normalizedImageIds = Array.isArray(imageFileIds)
            ? imageFileIds
            : typeof imageFileIds === "string" && imageFileIds
              ? [imageFileIds]
              : imageFileId
                ? [imageFileId]
                : [];

        const cleanedImageIds = normalizedImageIds.filter(Boolean);

        const productId = productsQuery.create({
            brandId: resolvedBrandId,
            modelId: resolvedModelId,
            name,
            colorway: colorway || null,
            description: description || null,
            price: parseFloat(price),
            sizes,
        });

        if (cleanedImageIds.length > 0) {
            cleanedImageIds.forEach((fileId, index) => {
                productsQuery.addImage(productId, fileId, index === 0);
            });
        }

        const product = productsQuery.findById(productId);
        product.sizes = productsQuery.getSizes(productId);
        product.image = productsQuery.getImage(productId);

        res.status(201).json(product);
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ error: "Failed to create product" });
    }
});

//  PUT /api/products/:id
//  Update product
router.put("/:id", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = productsQuery.findById(id);

        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }

        const {
            name,
            colorway,
            description,
            price,
            inStock,
            isFeatured,
            sizes,
            imageFileId,
            imageFileIds,
        } = req.body;

        // Update basic fields
        productsQuery.update(id, {
            name,
            colorway,
            description,
            price: price !== undefined ? parseFloat(price) : undefined,
            inStock,
            isFeatured,
        });

        // Update sizes if provided
        if (sizes && Array.isArray(sizes)) {
            // Remove existing sizes and re-add
            const db = getDb();
            db.prepare("DELETE FROM product_sizes WHERE product_id = ?").run(
                id,
            );
            productsQuery.addSizes(id, sizes);
        }

        const hasImageUpdate =
            Array.isArray(imageFileIds) ||
            (typeof imageFileIds === "string" && imageFileIds) ||
            (typeof imageFileId === "string" && imageFileId);

        if (hasImageUpdate) {
            const normalizedImageIds = Array.isArray(imageFileIds)
                ? imageFileIds
                : typeof imageFileIds === "string" && imageFileIds
                  ? [imageFileIds]
                  : imageFileId
                    ? [imageFileId]
                    : [];

            const cleanedImageIds = normalizedImageIds.filter(Boolean);
            const db = getDb();
            db.prepare("DELETE FROM product_images WHERE product_id = ?").run(
                id,
            );

            cleanedImageIds.forEach((fileId, index) => {
                productsQuery.addImage(id, fileId, index === 0);
            });
        }

        // Return updated product
        const product = productsQuery.findById(id);
        product.sizes = productsQuery.getSizes(id);
        product.image = productsQuery.getImage(id);

        res.json(product);
    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ error: "Failed to update product" });
    }
});

//  DELETE /api/products/:id
router.delete("/:id", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = productsQuery.findById(id);

        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }

        productsQuery.delete(id);
        res.json({ success: true, message: `Product #${id} deleted` });
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ error: "Failed to delete product" });
    }
});

//  PUT /api/products/:id/stock
//  Toggle product visibility
router.put("/:id/stock", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        productsQuery.toggleStock(id);
        const product = productsQuery.findById(id);
        res.json({ success: true, in_stock: product.in_stock });
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle stock" });
    }
});

//  PUT /api/products/:id/sizes/:size/stock
//  Update specific size stock
router.put("/:id/sizes/:size/stock", (req, res) => {
    try {
        const { id, size } = req.params;
        const { quantity } = req.body;

        productsQuery.setSizeStock(parseInt(id), size, parseInt(quantity));

        res.json({
            success: true,
            stock: productsQuery.getSizeStock(parseInt(id), size),
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to update size stock" });
    }
});

module.exports = router;
