const db = require('./db');
const { formatPrice } = require('./bot');

function parsePrice(value) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const price = Number(normalized);
  return Number.isFinite(price) ? price : null;
}

async function itemExists(name) {
  const items = await db.listAllItems();
  return items.some((item) => item.name === name);
}

async function handleOwnerCommand(input) {
  const trimmed = input.trim().slice(1);
  const parts = trimmed.split('|').map(p => p.trim());
  const cmdParts = parts[0].split(' ');
  const cmd = cmdParts[0].toLowerCase();
  const firstArg = cmdParts.slice(1).join(' ').trim();
  
  // Reconstruct args array: firstArg + remaining parts
  const args = [firstArg, ...parts.slice(1)];
  
  try {
    switch (cmd) {
      case 'list': {
        const items = await db.listAllItems();
        if (items.length === 0) {
          return 'No items yet.';
        }
        const lines = items.map(i => `  ${i.name} - ${formatPrice(i.price)} ${i.in_stock ? '✓' : '✗'} [${i.keywords || ''}]`);
        return 'Items:\n' + lines.join('\n');
      }
      case 'add': {
        const [name, price, keywords] = args;
        if (!name || !price) {
          return 'Usage: /add name | price | keywords';
        }
        const parsedPrice = parsePrice(price);
        if (parsedPrice === null) return 'Price must be a non-negative number with up to two decimal places.';
        await db.addItem(name, parsedPrice, keywords || '');
        return `Added/updated: ${name}`;
      }
      case 'price': {
        const [name, newPrice] = args;
        if (!name || !newPrice) {
          return 'Usage: /price name | newprice';
        }
        const parsedPrice = parsePrice(newPrice);
        if (parsedPrice === null) return 'Price must be a non-negative number with up to two decimal places.';
        if (!(await itemExists(name))) return `Product not found: ${name}`;
        await db.setPrice(name, parsedPrice);
        return `Price updated: ${name} = ${formatPrice(parsedPrice)}`;
      }
      case 'stock': {
        const [name, status] = args;
        if (!name || !status) {
          return 'Usage: /stock name | on/off';
        }
        const normalizedStatus = status.toLowerCase();
        if (normalizedStatus !== 'on' && normalizedStatus !== 'off') {
          return 'Usage: /stock name | on/off';
        }
        if (!(await itemExists(name))) return `Product not found: ${name}`;
        await db.setStock(name, normalizedStatus === 'on');
        return `Stock ${normalizedStatus === 'on' ? 'enabled' : 'disabled'} for ${name}`;
      }
      case 'remove': {
        const name = firstArg;
        if (!name) {
          return 'Usage: /remove name';
        }
        if (!(await itemExists(name))) return `Product not found: ${name}`;
        await db.removeItem(name);
        return `Removed: ${name}`;
      }
      case 'faq': {
        const [keywords, answer] = args;
        if (!keywords || !answer) {
          return 'Usage: /faq keywords | answer';
        }
        await db.addFaq(keywords, answer);
        return `Added FAQ: ${keywords}`;
      }
      default:
        return 'Unknown command. Commands: /list, /add, /price, /stock, /remove, /faq';
    }
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

function isOwnerCommand(text) {
  return text.trim().startsWith('/');
}

module.exports = { handleOwnerCommand, isOwnerCommand };
