const readline = require('readline');
const db = require('./db');
const { reply } = require('./bot');

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

async function handleOwnerCommand(input) {
  const parts = input.slice(1).split('|').map(p => p.trim());
  const cmd = parts[0].split(' ')[0].toLowerCase();
  const args = parts[0].slice(cmd.length).trim();
  
  try {
    switch (cmd) {
      case 'list': {
        const items = await db.listAllItems();
        if (items.length === 0) {
          console.log('No items yet.');
        } else {
          console.log('Items:');
          items.forEach(i => console.log(`  ${i.name} - $${i.price.toFixed(2)} ${i.in_stock ? '✓' : '✗'} [${i.keywords || ''}]`));
        }
        break;
      }
      case 'add': {
        const [name, price, keywords] = args.split('|').map(s => s.trim());
        if (!name || !price) {
          console.log('Usage: /add name | price | keywords');
          break;
        }
        await db.addItem(name, parseFloat(price), keywords || '');
        console.log(`Added/updated: ${name}`);
        break;
      }
      case 'price': {
        const [name, newPrice] = args.split('|').map(s => s.trim());
        if (!name || !newPrice) {
          console.log('Usage: /price name | newprice');
          break;
        }
        await db.setPrice(name, parseFloat(newPrice));
        console.log(`Price updated: ${name} = $${parseFloat(newPrice).toFixed(2)}`);
        break;
      }
      case 'stock': {
        const [name, status] = args.split('|').map(s => s.trim());
        if (!name || !status) {
          console.log('Usage: /stock name | on/off');
          break;
        }
        await db.setStock(name, status.toLowerCase() === 'on');
        console.log(`Stock ${status === 'on' ? 'enabled' : 'disabled'} for ${name}`);
        break;
      }
      case 'remove': {
        const name = args;
        if (!name) {
          console.log('Usage: /remove name');
          break;
        }
        await db.removeItem(name);
        console.log(`Removed: ${name}`);
        break;
      }
      case 'faq': {
        const [keywords, answer] = args.split('|').map(s => s.trim());
        if (!keywords || !answer) {
          console.log('Usage: /faq keywords | answer');
          break;
        }
        await db.addFaq(keywords, answer);
        console.log(`Added FAQ: ${keywords}`);
        break;
      }
      default:
        console.log('Unknown command. Commands: /list, /add, /price, /stock, /remove, /faq');
    }
  } catch (e) {
    console.log('Error:', e.message);
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
  
  if (trimmed.startsWith('/')) {
    await handleOwnerCommand(trimmed);
  } else {
    const { text, handoff } = await reply(trimmed);
    console.log(`Bot: ${text}${handoff ? ' [HANDOFF]' : ''}`);
  }
  rl.prompt();
}).on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});