const { test, beforeEach, afterEach, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'test_commands.db');

process.env.DB_FILE = TEST_DB;
process.env.CURRENCY = '$';

const db = require('../src/db');
const { handleOwnerCommand, isOwnerCommand } = require('../src/commands');

function cleanup() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
}

beforeEach(() => {
  cleanup();
  db.resetDb();
});

afterEach(() => {
  cleanup();
  db.resetDb();
});

describe('Commands module', () => {
  test('isOwnerCommand returns true for commands starting with /', () => {
    assert.strictEqual(isOwnerCommand('/list'), true);
    assert.strictEqual(isOwnerCommand('/add item | 10 | keyword'), true);
    assert.strictEqual(isOwnerCommand('  /price item | 5'), true);
  });

  test('isOwnerCommand returns false for non-commands', () => {
    assert.strictEqual(isOwnerCommand('hello'), false);
    assert.strictEqual(isOwnerCommand('price list'), false);
    assert.strictEqual(isOwnerCommand(''), false);
  });

  test('handleOwnerCommand /list returns empty message when no items', async () => {
    const result = await handleOwnerCommand('/list');
    assert.strictEqual(result, 'No items yet.');
  });

  test('handleOwnerCommand /list returns formatted items', async () => {
    await db.addItem('T-Shirt', 15.00, 'tshirt');
    await db.addItem('Jeans', 40.00, 'jeans');
    const result = await handleOwnerCommand('/list');
    assert.ok(result.includes('T-Shirt'));
    assert.ok(result.includes('$15.00'));
    assert.ok(result.includes('Jeans'));
    assert.ok(result.includes('$40.00'));
    assert.ok(result.includes('✓'));
  });

  test('handleOwnerCommand /add adds new item', async () => {
    const result = await handleOwnerCommand('/add Cap | 25 | cap,hat');
    assert.strictEqual(result, 'Added/updated: Cap');
    
    const items = await db.listAllItems();
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].name, 'Cap');
    assert.strictEqual(items[0].price, 25);
    assert.strictEqual(items[0].keywords, 'cap,hat');
  });

  test('handleOwnerCommand /add updates existing item', async () => {
    await db.addItem('Cap', 20.00, 'old');
    const result = await handleOwnerCommand('/add Cap | 30 | new,keywords');
    assert.strictEqual(result, 'Added/updated: Cap');
    
    const items = await db.listAllItems();
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].price, 30);
    assert.strictEqual(items[0].keywords, 'new,keywords');
  });

  test('handleOwnerCommand /add returns usage when missing args', async () => {
    const result = await handleOwnerCommand('/add Cap');
    assert.strictEqual(result, 'Usage: /add name | price | keywords');
  });

  test('handleOwnerCommand /add rejects malformed prices', async () => {
    const result = await handleOwnerCommand('/add Cap | 12abc | hat');
    assert.match(result, /Price must be a non-negative number/);
    assert.strictEqual((await db.listAllItems()).length, 0);
  });

  test('handleOwnerCommand /price updates item price', async () => {
    await db.addItem('Cap', 20.00);
    const result = await handleOwnerCommand('/price Cap | 35');
    assert.strictEqual(result, 'Price updated: Cap = $35.00');
    
    const items = await db.listAllItems();
    assert.strictEqual(items[0].price, 35);
  });

  test('handleOwnerCommand /price returns usage when missing args', async () => {
    const result = await handleOwnerCommand('/price Cap');
    assert.strictEqual(result, 'Usage: /price name | newprice');
  });

  test('handleOwnerCommand /price reports a missing product', async () => {
    const result = await handleOwnerCommand('/price Missing | 12');
    assert.strictEqual(result, 'Product not found: Missing');
  });

  test('handleOwnerCommand /stock enables stock', async () => {
    await db.addItem('Cap', 20.00);
    await db.setStock('Cap', false);
    const result = await handleOwnerCommand('/stock Cap | on');
    assert.strictEqual(result, 'Stock enabled for Cap');
    
    const items = await db.listAllItems();
    assert.strictEqual(items[0].in_stock, 1);
  });

  test('handleOwnerCommand /stock disables stock', async () => {
    await db.addItem('Cap', 20.00);
    const result = await handleOwnerCommand('/stock Cap | off');
    assert.strictEqual(result, 'Stock disabled for Cap');
    
    const items = await db.listAllItems();
    assert.strictEqual(items[0].in_stock, 0);
  });

  test('handleOwnerCommand /stock returns usage when missing args', async () => {
    const result = await handleOwnerCommand('/stock Cap');
    assert.strictEqual(result, 'Usage: /stock name | on/off');
  });

  test('handleOwnerCommand /stock rejects invalid status without changing stock', async () => {
    await db.addItem('Cap', 20.00);
    const result = await handleOwnerCommand('/stock Cap | maybe');
    assert.strictEqual(result, 'Usage: /stock name | on/off');
    assert.strictEqual((await db.listAllItems())[0].in_stock, 1);
  });

  test('handleOwnerCommand /remove deletes item', async () => {
    await db.addItem('Cap', 20.00);
    const result = await handleOwnerCommand('/remove Cap');
    assert.strictEqual(result, 'Removed: Cap');
    
    const items = await db.listAllItems();
    assert.strictEqual(items.length, 0);
  });

  test('handleOwnerCommand /remove returns usage when missing args', async () => {
    const result = await handleOwnerCommand('/remove');
    assert.strictEqual(result, 'Usage: /remove name');
  });

  test('handleOwnerCommand /faq adds FAQ', async () => {
    const result = await handleOwnerCommand('/faq returns,refund | 14-day returns');
    assert.strictEqual(result, 'Added FAQ: returns,refund');
    
    const faqs = await db.listFaqs();
    assert.strictEqual(faqs.length, 1);
    assert.strictEqual(faqs[0].keywords, 'returns,refund');
    assert.strictEqual(faqs[0].answer, '14-day returns');
  });

  test('handleOwnerCommand /faq returns usage when missing args', async () => {
    const result = await handleOwnerCommand('/faq returns');
    assert.strictEqual(result, 'Usage: /faq keywords | answer');
  });

  test('handleOwnerCommand unknown command returns help', async () => {
    const result = await handleOwnerCommand('/unknown');
    assert.ok(result.includes('Unknown command'));
    assert.ok(result.includes('/list'));
    assert.ok(result.includes('/add'));
  });

  test('handleOwnerCommand reports invalid prices clearly', async () => {
    const result = await handleOwnerCommand('/add Invalid | not-a-number | kw');
    assert.match(result, /Price must be a non-negative number/);
  });
});
