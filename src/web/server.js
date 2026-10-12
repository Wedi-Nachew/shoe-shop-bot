const express = require("express");
const cors = require("cors");
const path = require("path");
const { config } = require("../config");

const app = express();

// Middleware
app.use(
    cors({
        origin: config.web.isProduction
            ? [
                  config.web.url,
                  `https://${config.web.url?.replace("https://", "")}`,
              ].filter(Boolean)
            : "*",
        credentials: true,
    }),
);
app.use(express.json());

// Auth middleware
const { telegramAuth } = require("./middleware/auth");
const { timeStamp } = require("console");

// API Routes (all protected)
app.use("/api/upload", telegramAuth, require("./routes/upload"));
app.use("/api/products", telegramAuth, require("./routes/products"));
app.use("/api/brands", telegramAuth, require("./routes/brands"));
app.use("/api/orders", telegramAuth, require("./routes/orders"));
app.use("/api/stats", telegramAuth, require("./routes/stats"));

// Image proxy (no auth — images need to load in img tags)
app.use("/api/images", require("./routes/images"));

// Auth verification endpoint
app.post("/api/auth/verify", telegramAuth, (req, res) => {
    res.json({ success: true, user: req.telegramUser });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", timeStamp: new Date().toISOString() });
});

// Serve React dashboard in production
const dashboardPath = path.join(__dirname, "../../dashboard/dist");
app.use("/admin", express.static(dashboardPath));
// Express 5 requires named wildcards; regex keeps SPA fallback simple.
app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
    res.sendFile(path.join(dashboardPath, "index.html"));
});

// app.get("/admin/*", (req, res) => {
//     const indexPath = path.join(dashboardPath, "index.html");
//     const fs = require("fs");
//     if (fs.existsSync(indexPath)) {
//         res.sendFile(indexPath);
//     } else {
//         res.status(404).send(
//             "Dashboard not built. Run: npm run build:dashboard",
//         );
//     }
// });

const startWebServer = () => {
    const port = config.web.port;
    app.listen(port, () => {
        console.log(`🌐 Web dashboard: http://localhost:${port}/admin`);
        console.log(`📡 API server: http://localhost:${port}/api`);
    });
};

module.exports = { app, startWebServer };
