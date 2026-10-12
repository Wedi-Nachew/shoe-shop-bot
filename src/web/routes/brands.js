const express = require("express");
const brandsQuery = require("../../db/queries/brands");

const router = express.Router();

//  GET /api/brands
//  List all brands with models
router.get("/", (req, res) => {
    try {
        const brands = brandsQuery.getAll();

        const enriched = brands.map((b) => ({
            ...b,
            models: brandsQuery.getModels(b.id),
        }));

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch brands" });
    }
});

//  POST /api/brands
router.post("/", (req, res) => {
    try {
        const { name, emoji } = req.body;
        if (!name) return res.status(400).json({ error: "Name required" });

        const brand = brandsQuery.findOrCreate(name, emoji || "👟");
        res.status(201).json(brand);
    } catch (error) {
        res.status(500).json({ error: "Failed to create brand" });
    }
});

//  GET /api/brands/:id/models
router.get("/:id/models", (req, res) => {
    try {
        const models = brandsQuery.getModels(parseInt(req.params.id));
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch models" });
    }
});

//  POST /api/brands/:id/models
router.post("/:id/models", (req, res) => {
    try {
        const { name, shortName } = req.body;
        if (!name) return res.status(400).json({ error: "Name required" });

        const model = brandsQuery.findOrCreateModel(
            parseInt(req.params.id),
            name,
            shortName || null,
        );
        res.status(201).json(model);
    } catch (error) {
        res.status(500).json({ error: "Failed to create model" });
    }
});

module.exports = router;
