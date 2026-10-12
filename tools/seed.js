const { initializeSchema, getDb, getStats, close } = require('../src/db/index');
const brands = require('../src/db/queries/brands');
const products = require('../src/db/queries/products');

console.log('🌱 Seeding database with sample data...\n');

try {
    initializeSchema();
    const db = getDb();

    // Check if data already exists
    const existing = getStats();
    if (existing.products > 0) {
        console.log(`⚠️  Database already has ${existing.products} products.`);
        console.log('   To reseed, run: npm run db:reset && npm run db:init && npm run db:seed');
        process.exit(0);
    }

    // ==========================================
    // Create Brands
    // ==========================================
    console.log('📦 Creating brands...');

    const brandData = [
        { name: 'Jordan', emoji: '🏀', sortOrder: 1 },
        { name: 'Nike', emoji: '✔️', sortOrder: 2 },
        { name: 'Adidas', emoji: '👟', sortOrder: 3 },
        { name: 'New Balance', emoji: '🔵', sortOrder: 4 },
        { name: 'Puma', emoji: '🐆', sortOrder: 5 }
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
    console.log('\n📦 Creating models...');

    const modelData = [
        { brand: 'Jordan', name: 'Jordan 1', shortName: 'J1' },
        { brand: 'Jordan', name: 'Jordan 4', shortName: 'J4' },
        { brand: 'Jordan', name: 'Jordan 5', shortName: 'J5' },
        { brand: 'Jordan', name: 'Jordan 11', shortName: 'J11' },
        { brand: 'Jordan', name: 'Jordan 13', shortName: 'J13' },
        { brand: 'Nike', name: 'Air Max 90', shortName: 'AM90' },
        { brand: 'Nike', name: 'Air Max 97', shortName: 'AM97' },
        { brand: 'Nike', name: 'Air Force 1', shortName: 'AF1' },
        { brand: 'Nike', name: 'Dunk Low', shortName: 'Dunk' },
        { brand: 'Adidas', name: 'Yeezy 350', shortName: 'Y350' },
        { brand: 'Adidas', name: 'Yeezy 500', shortName: 'Y500' },
        { brand: 'Adidas', name: 'Ultraboost', shortName: 'UB' },
        { brand: 'New Balance', name: 'NB 550', shortName: '550' },
        { brand: 'New Balance', name: 'NB 2002R', shortName: '2002R' }
    ];

    const modelMap = {};
    for (const m of modelData) {
        const model = brands.findOrCreateModel(brandMap[m.brand], m.name, m.shortName);
        modelMap[m.name] = model.id;
        console.log(`   ✅ ${m.brand} → ${m.name} (${m.shortName})`);
    }

    // ==========================================
    // Create Products (with stock quantities)
    // ==========================================
    console.log('\n📦 Creating products...');

    const productData = [
        // Jordan 1s
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 1'],
            name: 'Air Jordan 1 Retro High OG',
            colorway: 'University Blue',
            price: 8500,
            sizes: [
                { size: '40', inStock: 2 },
                { size: '41', inStock: 3 },
                { size: '42', inStock: 5 },
                { size: '43', inStock: 3 },
                { size: '44', inStock: 1 }
            ]
        },
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 1'],
            name: 'Air Jordan 1 Retro High OG',
            colorway: 'Bred Toe',
            price: 9200,
            sizes: [
                { size: '39', inStock: 1 },
                { size: '40', inStock: 2 },
                { size: '41', inStock: 4 },
                { size: '42', inStock: 6 },
                { size: '43', inStock: 4 },
                { size: '44', inStock: 2 },
                { size: '45', inStock: 1 }
            ]
        },
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 1'],
            name: 'Air Jordan 1 Low',
            colorway: 'Travis Scott Reverse Mocha',
            price: 15000,
            sizes: [
                { size: '40', inStock: 1 },
                { size: '41', inStock: 2 },
                { size: '42', inStock: 2 },
                { size: '43', inStock: 1 }
            ]
        },

        // Jordan 4s
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 4'],
            name: 'Air Jordan 4 Retro',
            colorway: 'Military Black',
            price: 8500,
            sizes: [
                { size: '40', inStock: 3 },
                { size: '41', inStock: 5 },
                { size: '42', inStock: 7 },
                { size: '43', inStock: 4 },
                { size: '44', inStock: 2 }
            ]
        },
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 4'],
            name: 'Air Jordan 4 Retro',
            colorway: 'Bred',
            price: 12000,
            sizes: [
                { size: '41', inStock: 2 },
                { size: '42', inStock: 3 },
                { size: '43', inStock: 3 },
                { size: '44', inStock: 1 },
                { size: '45', inStock: 1 }
            ]
        },
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 4'],
            name: 'Air Jordan 4 Retro',
            colorway: 'University Blue',
            price: 11500,
            sizes: [
                { size: '40', inStock: 1 },
                { size: '42', inStock: 2 },
                { size: '43', inStock: 1 }
            ]
        },

        // Jordan 11s
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 11'],
            name: 'Air Jordan 11 Retro',
            colorway: 'Cool Grey',
            price: 13000,
            sizes: [
                { size: '40', inStock: 2 },
                { size: '41', inStock: 3 },
                { size: '42', inStock: 4 },
                { size: '43', inStock: 3 },
                { size: '44', inStock: 2 }
            ]
        },

        // Nike Air Max
        {
            brandId: brandMap['Nike'],
            modelId: modelMap['Air Max 90'],
            name: 'Nike Air Max 90',
            colorway: 'White/Black',
            price: 6200,
            sizes: [
                { size: '39', inStock: 2 },
                { size: '40', inStock: 4 },
                { size: '41', inStock: 5 },
                { size: '42', inStock: 6 },
                { size: '43', inStock: 3 },
                { size: '44', inStock: 2 }
            ]
        },
        {
            brandId: brandMap['Nike'],
            modelId: modelMap['Air Max 90'],
            name: 'Nike Air Max 90',
            colorway: 'Infrared',
            price: 6800,
            sizes: [
                { size: '40', inStock: 3 },
                { size: '41', inStock: 4 },
                { size: '42', inStock: 5 },
                { size: '43', inStock: 2 }
            ]
        },

        // Nike Air Force 1
        {
            brandId: brandMap['Nike'],
            modelId: modelMap['Air Force 1'],
            name: 'Nike Air Force 1 Low',
            colorway: 'Triple White',
            price: 5500,
            sizes: [
                { size: '38', inStock: 3 },
                { size: '39', inStock: 5 },
                { size: '40', inStock: 8 },
                { size: '41', inStock: 10 },
                { size: '42', inStock: 10 },
                { size: '43', inStock: 7 },
                { size: '44', inStock: 4 },
                { size: '45', inStock: 2 }
            ]
        },
        {
            brandId: brandMap['Nike'],
            modelId: modelMap['Air Force 1'],
            name: 'Nike Air Force 1 Low',
            colorway: 'Triple Black',
            price: 5500,
            sizes: [
                { size: '39', inStock: 3 },
                { size: '40', inStock: 5 },
                { size: '41', inStock: 6 },
                { size: '42', inStock: 7 },
                { size: '43', inStock: 4 },
                { size: '44', inStock: 2 }
            ]
        },

        // Nike Dunk
        {
            brandId: brandMap['Nike'],
            modelId: modelMap['Dunk Low'],
            name: 'Nike Dunk Low',
            colorway: 'Panda',
            price: 7500,
            sizes: [
                { size: '39', inStock: 2 },
                { size: '40', inStock: 4 },
                { size: '41', inStock: 5 },
                { size: '42', inStock: 6 },
                { size: '43', inStock: 3 },
                { size: '44', inStock: 2 }
            ]
        },

        // Adidas Yeezy
        {
            brandId: brandMap['Adidas'],
            modelId: modelMap['Yeezy 350'],
            name: 'Yeezy Boost 350 V2',
            colorway: 'Zebra',
            price: 14000,
            sizes: [
                { size: '40', inStock: 1 },
                { size: '41', inStock: 2 },
                { size: '42', inStock: 3 },
                { size: '43', inStock: 2 },
                { size: '44', inStock: 1 }
            ]
        },
        {
            brandId: brandMap['Adidas'],
            modelId: modelMap['Yeezy 350'],
            name: 'Yeezy Boost 350 V2',
            colorway: 'Beluga',
            price: 15500,
            sizes: [
                { size: '41', inStock: 1 },
                { size: '42', inStock: 2 },
                { size: '43', inStock: 1 }
            ]
        },

        // Adidas Ultraboost
        {
            brandId: brandMap['Adidas'],
            modelId: modelMap['Ultraboost'],
            name: 'Adidas Ultraboost 22',
            colorway: 'Core Black',
            price: 8900,
            sizes: [
                { size: '39', inStock: 2 },
                { size: '40', inStock: 3 },
                { size: '41', inStock: 5 },
                { size: '42', inStock: 6 },
                { size: '43', inStock: 4 },
                { size: '44', inStock: 2 }
            ]
        },

        // New Balance
        {
            brandId: brandMap['New Balance'],
            modelId: modelMap['NB 550'],
            name: 'New Balance 550',
            colorway: 'White/Green',
            price: 7200,
            sizes: [
                { size: '40', inStock: 3 },
                { size: '41', inStock: 4 },
                { size: '42', inStock: 5 },
                { size: '43', inStock: 3 },
                { size: '44', inStock: 2 }
            ]
        },
        {
            brandId: brandMap['New Balance'],
            modelId: modelMap['NB 2002R'],
            name: 'New Balance 2002R',
            colorway: 'Protection Pack Rain Cloud',
            price: 9800,
            sizes: [
                { size: '40', inStock: 2 },
                { size: '41', inStock: 3 },
                { size: '42', inStock: 4 },
                { size: '43', inStock: 2 }
            ]
        },

        // Puma (no model)
        {
            brandId: brandMap['Puma'],
            modelId: null,
            name: 'Puma Suede Classic',
            colorway: 'Black/White',
            price: 4500,
            sizes: [
                { size: '39', inStock: 3 },
                { size: '40', inStock: 5 },
                { size: '41', inStock: 6 },
                { size: '42', inStock: 7 },
                { size: '43', inStock: 4 },
                { size: '44', inStock: 2 }
            ]
        },
        {
            brandId: brandMap['Puma'],
            modelId: null,
            name: 'Puma RS-X',
            colorway: 'Reinvention',
            price: 5800,
            sizes: [
                { size: '40', inStock: 2 },
                { size: '41', inStock: 3 },
                { size: '42', inStock: 4 },
                { size: '43', inStock: 2 }
            ]
        },

        // Featured
        {
            brandId: brandMap['Jordan'],
            modelId: modelMap['Jordan 5'],
            name: 'Air Jordan 5 Retro',
            colorway: 'Off-White Sail',
            price: 18000,
            isFeatured: 1,
            sizes: [
                { size: '41', inStock: 1 },
                { size: '42', inStock: 2 },
                { size: '43', inStock: 2 },
                { size: '44', inStock: 1 }
            ]
        }
    ];

    let totalUnits = 0;

    for (const p of productData) {
        const productId = products.create(p);
        const units = p.sizes.reduce((sum, s) => {
            const qty = typeof s === 'object' ? s.inStock : 1;
            return sum + qty;
        }, 0);
        totalUnits += units;
        console.log(`   ✅ ${p.name} — ${p.colorway} (ID: ${productId}, ${p.sizes.length} sizes, ${units} units)`);
    }

    // ==========================================
    // Summary
    // ==========================================
    const finalStats = getStats();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Seed complete!');
    console.log(`   Brands:      ${finalStats.brands}`);
    console.log(`   Models:      ${finalStats.models}`);
    console.log(`   Products:    ${finalStats.products}`);
    console.log(`   Total Units: ${totalUnits}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

} catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
} finally {
    close();
}
