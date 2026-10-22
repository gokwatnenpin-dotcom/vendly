# Shopbot

Auto-reply assistant for small business owners who sell on WhatsApp and other social media.

## Setup

```bash
npm install
```

## Run CLI Test Console

```bash
npm start
```

Or with custom database and currency:

```bash
DB_FILE=shop.db CURRENCY=₦ npm start
```

## Run Tests

```bash
npm test
```

## Owner Commands (in CLI)

- `/list` - List all items
- `/add name | price | keywords` - Add/update item
- `/price name | newprice` - Update item price
- `/stock name | on/off` - Toggle stock status
- `/remove name` - Remove item
- `/faq keywords | answer` - Add FAQ

Type any other message to simulate a customer query.