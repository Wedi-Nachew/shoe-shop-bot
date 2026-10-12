const express = require("express");
const ordersQuery = require("../../db/queries/orders");
const bot = require("../../bot/instance");
const { ORDER_STATUS_LABELS } = require("../../config/constants");
const { formatPrice } = require("../../utils/formmaters");

const router = express.Router();

//  GET /api/orders
router.get("/", (req, res) => {
    try {
        const { status, page = 0, limit = 50 } = req.query;
        const offset = parseInt(page) * parseInt(limit);

        const orders = ordersQuery.getAll(
            status || null,
            parseInt(limit),
            offset,
        );

        const statusCounts = ordersQuery.countByStatus();

        res.json({ orders, statusCounts });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

//  GET /api/orders/:id
router.get("/:id", (req, res) => {
    try {
        const order = ordersQuery.getWithItems(parseInt(req.params.id));
        if (!order) return res.status(404).json({ error: "Order not found" });

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch order" });
    }
});

//  PUT /api/orders/:id/status
router.put("/:id/status", async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        const validStatuses = Object.keys(ORDER_STATUS_LABELS);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const result = ordersQuery.updateStatus(orderId, status);

        if (!result.changed) {
            return res.json({ success: true, message: "Status unchanged" });
        }

        // Notify customer
        const order = ordersQuery.getById(orderId);
        if (order) {
            const statusLabel = ORDER_STATUS_LABELS[status];
            let message = "";

            switch (status) {
                case "confirmed":
                    message = `✅ Your <b>Order #${orderId}</b> has been confirmed!\nWe'll prepare it for delivery. 🚚`;
                    break;
                case "shipped":
                    message = `🚚 Your <b>Order #${orderId}</b> has been shipped!\nIt should arrive soon. 📦`;
                    break;
                case "delivered":
                    message = `📦 Your <b>Order #${orderId}</b> has been delivered!\nThank you for shopping with us! 🙏`;
                    break;
                case "cancelled":
                    message = `❌ Your <b>Order #${orderId}</b> has been cancelled.\nIf you have questions, contact us via the bot.`;
                    break;
                default:
                    message = `📦 Your <b>Order #${orderId}</b> status updated to: ${statusLabel}`;
            }

            try {
                await bot.telegram.sendMessage(order.user_id, message, {
                    parse_mode: "HTML",
                });
            } catch (err) {
                console.error("Failed to notify customer:", err.message);
            }
        }

        res.json({
            success: true,
            oldStatus: result.oldStatus,
            newStatus: result.newStatus,
        });
    } catch (error) {
        console.error("Update status error:", error);
        res.status(500).json({
            error: error.message || "Failed to update status",
        });
    }
});

module.exports = router;
