# Shopbot

Shopbot is a small WhatsApp auto-reply bot for a shop. It keeps a local catalog of products, prices, stock status, and frequently asked questions. Customers can ask about a product or request the catalog; the owner can manage the catalog and FAQs with chat commands.

## Requirements

- Node.js 20.6 or newer (the start scripts use Node's `--env-file` option)
- npm
- Google Chrome or Chromium installed for WhatsApp Web. Set `CHROME_PATH` if it is not at `/usr/bin/google-chrome-stable`.
- A WhatsApp account to link to the bot

## Install and configure

```bash
npm install
```

Copy `.env.example` to `.env` in the project root, then set your own `OWNER_NUMBER` (the `.env` file is ignored by Git):

```env
OWNER_NUMBER=15551234567
CURRENCY=$
DB_FILE=src/shop.db
CHROME_PATH=/usr/bin/google-chrome-stable
```

Use the owner's WhatsApp number in international format with digits only, without `+`. `CURRENCY` is the symbol shown before prices. `DB_FILE` selects the local SQLite database file; a relative path is resolved from the project directory. `CHROME_PATH` is optional when Chrome is at the default path.

## Start the WhatsApp bot

```bash
npm start
```

Scan the terminal QR code in WhatsApp under **Settings > Linked devices > Link a device**. The bot is ready when the terminal says `WhatsApp client ready!`. Its linked-device session is stored in `src/.wwebjs_auth`, and the catalog database is stored in `src/shop.db` by default.

The bot handles direct messages and ignores status messages and all group messages. Group messages are never replied to, including messages containing owner commands.

## Add products from images

You can register an image from the WhatsApp account linked to the bot:

1. Open a self-chat (message yourself) and send the product photo.
2. Add a caption with the product name and price on separate lines:

   ```text
   Name: Blue T-Shirt
   Price: 15.00
   ```

3. The bot saves the product in the catalog and confirms the price. It stores a SHA-256 fingerprint of the downloaded image, not the image itself.
4. When a customer sends the exact same image file, the bot replies with the product name and current catalog price.

Image matching currently compares the image file bytes. WhatsApp may resize or recompress photos, which changes those bytes; if that happens, the photo will not match even if it looks identical. Send the same unchanged image file to register and query it. If no image matches, the bot asks the customer to send the product name or contact the shop owner.

## Add products and prices

Send these commands from the owner's number in WhatsApp. The bot uses the `OWNER_NUMBER` setting to decide who can run management commands.

### Add a product

```text
/add Product name | price | keyword1,keyword2,keyword3
```

For example:

```text
/add Blue T-Shirt | 15 | blue tee,blue shirt,tshirt
```

The name and price are required; keywords are optional. Use comma-separated keywords or phrases that customers might send. Matching ignores letter case and checks for an exact product name or an exact keyword. Product names must be unique. Running `/add` again with the same name updates its price and keywords.

### Change a price

```text
/price Product name | new-price
```

Example: `/price Blue T-Shirt | 17.50`

Enter a number without the currency symbol. Replies display two decimal places, such as `$17.50` or `€17.50`, based on `CURRENCY`. The current command handler expects a product name that matches the stored name exactly, including capitalization.

### Other product commands

```text
/list
/stock Product name | off
/stock Product name | on
/remove Product name
```

`/list` shows all products, including out-of-stock ones. Products marked off remain searchable by name or keyword and the bot tells the customer they are out of stock. They are omitted from the customer catalog list. `/remove` deletes the product.

## Add FAQs

```text
/faq keyword1,keyword2 | Answer to send customers
```

Example:

```text
/faq delivery,shipping | Delivery takes 2–3 business days.
```

FAQ keywords are matched case-insensitively when any keyword occurs within the customer's message. FAQs are checked after product matching and catalog requests. They are saved in the same database as products.

## How customer replies work

The reply handler checks a customer message in this order:

1. Exact product name or keyword: return that product's name and price, and note if it is out of stock.
2. Catalog or price-list request (for example, “menu” or “what do you have”): list in-stock products.
3. FAQ keyword match: return the saved answer.
4. Greeting: return a greeting.
5. Otherwise, return a general help prompt.

The WhatsApp integration ignores the bot's own messages and status updates. It limits replies to five per sender per minute. Owner commands are only recognized on WhatsApp when the sender number matches `OWNER_NUMBER`; other slash-prefixed messages are treated as customer messages.

## CLI test console

Run a local console to try customer messages and owner commands without connecting WhatsApp:

```bash
npm run cli
```

The CLI automatically adds sample products and FAQs if the selected database has no products/FAQs. It uses the same `.env` settings. To use a separate database or currency for a one-off run:

```bash
DB_FILE=shop-test.db CURRENCY=€ npm run cli
```

## Data and backups

The database is a local SQLite file. By default it is `src/shop.db`; a relative path supplied through `DB_FILE` is resolved from the directory where the command is run. Every product or FAQ change is saved to disk immediately. Back up the database file before moving the bot or making manual database changes. If the file is missing, the app creates a fresh database when it starts.

## Development

```bash
npm test
```

Tests run with Node's built-in test runner.

## WhatsApp automation note

This project uses `whatsapp-web.js`, an unofficial WhatsApp Web automation library. WhatsApp may restrict accounts that use unofficial automation. Avoid bulk or unsolicited messaging; this bot responds to incoming messages only.

## Configuration reference

| Variable | Purpose | Default |
| --- | --- | --- |
| `OWNER_NUMBER` | Owner's WhatsApp number, international digits only | Required to manage the bot over WhatsApp |
| `CURRENCY` | Currency symbol displayed with product prices | `$` |
| `DB_FILE` | SQLite database file path | `src/shop.db` |
| `CHROME_PATH` | Chrome/Chromium executable path | `/usr/bin/google-chrome-stable` |
