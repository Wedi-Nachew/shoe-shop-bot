const fs = require("fs");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || "../data/shop.db";

console.log("Resetting database...");

try {
    // Delete database file if it exists
    const files = [DB_PATH, `${DB_PATH}-shm`, `${DB_PATH}-wal`];

    files.forEach((file) => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`Deleted ${file}`);
        }
    });

    console.log("Database reset complete.");
    console.log(
        "Run 'npm run init-db' to initialize the database with schema and sample data.",
    );
    console.log(
        "Run 'npm run seed-db' to populate the database with additional sample data.",
    );
} catch (error) {
    console.error("Error occurred while resetting database:", error);
    process.exit(1);
}
