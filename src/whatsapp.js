const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { reply, formatPrice } = require('./bot');
const { handleOwnerCommand, isOwnerCommand } = require('./commands');

const OWNER_NUMBER = process.env.OWNER_NUMBER;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const rateLimitMap = new Map();

function checkRateLimit(senderNumber) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(senderNumber) || [];
  
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(senderNumber, recentTimestamps);
  return true;
}

function logHandoff(senderNumber, message) {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} | ${senderNumber} | ${message}\n`;
  fs.appendFileSync(path.join(__dirname, 'handoffs.log'), logLine);
  console.log(`[HANDOFF] ${timestamp} | ${senderNumber} | ${message}`);
}

function getChatId(msg) {
  return msg.from;
}

function phoneNumberFromChatId(chatId = '') {
  return chatId.split('@')[0].replace(/\D/g, '');
}

function parseImageProductDetails(caption = '') {
  const name = caption.match(/^\s*name\s*:\s*(.+?)\s*$/im)?.[1]?.trim();
  const priceText = caption.match(/^\s*price\s*:\s*([$€£₦]?\s*\d+(?:[.,]\d{1,2})?)\s*$/im)?.[1]
    ?.replace(/[$€£₦\s]/g, '')
    .replace(',', '.');
  const price = Number(priceText);
  return name && Number.isFinite(price) && price >= 0 ? { name, price } : null;
}

async function getImageHash(msg) {
  const media = await msg.downloadMedia();
  if (!media || !media.mimetype?.startsWith('image/')) return null;
  return crypto.createHash('sha256').update(Buffer.from(media.data, 'base64')).digest('hex');
}

async function registerOwnerImage(msg) {
  if (!msg.fromMe || msg.isGroup || !msg.hasMedia) return;
  const chatId = msg.to || msg.from;
  if (phoneNumberFromChatId(chatId) !== OWNER_NUMBER) return;

  const details = parseImageProductDetails(msg.body);
  if (!details) {
    await client.sendMessage(chatId, 'To save a product image, add a caption like:\nName: Product name\nPrice: 12.50');
    return;
  }

  const imageHash = await getImageHash(msg);
  if (!imageHash) {
    await client.sendMessage(chatId, 'I could not read that image. Please send it as a photo with the product name and price in the caption.');
    return;
  }

  const existingItem = (await db.listAllItems()).find((item) => item.name === details.name);
  await db.addItem(details.name, details.price, existingItem?.keywords || '');
  await db.linkImageToItem(imageHash, details.name);
  await client.sendMessage(chatId, `Saved product image: ${details.name} — ${formatPrice(details.price)}`);
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '.wwebjs_auth')
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

client.on('qr', (qr) => {
  console.log('\n=== Scan this QR code with WhatsApp ===');
  console.log('WhatsApp > Settings > Linked devices > Link a device');
  qrcode.generate(qr, { small: true });
  console.log('=========================================\n');
});

client.on('ready', () => {
  console.log('WhatsApp client ready!');
  console.log('Bot is now listening for messages...\n');
});

client.on('authenticated', () => {
  console.log('Authenticated successfully');
});

client.on('auth_failure', (msg) => {
  console.error('Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('Client disconnected:', reason);
});

client.on('message', async (msg) => {
  try {
    if (msg.fromMe) return;
    
    if (msg.isStatus || msg.isGroup) return;
    
    const senderNumber = phoneNumberFromChatId(msg.author || msg.from);
    const chatId = getChatId(msg);
    const text = typeof msg.body === 'string' ? msg.body.trim() : '';
    
    if (OWNER_NUMBER && senderNumber === OWNER_NUMBER && isOwnerCommand(text)) {
      const response = await handleOwnerCommand(text);
      await client.sendMessage(chatId, response);
      return;
    }
    
    if (!checkRateLimit(senderNumber)) {
      console.log(`Rate limited: ${senderNumber}`);
      return;
    }

    if (msg.hasMedia && msg.type === 'image') {
      const imageHash = await getImageHash(msg);
      const item = imageHash ? await db.findItemByImageHash(imageHash) : null;
      if (item) {
        const stockNote = item.in_stock ? '' : ' (OUT OF STOCK)';
        await client.sendMessage(chatId, `${item.name}: ${formatPrice(item.price)}${stockNote}`);
      } else {
        await client.sendMessage(chatId, 'I could not match that product image. Please send the product name or ask the shop owner.');
      }
      return;
    }

    if (!text) return;
    
    const { text: replyText, handoff } = await reply(text);
    
    // Simple, reliable send method
    await client.sendMessage(chatId, replyText);
    
    if (handoff) {
      logHandoff(senderNumber, text);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

client.on('message_create', async (msg) => {
  try {
    await registerOwnerImage(msg);
  } catch (error) {
    console.error('Error saving owner product image:', error);
  }
});

async function main() {
  await db.initDb();
  console.log('Database initialized');
  client.initialize();
}

main().catch(console.error);
