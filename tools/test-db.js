const { initializeSchema, getStats, close } = require('../src/db/index');
const brandsQuery = require('../src/db/queries/brands');
const productsQuery = require('../src/db/queries/products');
const cartQuery = require('../src/db/queries/cart');
const ordersQuery = require('../src/db/queries/orders');
const statsQuery = require('../src/db/queries/stats');

console.log('🧪 Testing database queries...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`   ✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`   ❌ ${name}: ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

try {
    initializeSchema();

    // ==========================================
    // Brand Tests
    // ==========================================
    console.log('📦 Brand Queries:');

    test('getAll returns array', () => {
        const result = brandsQuery.getAll();
        assert(Array.isArray(result), 'Expected array');
    });

    test('findOrCreate creates new brand', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        assert(brand.id, 'Expected brand ID');
    });

    test('findOrCreate returns existing brand', () => {
        const brand1 = brandsQuery.findOrCreate('TestBrand2', '🧪');
        const brand2 = brandsQuery.findOrCreate('TestBrand2', '🧪');
        assert(brand1.id === brand2.id, 'Expected same ID');
    });

    test('findOrCreateModel works', () => {
        const brand = brandsQuery.findOrCreate('TestBrand3', '🧪');
        const model = brandsQuery.findOrCreateModel(brand.id, 'TestModel', 'TM');
        assert(model.id, 'Expected model ID');
    });

    test('getAvailableSizes returns only in-stock sizes', () => {
        const brand = brandsQuery.findOrCreate('SizeBrand', '🧪');
        productsQuery.create({
            brandId: brand.id,
            name: 'Size Test Product',
            price: 5000,
            sizes: [
                { size: '40', inStock: 3 },
                { size: '41', inStock: 0 },
                { size: '42', inStock: 5 }
            ]
        });
        const sizes = brandsQuery.getAvailableSizes(brand.id);
        const sizeValues = sizes.map(s => s.size);
        assert(sizeValues.includes('40'), 'Expected 40');
        assert(!sizeValues.includes('41'), 'Should not include 41 (out of stock)');
        assert(sizeValues.includes('42'), 'Expected 42');
    });

    // ==========================================
    // Product Tests
    // ==========================================
    console.log('\n📦 Product Queries:');

    test('create product with quantity-based sizes', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Quantity Shoe',
            colorway: 'Red',
            price: 5000,
            sizes: [
                { size: '40', inStock: 3 },
                { size: '41', inStock: 5 },
                { size: '42', inStock: 0 }
            ]
        });
        assert(productId > 0, 'Expected product ID');
    });

    test('create product with simple string sizes defaults to 1', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Simple Size Shoe',
            price: 3000,
            sizes: ['40', '41', '42']
        });
        const sizes = productsQuery.getSizes(productId);
        assert(sizes.every(s => s.in_stock === 1), 'Expected all sizes to have stock 1');
    });

    test('getAvailableSizes only returns stock > 0', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Avail Test Shoe',
            price: 4000,
            sizes: [
                { size: '39', inStock: 0 },
                { size: '40', inStock: 2 },
                { size: '41', inStock: 0 },
                { size: '42', inStock: 5 },
                { size: '43', inStock: 0 }
            ]
        });
        const available = productsQuery.getAvailableSizes(productId);
        assert(available.length === 2, `Expected 2 available sizes, got ${available.length}`);
        assert(available[0].size === '40', 'Expected 40');
        assert(available[1].size === '42', 'Expected 42');
    });

    test('getSizeStock returns correct quantity', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Stock Check Shoe',
            price: 4000,
            sizes: [{ size: '42', inStock: 7 }]
        });
        const stock = productsQuery.getSizeStock(productId, '42');
        assert(stock === 7, `Expected 7, got ${stock}`);
    });

    test('getSizeStock returns 0 for non-existent size', () => {
        const stock = productsQuery.getSizeStock(999999, '99');
        assert(stock === 0, `Expected 0, got ${stock}`);
    });

    test('decrementSizeStock reduces quantity', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Decrement Shoe',
            price: 4000,
            sizes: [{ size: '42', inStock: 5 }]
        });
        productsQuery.decrementSizeStock(productId, '42', 2);
        const stock = productsQuery.getSizeStock(productId, '42');
        assert(stock === 3, `Expected 3, got ${stock}`);
    });

    test('decrementSizeStock does not go below 0', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Floor Shoe',
            price: 4000,
            sizes: [{ size: '42', inStock: 2 }]
        });
        productsQuery.decrementSizeStock(productId, '42', 10);
        const stock = productsQuery.getSizeStock(productId, '42');
        assert(stock === 0, `Expected 0, got ${stock}`);
    });

    test('incrementSizeStock increases quantity', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Increment Shoe',
            price: 4000,
            sizes: [{ size: '42', inStock: 3 }]
        });
        productsQuery.incrementSizeStock(productId, '42', 5);
        const stock = productsQuery.getSizeStock(productId, '42');
        assert(stock === 8, `Expected 8, got ${stock}`);
    });

    test('setSizeStock sets exact quantity', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'SetStock Shoe',
            price: 4000,
            sizes: [{ size: '42', inStock: 3 }]
        });
        productsQuery.setSizeStock(productId, '42', 15);
        const stock = productsQuery.getSizeStock(productId, '42');
        assert(stock === 15, `Expected 15, got ${stock}`);
    });

    test('findById returns product with joins', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'FindById Shoe',
            price: 3000,
            sizes: ['40']
        });
        const product = productsQuery.findById(productId);
        assert(product, 'Expected product');
        assert(product.name === 'FindById Shoe', 'Expected correct name');
        assert(product.brand_name === 'TestBrand', 'Expected brand name join');
    });

    test('search finds products', () => {
        const results = productsQuery.search('Quantity Shoe');
        assert(Array.isArray(results), 'Expected array');
        assert(results.length > 0, 'Expected results');
    });

    test('search returns empty for nonsense', () => {
        const results = productsQuery.search('xyznonexistent123');
        assert(results.length === 0, 'Expected no results');
    });

    test('findByFilters with size filter respects stock > 0', () => {
        const brand = brandsQuery.findOrCreate('FilterBrand', '🧪');
        productsQuery.create({
            brandId: brand.id,
            name: 'Filter Shoe A',
            price: 5000,
            sizes: [{ size: '42', inStock: 3 }]
        });
        productsQuery.create({
            brandId: brand.id,
            name: 'Filter Shoe B',
            price: 6000,
            sizes: [{ size: '42', inStock: 0 }]
        });
        const results = productsQuery.findByFilters({ brandId: brand.id, size: '42' });
        const names = results.map(r => r.name);
        assert(names.includes('Filter Shoe A'), 'Expected Shoe A (has stock)');
        assert(!names.includes('Filter Shoe B'), 'Should not include Shoe B (no stock)');
    });

    test('getAll includes stock summary', () => {
        const all = productsQuery.getAll(5, 0);
        assert(all.length > 0, 'Expected products');
        assert(all[0].total_stock !== undefined, 'Expected total_stock field');
        assert(all[0].available_size_count !== undefined, 'Expected available_size_count field');
    });

    // ==========================================
    // Cart Tests
    // ==========================================
    console.log('\n📦 Cart Queries:');

    const testUserId = 'test_user_inventory';

    test('cart starts empty', () => {
        cartQuery.clear(testUserId);
        const items = cartQuery.get(testUserId);
        assert(items.length === 0, 'Expected empty cart');
    });

    test('add to cart', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Cart Inv Shoe',
            price: 5000,
            sizes: [{ size: '42', inStock: 5 }]
        });
        cartQuery.add(testUserId, productId, '42');
        const items = cartQuery.get(testUserId);
        assert(items.length === 1, 'Expected 1 item');
        assert(items[0].quantity === 1, 'Expected quantity 1');
    });

    test('add same item increments quantity', () => {
        const items = cartQuery.get(testUserId);
        cartQuery.add(testUserId, items[0].product_id, '42');
        const updated = cartQuery.get(testUserId);
        assert(updated[0].quantity === 2, 'Expected quantity 2');
    });

    test('getCount returns total quantity', () => {
        const count = cartQuery.getCount(testUserId);
        assert(count === 2, `Expected 2, got ${count}`);
    });

    test('getTotal calculates correctly', () => {
        const total = cartQuery.getTotal(testUserId);
        assert(total === 10000, `Expected 10000, got ${total}`);
    });

    test('clear cart works', () => {
        cartQuery.clear(testUserId);
        const count = cartQuery.getCount(testUserId);
        assert(count === 0, 'Expected empty cart');
    });

    // ==========================================
    // Order Tests (with inventory management)
    // ==========================================
    console.log('\n📦 Order Queries (with inventory):');

    const orderUserId = 'test_user_orders_inv';

    test('create order validates stock', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Order Inv Shoe',
            price: 7000,
            sizes: [{ size: '42', inStock: 3 }]
        });

        // Try to order more than available
        cartQuery.add(orderUserId, productId, '42', 10);

        let threw = false;
        try {
            ordersQuery.createFromCart(orderUserId, {
                name: 'Test User',
                phone: '+251912345678'
            });
        } catch (e) {
            threw = true;
            assert(e.message.includes('Insufficient stock'), `Expected stock error, got: ${e.message}`);
        }
        assert(threw, 'Expected error for insufficient stock');

        // Clean up
        cartQuery.clear(orderUserId);
    });

    test('create order succeeds with valid stock', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Valid Order Shoe',
            price: 7000,
            sizes: [{ size: '42', inStock: 5 }]
        });

        cartQuery.add(orderUserId, productId, '42', 2);

        const result = ordersQuery.createFromCart(orderUserId, {
            name: 'Test User',
            username: 'testuser',
            phone: '+251912345678',
            address: 'Bole, Addis Ababa'
        });

        assert(result.orderId > 0, 'Expected order ID');
        assert(result.total === 14000, `Expected 14000, got ${result.total}`);

        // Cart should be empty after order
        const cartCount = cartQuery.getCount(orderUserId);
        assert(cartCount === 0, 'Expected empty cart after order');
    });

    test('confirming order decrements stock', () => {
        // Get the order we just created
        const userOrders = ordersQuery.getUserOrders(orderUserId);
        const orderId = userOrders[0].id;

        // Get product from order items
        const items = ordersQuery.getItems(orderId);
        const productId = items[0].product_id;

        // Stock before confirm: 5 (we ordered 2 but haven't confirmed yet)
        const stockBefore = productsQuery.getSizeStock(productId, '42');
        assert(stockBefore === 5, `Expected 5 before confirm, got ${stockBefore}`);

        // Confirm order → should decrement
        const result = ordersQuery.updateStatus(orderId, 'confirmed');
        assert(result.changed === true, 'Expected status change');

        // Stock after confirm: 5 - 2 = 3
        const stockAfter = productsQuery.getSizeStock(productId, '42');
        assert(stockAfter === 3, `Expected 3 after confirm, got ${stockAfter}`);
    });

    test('cancelling confirmed order restores stock', () => {
        const userOrders = ordersQuery.getUserOrders(orderUserId);
        const orderId = userOrders[0].id;
        const items = ordersQuery.getItems(orderId);
        const productId = items[0].product_id;

        // Stock before cancel: 3
        const stockBefore = productsQuery.getSizeStock(productId, '42');
        assert(stockBefore === 3, `Expected 3 before cancel, got ${stockBefore}`);

        // Cancel order → should restore
        ordersQuery.updateStatus(orderId, 'cancelled');

        // Stock after cancel: 3 + 2 = 5
        const stockAfter = productsQuery.getSizeStock(productId, '42');
        assert(stockAfter === 5, `Expected 5 after cancel, got ${stockAfter}`);
    });

    test('cancelling pending order does NOT change stock', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Pending Cancel Shoe',
            price: 5000,
            sizes: [{ size: '41', inStock: 4 }]
        });

        cartQuery.add(orderUserId, productId, '41', 1);
        const { orderId } = ordersQuery.createFromCart(orderUserId, {
            name: 'Test', phone: '123'
        });

        // Stock before: 4 (order is pending, no decrement yet)
        const stockBefore = productsQuery.getSizeStock(productId, '41');
        assert(stockBefore === 4, `Expected 4 before, got ${stockBefore}`);

        // Cancel pending → should NOT change stock
        ordersQuery.updateStatus(orderId, 'cancelled');
        const stockAfter = productsQuery.getSizeStock(productId, '41');
        assert(stockAfter === 4, `Expected 4 after, got ${stockAfter}`);
    });

    test('duplicate status update does nothing', () => {
        const brand = brandsQuery.findOrCreate('TestBrand', '🧪');
        const productId = productsQuery.create({
            brandId: brand.id,
            name: 'Dup Status Shoe',
            price: 5000,
            sizes: [{ size: '42', inStock: 10 }]
        });

        cartQuery.add(orderUserId, productId, '42', 1);
        const { orderId } = ordersQuery.createFromCart(orderUserId, {
            name: 'Test', phone: '123'
        });

        // Confirm once
        ordersQuery.updateStatus(orderId, 'confirmed');
        const stockAfterFirst = productsQuery.getSizeStock(productId, '42');

        // Try to confirm again → should not decrement twice
        const result = ordersQuery.updateStatus(orderId, 'confirmed');
        assert(result.changed === false, 'Expected no change');

        const stockAfterSecond = productsQuery.getSizeStock(productId, '42');
        assert(stockAfterFirst === stockAfterSecond, 'Stock should not change on duplicate confirm');
    });

    test('getWithItems returns order details', () => {
        const userOrders = ordersQuery.getUserOrders(orderUserId, 1);
        assert(userOrders.length > 0, 'Expected orders');

        const order = ordersQuery.getWithItems(userOrders[0].id);
        assert(order, 'Expected order');
        assert(order.items.length > 0, 'Expected order items');
        assert(order.items[0].product_name, 'Expected product name snapshot');
    });

    // ==========================================
    // Stats Tests
    // ==========================================
    console.log('\n📦 Stats Queries:');

    test('getSalesStats returns data', () => {
        const result = statsQuery.getSalesStats(30);
        assert(result.total_orders !== undefined, 'Expected total_orders');
        assert(result.total_revenue !== undefined, 'Expected total_revenue');
    });

    test('getInventoryStats returns data', () => {
        const result = statsQuery.getInventoryStats();
        assert(result.total_products > 0, 'Expected products');
    });

    test('getStockLevels returns inventory data', () => {
        const result = statsQuery.getStockLevels();
        assert(result.total_units !== undefined, 'Expected total_units');
        assert(result.sizes_in_stock !== undefined, 'Expected sizes_in_stock');
        assert(result.sizes_out_of_stock !== undefined, 'Expected sizes_out_of_stock');
    });

    test('getLowStock returns low inventory items', () => {
        const result = statsQuery.getLowStock(100);
        assert(Array.isArray(result), 'Expected array');
    });

    // ==========================================
    // Summary
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🧪 Tests: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log('❌ Some tests failed!');
        process.exit(1);
    } else {
        console.log('✅ All tests passed!');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

} catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
} finally {
    close();
}
