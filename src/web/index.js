const { validateConfig } = require("../config");
const { initializeSchema } = require("../db");
const { startWebServer } = require("./server");

try {
    validateConfig();
    initializeSchema();
    startWebServer();
} catch (error) {
    console.error("❌ Failed to start web server:", error.message);
    process.exit(1);
}
