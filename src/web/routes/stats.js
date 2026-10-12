const express = require("express");
const statsQuery = require("../../db/queries/stats");
const { getStats } = require("../../db");

const router = express.Router();

//  GET /api/stats
router.get("/", (req, res) => {
    try {
        const { days = 30 } = req.query;
        const d = parseInt(days);

        const sales = statsQuery.getSalesStats(d);
        const inventory = statsQuery.getInventoryStats();
        const stockLevels = statsQuery.getStockLevels();
        const dailyRevenue = statsQuery.getDailyRevenue(d);
        const topProducts = statsQuery.getTopProducts(5, d);
        const popularSizes = statsQuery.getPopularSizes(d);
        const lowStock = statsQuery.getLowStock(3);
        const dbStats = getStats();

        res.json({
            sales,
            inventory,
            stockLevels,
            dailyRevenue,
            topProducts,
            popularSizes,
            lowStock,
            database: dbStats,
        });
    } catch (error) {
        console.error("Stats error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

module.exports = router;
