const fs = require('fs');
const path = require('path');
const { initializeSchema, getStats, close } = require('../src/db/index');
const brands = require('../src/db/queries/brands');
const products = require('../src/db/queries/products');
const { BRAND_EMOJIS } = require('../src/config/constants');

const IMPORT_FILE = process.argv[2] || path.join(__dirname, '..', 'data', 'products_import.json');

console.log('📥 Import Tool');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
    initializeSchema();

    // Check import file exists
    if (!fs.existsSync(IMPORT_FILE)) {
        console.error(`❌ Import file not found: ${IMPORT_FILE}`);
        console.log('\nCreate a products_import.json file in the data/ folder.');
        console.log('Format:');
        console.log(JSON.stringify([
            {
                name: "Product Name",
                colorway: "Color",
                brand: "Brand Name",
                model: "Model Name (optional)",
                model_short: "Short (optional)",
                price: 5000,
                sizes: [
                    { size: "40", inStock: 3 },
                    { size: "41", inStock: 5 },
                    { size: "42", inStock: 2 }
                ],
                image_file_id: "telegram_file_id (optional)",
                description: "Optional description"
            }
        ], null, 2));
        console.log('\nNote: sizes can also be simple strings like ["40", "41", "42"]');
        console.log('which will default to inStock: 1 each.');
        process.exit(1);
    }

    // Read import file
    const rawData = fs.readFileSync(IMPORT_FILE, 'utf8');
    let importData;

    try {
        importData = JSON.parse(rawData);
    } catch (e) {
        console.error('❌ Invalid JSON in import file:', e.message);
        process.exit(1);
    }

    if (!Array.isArray(importData)) {
        console.error('❌ Import file must contain a JSON array');
        process.exit(1);
    }

    console.log(`📦 Found ${importData.length} products to import\n`);

    const statsBefore = getStats();

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let totalUnits = 0;

    for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        const lineNum = i + 1;

        try {
            // Validate required fields
            if (!item.name) {
                console.log(`   ⚠️  [${lineNum}] Skipped: Missing name`);
                skipped++;
                continue;
            }

            if (!item.price || isNaN(item.price)) {
                console.log(`   ⚠️  [${lineNum}] Skipped: Invalid price for "${item.name}"`);
                skipped++;
                continue;
            }

            if (!item.brand) {
                console.log(`   ⚠️  [${lineNum}] Skipped: Missing brand for "${item.name}"`);
                skipped++;
                continue;
            }

            if (!item.sizes || !Array.isArray(item.sizes) || item.sizes.length === 0) {
                console.log(`   ⚠️  [${lineNum}] Skipped: No sizes for "${item.name}"`);
                skipped++;
                continue;
            }

            // Find or create brand
            const emoji = BRAND_EMOJIS ? (BRAND_EMOJIS[item.brand] || BRAND_EMOJIS['Default']) : '👟';
            const brand = brands.findOrCreate(item.brand, emoji);

            // Find or create model (if provided)
            let model = null;
            if (item.model) {
                model = brands.findOrCreateModel(
                    brand.id,
                    item.model,
                    item.model_short || null
                );
            }

            // Normalize sizes to object format
            const normalizedSizes = item.sizes.map(s => {
                if (typeof s === 'object' && s !== null) {
                    return {
                        size: s.size.toString(),
                        inStock: s.inStock !== undefined ? s.inStock : 1
                    };
                }
                // Simple string → default quantity 1
                return { size: s.toString(), inStock: 1 };
            });

            // Calculate units for this product
            const units = normalizedSizes.reduce((sum, s) => sum + s.inStock, 0);
            totalUnits += units;

            // Create product
            const productId = products.create({
                brandId: brand.id,
                modelId: model?.id || null,
                name: item.name,
                nameAmharic: item.name_amharic || null,
                colorway: item.colorway || null,
                description: item.description || null,
                price: parseFloat(item.price),
                sizes: normalizedSizes,
                imageFileId: item.image_file_id || null,
                isFeatured: item.is_featured ? 1 : 0
            });

            imported++;
            console.log(`   ✅ [${lineNum}] ${item.name} — ${item.colorway || 'N/A'} (ID: ${productId}, ${units} units)`);

        } catch (error) {
            errors++;
            console.log(`   ❌ [${lineNum}] Error importing "${item.name}": ${error.message}`);
        }
    }

    // Summary
    const statsAfter = getStats();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Import Summary:');
    console.log(`   ✅ Imported:    ${imported}`);
    console.log(`   ⚠️  Skipped:     ${skipped}`);
    console.log(`   ❌ Errors:      ${errors}`);
    console.log(`   📦 Total Units: ${totalUnits}`);
    console.log('');
    console.log('📊 Database Now:');
    console.log(`   Brands:   ${statsBefore.brands} → ${statsAfter.brands}`);
    console.log(`   Models:   ${statsBefore.models} → ${statsAfter.models}`);
    console.log(`   Products: ${statsBefore.products} → ${statsAfter.products}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

} catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
} finally {
    close();
}
