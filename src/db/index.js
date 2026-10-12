const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

let db = null;

const getDb = () => {
    if (db) return db;

    // Load config manually to avoid circular dependency
    require("dotenv").config();
    const DB_PATH = process.env.DB_PATH || "./data/shop.db";

    // Ensure the directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create database connection
    db = new Database(DB_PATH);

    // Optimizations
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    return db;
};

const initializeSchema = () => {
    const db = getDb();
    const schemaPath = path.join(__dirname, "schema.sql");

    if (!fs.existsSync(schemaPath)) {
        console.error("Schema file not found:", schemaPath);
        process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);

    console.log("Database initialized successfully.");
    return db;
};

const getStats = () => {
    const db = getDb();

    return {
        brands: db.prepare("SELECT COUNT(*) AS count FROM brands").get().count,
        models: db.prepare("SELECT COUNT(*) AS count FROM models").get().count,
        products: db.prepare("SELECT COUNT(*) AS count FROM products").get()
            .count,
        productsInStock: db
            .prepare(
                "SELECT COUNT(*) AS count FROM products WHERE in_stock > 0",
            )
            .get().count,
        orders: db.prepare("SELECT COUNT(*) AS count FROM orders").get().count,
        cartItems: db.prepare("SELECT COUNT(*) AS count FROM cart").get().count,
    };
};

const close = () => {
    if (db) {
        db.close();
        db = null;
        console.log("Database connection closed.");
    }
};

// Cleanup on process exit
process.on("exit", close);
process.on("SIGINT", () => {
    close();
    process.exit(0);
});
process.on("SIGTERM", () => {
    close();
    process.exit(0);
});

module.exports = {
    getDb,
    initializeSchema,
    getStats,
    close,
};
