const { initializeSchema, getDb, getStats, close } = require("../src/db/index");
const brands = require("../src/db/queries/brands");
const products = require("../src/db/queries/products");

console.log("🌱 Seeding database with sample data...\n");

try {
    initializeSchema();
    const db = getDb();

    // Check if data already exists
    const existing = getStats();
    if (existing.products > 0) {
        console.log(`⚠️  Database already has ${existing.products} products.`);
        console.log("   To reseed, delete data/shop.db and run again.");
        console.log("   Or run: npm run db:init && npm run db:seed");
        process.exit(0);
    }

    // ==========================================
    // Create Brands
    // ==========================================
    console.log("📦 Creating brands...");

    const brandData = [
        { name: "Jordan", emoji: "🏀", sortOrder: 1 },
        { name: "Nike", emoji: "✔️", sortOrder: 2 },
        { name: "Adidas", emoji: "👟", sortOrder: 3 },
        { name: "New Balance", emoji: "🔵", sortOrder: 4 },
        { name: "Puma", emoji: "🐆", sortOrder: 5 },
        { name: "Reebok", emoji: "🔷", sortOrder: 6 },
        { name: "Timberland", emoji: "👢", sortOrder: 7 },
    ];

    const brandMap = {};
    for (const b of brandData) {
        const brand = brands.findOrCreate(b.name, b.emoji);
        brandMap[b.name] = brand.id;
        console.log(`   ✅ ${b.emoji} ${b.name} (ID: ${brand.id})`);
    }

    // ==========================================
    // Create Models
    // ==========================================
    console.log("\n📦 Creating models...");

    const modelData = [
        { brand: "Jordan", name: "Jordan 1", shortName: "J1" },
        { brand: "Jordan", name: "Jordan 4", shortName: "J4" },
        { brand: "Jordan", name: "Jordan 5", shortName: "J5" },
        { brand: "Jordan", name: "Jordan 11", shortName: "J11" },
        { brand: "Jordan", name: "Jordan 13", shortName: "J13" },
        { brand: "Nike", name: "Air Max 90", shortName: "AM90" },
        { brand: "Nike", name: "Air Max 97", shortName: "AM97" },
        { brand: "Nike", name: "Air Force 1", shortName: "AF1" },
        { brand: "Nike", name: "Dunk Low", shortName: "Dunk" },
        { brand: "Adidas", name: "Yeezy 350", shortName: "Y350" },
        { brand: "Adidas", name: "Yeezy 500", shortName: "Y500" },
        { brand: "Adidas", name: "Ultraboost", shortName: "UB" },
        { brand: "New Balance", name: "NB 550", shortName: "550" },
        { brand: "New Balance", name: "NB 2002R", shortName: "2002R" },
        { brand: "Reebok", name: "Club C 85", shortName: "Club C 85" },
        {
            brand: "Reebok",
            name: "Classic Leather",
            shortName: "Classic Leather",
        },
        { brand: "Timberland", name: "6-Inch Boot", shortName: "6-Inch Boot" },
        {
            brand: "Timberland",
            name: "Earthkeepers",
            shortName: "Earthkeepers",
        },
    ];

    const modelMap = {};
    for (const m of modelData) {
        const model = brands.findOrCreateModel(
            brandMap[m.brand],
            m.name,
            m.shortName,
        );
        modelMap[m.name] = model.id;
        console.log(`   ✅ ${m.brand} → ${m.name} (${m.shortName})`);
    }

    // ==========================================
    // Create Products
    // ==========================================
    console.log("\n📦 Creating products...");

    const productData = [
        // Jordan 1s
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 1"],
            name: "Air Jordan 1 Retro High OG",
            colorway: "University Blue",
            price: 8500,
            sizes: ["40", "41", "42", "43", "44"],
        },
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 1"],
            name: "Air Jordan 1 Retro High OG",
            colorway: "Bred Toe",
            price: 9200,
            sizes: ["39", "40", "41", "42", "43", "44", "45"],
        },
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 1"],
            name: "Air Jordan 1 Low",
            colorway: "Travis Scott Reverse Mocha",
            price: 15000,
            sizes: ["40", "41", "42", "43"],
        },

        // Jordan 4s
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 4"],
            name: "Air Jordan 4 Retro",
            colorway: "Military Black",
            price: 8500,
            sizes: ["40", "41", "42", "43", "44"],
        },
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 4"],
            name: "Air Jordan 4 Retro",
            colorway: "Bred",
            price: 12000,
            sizes: ["41", "42", "43", "44", "45"],
        },
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 4"],
            name: "Air Jordan 4 Retro",
            colorway: "University Blue",
            price: 11500,
            sizes: ["40", "42", "43"],
        },

        // Jordan 11s
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 11"],
            name: "Air Jordan 11 Retro",
            colorway: "Cool Grey",
            price: 13000,
            sizes: ["40", "41", "42", "43", "44"],
        },

        // Nike Air Max
        {
            brandId: brandMap["Nike"],
            modelId: modelMap["Air Max 90"],
            name: "Nike Air Max 90",
            colorway: "White/Black",
            price: 6200,
            sizes: ["39", "40", "41", "42", "43", "44"],
        },
        {
            brandId: brandMap["Nike"],
            modelId: modelMap["Air Max 90"],
            name: "Nike Air Max 90",
            colorway: "Infrared",
            price: 6800,
            sizes: ["40", "41", "42", "43"],
        },

        // Nike Air Force 1
        {
            brandId: brandMap["Nike"],
            modelId: modelMap["Air Force 1"],
            name: "Nike Air Force 1 Low",
            colorway: "Triple White",
            price: 5500,
            sizes: ["38", "39", "40", "41", "42", "43", "44", "45"],
        },
        {
            brandId: brandMap["Nike"],
            modelId: modelMap["Air Force 1"],
            name: "Nike Air Force 1 Low",
            colorway: "Triple Black",
            price: 5500,
            sizes: ["39", "40", "41", "42", "43", "44"],
        },

        // Nike Dunk
        {
            brandId: brandMap["Nike"],
            modelId: modelMap["Dunk Low"],
            name: "Nike Dunk Low",
            colorway: "Panda",
            price: 7500,
            sizes: ["39", "40", "41", "42", "43", "44"],
        },

        // Adidas Yeezy
        {
            brandId: brandMap["Adidas"],
            modelId: modelMap["Yeezy 350"],
            name: "Yeezy Boost 350 V2",
            colorway: "Zebra",
            price: 14000,
            sizes: ["40", "41", "42", "43", "44"],
        },
        {
            brandId: brandMap["Adidas"],
            modelId: modelMap["Yeezy 350"],
            name: "Yeezy Boost 350 V2",
            colorway: "Beluga",
            price: 15500,
            sizes: ["41", "42", "43"],
        },

        // Adidas Ultraboost
        {
            brandId: brandMap["Adidas"],
            modelId: modelMap["Ultraboost"],
            name: "Adidas Ultraboost 22",
            colorway: "Core Black",
            price: 8900,
            sizes: ["39", "40", "41", "42", "43", "44"],
        },

        // New Balance
        {
            brandId: brandMap["New Balance"],
            modelId: modelMap["NB 550"],
            name: "New Balance 550",
            colorway: "White/Green",
            price: 7200,
            sizes: ["40", "41", "42", "43", "44"],
        },
        {
            brandId: brandMap["New Balance"],
            modelId: modelMap["NB 2002R"],
            name: "New Balance 2002R",
            colorway: "Protection Pack Rain Cloud",
            price: 9800,
            sizes: ["40", "41", "42", "43"],
        },

        // Puma (no model, direct brand)
        {
            brandId: brandMap["Puma"],
            modelId: null,
            name: "Puma Suede Classic",
            colorway: "Black/White",
            price: 4500,
            sizes: ["39", "40", "41", "42", "43", "44"],
        },
        {
            brandId: brandMap["Puma"],
            modelId: null,
            name: "Puma RS-X",
            colorway: "Reinvention",
            price: 5800,
            sizes: ["40", "41", "42", "43"],
        },

        {
            brandId: brandMap["Reebok"],
            modelId: modelMap["Club C 85"],
            name: "Reebok Club C 85 Vintage",
            colorway: "White/Green",
            price: 5000,
            sizes: ["39", "40", "41", "42", "43", "44"],
        },

        {
            brandId: brandMap["Reebok"],
            modelId: modelMap["Classic Leather"],
            name: "Reebok Classic Leather",
            colorway: "White/Red",
            price: 4800,
            sizes: ["39", "40", "41", "42", "43"],
        },
        {
            brandId: brandMap["Timberland"],
            modelId: modelMap["6-Inch Boot"],
            name: "Timberland 6-Inch Premium Boot",
            colorway: "Wheat",
            price: 12000,
            sizes: ["40", "41", "42", "43", "44"],
        },
        {
            brandId: brandMap["Timberland"],
            modelId: modelMap["Earthkeepers"],
            name: "Timberland Earthkeepers",
            colorway: "Dark Brown",
            price: 11000,
            sizes: ["40", "41", "42", "43"],
        },

        // Some featured expensive ones
        {
            brandId: brandMap["Jordan"],
            modelId: modelMap["Jordan 5"],
            name: "Air Jordan 5 Retro",
            colorway: "Off-White Sail",
            price: 18000,
            sizes: ["41", "42", "43", "44"],
            isFeatured: 1,
        },
    ];

    for (const p of productData) {
        // Convert array of string sizes to array of objects with an initial stock
        const originalSizes = p.sizes;
        p.sizes = originalSizes.map((size) => ({ size: size, inStock: 10 })); // default to 10 stock per size

        const productId = products.create(p);
        console.log(
            `   ✅ ${p.name} — ${p.colorway} (ID: ${productId}, ${p.sizes.length} sizes)`,
        );
    }

    // ==========================================
    // Summary
    // ==========================================
    const finalStats = getStats();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 Seed complete!");
    console.log(`   Brands:   ${finalStats.brands}`);
    console.log(`   Models:   ${finalStats.models}`);
    console.log(`   Products: ${finalStats.products}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
} catch (error) {
    console.error("❌ Seeding failed:", error.message);
    console.error(error.stack);
    process.exit(1);
} finally {
    close();
}
