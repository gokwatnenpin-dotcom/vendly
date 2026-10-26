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
  if (lowerMsg.match(/\b(price|list|catalog|menu|items|products|what do you have|what do you sell|available)\b/)) {
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
  
  // e. Business-related keywords - respond to any business inquiry
  const businessKeywords = [
    'buy', 'purchase', 'order', 'shop', 'store', 'website', 
    'info', 'information', 'contact', 'support', 'help',
    'question', 'inquiry', 'interested', 'available', 'stock',
    'delivery', 'shipping', 'payment', 'price', 'cost',
    'discount', 'offer', 'sale', 'new', 'arrival',
    'recommend', 'suggestion', 'what', 'when', 'where', 'how',
    'can', 'could', 'would', 'should', 'will'
  ];
  
  if (businessKeywords.some(keyword => lowerMsg.includes(keyword))) {
    return { 
      text: 'Thank you for your interest! I can help you with product information, prices, or placing an order. What would you like to know?', 
      handoff: false 
    };
  }
  
  // f. Fallback - respond to any message instead of handing off immediately
  return { 
    text: 'Thanks for your message! I\'m here to help with product inquiries, pricing, and orders. Could you tell me more about what you\'re looking for?', 
    handoff: false 
  };
}

module.exports = { reply, formatPrice };