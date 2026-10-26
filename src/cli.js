const readline = require('readline');
const db = require('./db');
const { reply } = require('./bot');
const { handleOwnerCommand, isOwnerCommand } = require('./commands');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

async function seedIfEmpty() {
  await db.initDb();
  const items = await db.listAllItems();
  if (items.length === 0) {
    await db.addItem('T-Shirt', 15.00, 'tshirt,tee,shirt');
    await db.addItem('Jeans', 40.00, 'jeans,denim,pants');
    await db.addItem('Sneakers', 60.00, 'sneakers,shoes,kicks');
    await db.addItem('Hoodie', 35.00, 'hoodie,sweatshirt');
    console.log('Seeded sample items.');
  }
  
  const faqs = await db.listFaqs();
  if (faqs.length === 0) {
    await db.addFaq('delivery,shipping,ship', 'We deliver within 2-3 business days. Free delivery on orders over $50.');
    await db.addFaq('location,address,where', 'We\'re located at 123 Main St, Downtown. Open Mon-Sat 9am-6pm.');
    await db.addFaq('hours,open,time', 'Mon-Sat: 9am-6pm, Sun: Closed');
    await db.addFaq('payment,pay,card,cash', 'We accept cash, card, and mobile payments.');
    console.log('Seeded sample FAQs.');
  }
}

console.log('Shopbot CLI Test Console');
console.log('Type messages as a customer, or use owner commands starting with /');
console.log('Commands: /list, /add name | price | keywords, /price name | newprice, /stock name | on/off, /remove name, /faq keywords | answer');
console.log('Press Ctrl+C to exit\n');

seedIfEmpty().then(() => {
  rl.prompt();
});

rl.on('line', async (input) => {
  const trimmed = input.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }
  
  if (isOwnerCommand(trimmed)) {
    const response = await handleOwnerCommand(trimmed);
    console.log(response);
  } else {
    const { text, handoff } = await reply(trimmed);
    console.log(`Bot: ${text}${handoff ? ' [HANDOFF]' : ''}`);
  }
  rl.prompt();
}).on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});