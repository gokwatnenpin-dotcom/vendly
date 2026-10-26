# Notes for AI coding agents

## Project

Shopbot is a CommonJS Node.js WhatsApp auto-reply bot. The WhatsApp integration is in `src/whatsapp.js`, customer text matching is in `src/bot.js`, owner commands are in `src/commands.js`, and persistent SQLite data is managed through `src/db.js` using `sql.js`. See `README.md` for setup and usage.

## Current behavior

- Direct messages are handled. Every group message is ignored unconditionally, including owner commands and image messages.
- Owner text commands are accepted only from `OWNER_NUMBER` in direct messages.
- Products and FAQs are stored in the SQLite database and persisted after each change. The CLI seeds example data if its corresponding table is empty.
- Owner can register a product image by sending it in a self-chat with a caption on separate lines in this format:

  ```text
  Name: Product name
  Price: 12.50
  ```

- Image registration adds or updates a regular catalog item and associates the downloaded image's SHA-256 hash with its name in the `item_images` table. The original image is not retained. When a customer sends an image whose downloaded bytes have the same hash, the bot responds with the item's current catalog price and stock status.
- Image lookup is byte-for-byte. WhatsApp image resizing or recompression changes the hash, so a visually identical but re-encoded photo will not match. Perceptual image matching is not implemented.
- Customer image messages that do not match receive a prompt to send the product name or contact the owner.

## Relevant files

- `src/whatsapp.js`: WhatsApp events, owner self-chat image registration, group allowlist, rate limiting, and outbound replies.
- `src/db.js`: database initialization, product/FAQ operations, and image-hash associations.
- `src/bot.js`: text reply logic and price formatting.
- `README.md`: user-facing setup and instructions.

## Configuration

`OWNER_NUMBER` should be the owner's international phone number with digits only. `CURRENCY`, `DB_FILE`, and `CHROME_PATH` configure price display, database location, and Chrome executable respectively. The npm scripts load `.env` with Node's `--env-file` option.

## Development guidance

- Never send replies to group chats. Keep the group check unconditional and before handling text, commands, or media.
- Keep image fingerprint lookup and registration in the existing local database; do not claim visual similarity matching unless it is implemented.
- `npm test` is the project's test command. Add or run tests when the user requests verification.
- Update `README.md` when user-visible commands or workflows change.
