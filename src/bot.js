const db = require('./db');

const CURRENCY = process.env.CURRENCY || '$';

function formatPrice(price) {
  return `${CURRENCY}${price.toFixed(2)}`;
}

async function reply(message) {
  const lowerMsg = message.toLowerCase().trim();
  
  // a. Specific item mentioned (by name or keyword)
  const item = await db.findItemByNameOrKeyword(lowerMsg);
  if (item) {
    const stockNote = item.in_stock ? '' : ' (OUT OF STOCK)';
    return { text: `${item.name}: ${formatPrice(item.price)}${stockNote}`, handoff: false };
  }
  
  // b. Price list/catalog/menu request
  if (lowerMsg.match(/\b(price|list|catalog|menu|items|products|what do you have|what do you sell)\b/)) {
    const items = await db.listItems();
    if (items.length === 0) {
      return { text: 'No items available right now.', handoff: false };
    }
    const lines = items.map(i => `${i.name}: ${formatPrice(i.price)}`);
    return { text: 'Here\'s our price list:\n' + lines.join('\n'), handoff: false };
  }
  
  // c. FAQ keyword match
  const faq = await db.findFaq(lowerMsg);
  if (faq) {
    return { text: faq.answer, handoff: false };
  }
  
  // d. Greeting
  if (lowerMsg.match(/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/)) {
    return { text: 'Hello! How can I help you today?', handoff: false };
  }
  
  // e. Fallback
  return { 
    text: 'Sorry, I didn\'t understand that. Let me get the owner to help you.', 
    handoff: true 
  };
}

module.exports = { reply, formatPrice };