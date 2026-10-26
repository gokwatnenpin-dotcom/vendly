#!/usr/bin/env node

/**
 * Setup script to add common FAQ entries for the shop bot
 * Run this once after installing the bot: node setup-faqs.js
 */

const db = require('./src/db');

async function setupFaqs() {
  await db.initDb();
  
  const faqs = [
    {
      keywords: 'delivery,shipping,ship,postage,dispatch',
      answer: 'We offer delivery within 2-3 business days. Free shipping on orders over $50!'
    },
    {
      keywords: 'payment,pay,checkout,purchase,buy',
      answer: 'We accept credit/debit cards, PayPal, and cash on delivery.'
    },
    {
      keywords: 'hours,open,opening,closing,operating',
      answer: 'We are open Monday to Friday, 9 AM to 6 PM. Closed on weekends.'
    },
    {
      keywords: 'return,refund,exchange',
      answer: 'We offer a 30-day return policy for unused items in original packaging.'
    },
    {
      keywords: 'contact,reach,phone,email,support',
      answer: 'You can reach us via this WhatsApp number or email at support@example.com'
    },
    {
      keywords: 'discount,offer,sale,promo,coupon',
      answer: 'Check our current promotions! We regularly offer seasonal discounts and bundle deals.'
    },
    {
      keywords: 'quality,guarantee,warranty',
      answer: 'All our products come with a quality guarantee. If you\'re not satisfied, we\'ll help you find a solution.'
    }
  ];
  
  for (const faq of faqs) {
    try {
      await db.addFaq(faq.keywords, faq.answer);
      console.log(`Added FAQ: ${faq.keywords}`);
    } catch (error) {
      console.log(`FAQ already exists: ${faq.keywords}`);
    }
  }
  
  console.log('FAQ setup complete!');
}

setupFaqs().catch(console.error);