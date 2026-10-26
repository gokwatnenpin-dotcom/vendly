const { test, beforeEach, afterEach, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'test_shop.db');

process.env.DB_FILE = TEST_DB;
process.env.CURRENCY = '$';

const db = require('../src/db');
const { reply } = require('../src/bot');

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

describe('Bot reply engine', () => {
  test('item match by name returns price', async () => {
    await db.addItem('T-Shirt', 15.00, 'tshirt,tee');
    const result = await reply('T-Shirt');
    assert.strictEqual(result.text, 'T-Shirt: $15.00');
    assert.strictEqual(result.handoff, false);
  });

  test('item match by keyword returns price', async () => {
    await db.addItem('T-Shirt', 15.00, 'tshirt,tee');
    const result = await reply('tshirt');
    assert.strictEqual(result.text, 'T-Shirt: $15.00');
    assert.strictEqual(result.handoff, false);
  });

  test('out of stock item shows note', async () => {
    await db.addItem('Jeans', 40.00, 'jeans,denim');
    await db.setStock('Jeans', false);
    const result = await reply('jeans');
    assert.ok(result.text.includes('OUT OF STOCK'));
    assert.strictEqual(result.handoff, false);
  });

  test('price list request returns all items', async () => {
    await db.addItem('T-Shirt', 15.00, 'tshirt');
    await db.addItem('Jeans', 40.00, 'jeans');
    const result = await reply('price list');
    assert.ok(result.text.includes('T-Shirt: $15.00'));
    assert.ok(result.text.includes('Jeans: $40.00'));
    assert.strictEqual(result.handoff, false);
  });

  test('catalog request returns all items', async () => {
    await db.addItem('Sneakers', 60.00, 'sneakers');
    const result = await reply('catalog');
    assert.ok(result.text.includes('Sneakers: $60.00'));
    assert.strictEqual(result.handoff, false);
  });

  test('FAQ keyword match returns answer', async () => {
    await db.addFaq('delivery,shipping', 'We deliver in 2-3 days.');
    const result = await reply('delivery');
    assert.strictEqual(result.text, 'We deliver in 2-3 days.');
    assert.strictEqual(result.handoff, false);
  });

  test('FAQ matches partial keyword in sentence', async () => {
    await db.addFaq('hours,open', 'Mon-Fri 9-5');
    const result = await reply('what are your hours?');
    assert.strictEqual(result.text, 'Mon-Fri 9-5');
    assert.strictEqual(result.handoff, false);
  });

  test('greeting returns friendly response', async () => {
    const result = await reply('hello');
    assert.strictEqual(result.text, 'Hello! How can I help you today?');
    assert.strictEqual(result.handoff, false);
  });

  test('fallback returns a general help reply without handoff', async () => {
    const result = await reply('random unknown message');
    assert.strictEqual(result.text, "Thanks for your message! I'm here to help with product inquiries, pricing, and orders. Could you tell me more about what you're looking for?");
    assert.strictEqual(result.handoff, false);
  });

  test('price change reflected immediately', async () => {
    await db.addItem('Hoodie', 35.00, 'hoodie');
    let result = await reply('hoodie');
    assert.strictEqual(result.text, 'Hoodie: $35.00');
    
    await db.setPrice('Hoodie', 30.00);
    result = await reply('hoodie');
    assert.strictEqual(result.text, 'Hoodie: $30.00');
  });

  test('empty price list returns message', async () => {
    const result = await reply('menu');
    assert.strictEqual(result.text, 'No items available right now.');
    assert.strictEqual(result.handoff, false);
  });

  test('currency symbol from env var', async () => {
    process.env.CURRENCY = '₦';
    // Need to re-require bot to pick up new env var
    delete require.cache[require.resolve('../src/bot')];
    const { reply: replyWithNaira } = require('../src/bot');
    await db.addItem('Cap', 5000, 'cap,hat');
    const result = await replyWithNaira('cap');
    assert.ok(result.text.includes('₦5000.00'));
  });
});
