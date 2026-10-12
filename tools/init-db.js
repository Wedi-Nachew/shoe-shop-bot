const { initializeSchema, getStats, close } = require("../src/db/index");

console.log("Initializing database schema...");
try {
    initializeSchema();

    const dbStats = getStats();
    console.log("\n📊 Database status:");
    console.log(`   Brands:   ${dbStats.brands}`);
    console.log(`   Models:   ${dbStats.models}`);
    console.log(`   Products: ${dbStats.products}`);
    console.log(`   Orders:   ${dbStats.orders}`);
    console.log("\n✅ Database ready!");
} catch (error) {
    console.error("❌ Failed to initialize database:", error.message);
    process.exit(1);
} finally {
    close();
}
