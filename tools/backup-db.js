const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/shop.db");
const BACKUP_DIR = path.join(__dirname, "..", "data", "backups");

console.log("Starting backup process...");

try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
        console.error("Database file not found at:", DB_PATH);
        process.exit(1);
    }

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Create backup file name with timestamp
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19);
    const backupFileName = `shop_backup_${timestamp}.db`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    // Copy database file to backup location
    fs.copyFileSync(DB_PATH, backupFilePath);

    // Get file size
    const stats = fs.statSync(backupFilePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(
        `Backup created successfully: ${backupFileName} (${sizeMB} MB)`,
    );
    console.log("   Location:", backupFilePath);

    // List existing backups
    const backups = fs
        .readdirSync(BACKUP_DIR)
        .filter(
            (file) => file.startsWith("shop_backup_") && file.endsWith(".db"),
        )
        .sort()
        .reverse();

    console.log("\n📁 Total backups:", backups.length);

    // Keep only the 5 most recent backups
    if (backups.length > 5) {
        const oldBackups = backups.slice(5);
        oldBackups.forEach((oldBackup) => {
            const oldBackupPath = path.join(BACKUP_DIR, oldBackup);
            fs.unlinkSync(oldBackupPath);
            console.log(`🗑️ Deleted old backup: ${oldBackup}`);
        });
    }
} catch (error) {
    console.error("Error occurred while creating backup:", error);
    process.exit(1);
}
