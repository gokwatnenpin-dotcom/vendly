const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbPath = process.env.DB_FILE || path.join(__dirname, 'shop.db');

let db = null;
let dbReady = null;
let SQL = null;

async function initDb() {
  if (dbReady) return dbReady;
  
  dbReady = (async () => {
    SQL = await initSqlJs({ locateFile: () => 'sql-wasm.wasm' });
    
    let filebuffer = null;
    if (fs.existsSync(dbPath)) {
      filebuffer = fs.readFileSync(dbPath);
    }
    
    db = new SQL.Database(filebuffer);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        keywords TEXT,
        in_stock INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keywords TEXT NOT NULL,
        answer TEXT NOT NULL
      );
    `);
    
    return db;
  })();
  
  return dbReady;
}

function resetDb() {
  db = null;
  dbReady = null;
  SQL = null;
}

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function runExec(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.run();
  stmt.free();
  saveDb();
}

async function listItems() {
  await initDb();
  return runQuery('SELECT * FROM items WHERE in_stock = 1 ORDER BY name');
}

async function listAllItems() {
  await initDb();
  return runQuery('SELECT * FROM items ORDER BY name');
}

async function addItem(name, price, keywords = '') {
  await initDb();
  runExec(`
    INSERT INTO items (name, price, keywords, in_stock)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(name) DO UPDATE SET price = excluded.price, keywords = excluded.keywords
  `, [name, price, keywords]);
}

async function setPrice(name, price) {
  await initDb();
  runExec('UPDATE items SET price = ? WHERE name = ?', [price, name]);
}

async function setStock(name, inStock) {
  await initDb();
  runExec('UPDATE items SET in_stock = ? WHERE name = ?', [inStock ? 1 : 0, name]);
}

async function removeItem(name) {
  await initDb();
  runExec('DELETE FROM items WHERE name = ?', [name]);
}

async function listFaqs() {
  await initDb();
  return runQuery('SELECT * FROM faqs ORDER BY id');
}

async function addFaq(keywords, answer) {
  await initDb();
  runExec('INSERT INTO faqs (keywords, answer) VALUES (?, ?)', [keywords, answer]);
}

async function findItemByNameOrKeyword(query) {
  await initDb();
  const lowerQuery = query.toLowerCase();
  const items = await listAllItems();
  
  for (const item of items) {
    if (item.name.toLowerCase() === lowerQuery) return item;
    const keywords = (item.keywords || '').split(',').map(k => k.trim().toLowerCase());
    if (keywords.includes(lowerQuery)) return item;
  }
  return null;
}

async function findFaq(query) {
  await initDb();
  const lowerQuery = query.toLowerCase();
  const faqs = await listFaqs();
  
  for (const faq of faqs) {
    const keywords = faq.keywords.split(',').map(k => k.trim().toLowerCase());
    if (keywords.some(k => lowerQuery.includes(k))) return faq;
  }
  return null;
}

module.exports = {
  listItems,
  listAllItems,
  addItem,
  setPrice,
  setStock,
  removeItem,
  listFaqs,
  addFaq,
  findItemByNameOrKeyword,
  findFaq,
  initDb,
  resetDb
};