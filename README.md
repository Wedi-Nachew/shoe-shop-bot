# 👟 Shoe Shop Bot (TeleShop)

[![Node.js Version](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram_Bot_API-v7.x-2CA5E0?logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A full-featured Telegram e-commerce bot and admin management mini-app designed for Ethiopian shoe shops and retail boutiques. Customers browse catalog items, search models, manage shopping carts, and place delivery orders directly inside Telegram. Shop owners manage products, inventory by size, and track orders using a modern web dashboard embedded as a Telegram Mini App.

---

## ✨ Features

### 🛒 Customer Storefront (Telegram Bot)
- **Interactive Catalog Browsing**: Explore collections categorized by brands (Nike, Jordan, Adidas, New Balance, Puma, etc.) and models.
- **Instant Search**: Type or query shoe names to quickly find matching pairs.
- **Rich Product Cards**: High-resolution image previews, pricing, descriptions, and available size variants.
- **Deep Linking Support**: Direct product links (e.g. `t.me/<bot>?start=product_5`) for marketing campaigns and channel posts.
- **Persistent Shopping Cart**: Add items by size, adjust quantities, view total cart values, and clear carts.
- **Multi-Step Checkout Flow**: Session-driven checkout collecting delivery address, recipient phone number, and special delivery instructions.
- **Order Tracking**: Customers can view past orders and monitor order status updates in real-time.
- **Store Info & FAQ**: Pre-configured answers for local delivery, payment options (Telebirr, CBE, cash on delivery), and store location.

### 📊 Admin Web Dashboard (Telegram Mini App & Browser)
- **Telegram Mini App Integration**: Launchable via `/admin` inside Telegram with secure WebApp authentication.
- **Store Analytics & Metrics**: Total sales, active orders, product counts, and low-inventory alerts.
- **Product & Inventory Management**:
  - Add and edit shoes with colorway, brand, model, description, and price.
  - Granular stock tracking by shoe size (e.g., sizes 39 through 46).
- **Telegram Channel Media Hosting**: Upload images directly via the dashboard; images are stored in a designated Telegram channel and referenced by `file_id` (zero cloud storage cost).
- **Order Management Workflow**: Inspect customer contact details, items ordered, and update status (`pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`).
- **Security & Authorization**: HMAC-SHA256 signature verification for Telegram `initData` and store owner chat ID validation.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Bot Framework** | Node.js, [Telegraf v4](https://telegraf.js.org/) |
| **Backend & API** | Express 5, CORS, Multer, Crypto (HMAC verification) |
| **Database** | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode, fast synchronous C++ binding) |
| **Admin Frontend** | React, Vite, Tailwind CSS, Lucide Icons |
| **Deployment & Containers** | Docker (multi-stage build), Fly.io (`fra` Frankfurt region for low latency to Ethiopia) |

---

## 📁 Project Structure

```text
shoe-shop-bot/
├── dashboard/                  # React + Vite Admin Dashboard (Telegram Mini App)
│   ├── src/
│   │   ├── api/                # API client functions (Products, Orders, Uploads)
│   │   ├── components/         # Reusable UI widgets, modals, layouts
│   │   ├── pages/              # Dashboard, Products, AddProduct, Orders
│   │   └── utils/              # Telegram WebApp helpers & formatters
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── data/                       # Local SQLite database storage & backups
│   ├── backups/                # Automated database backups
│   └── shop.db                 # Active SQLite database file
├── src/
│   ├── bot/                    # Telegram bot implementation
│   │   ├── handlers/           # Commands & action handlers (start, browse, cart, orders, admin, etc.)
│   │   ├── keyboards/          # Inline and reply keyboard builders
│   │   ├── middleware/         # Session state, auth, and activity logging
│   │   ├── instance.js         # Telegraf bot singleton instance
│   │   └── index.js            # Bot entry point (Polling or Webhook mode)
│   ├── config/                 # Environment validation and app constants
│   ├── db/                     # SQLite connection, schema, queries, and migrations
│   │   ├── queries/            # Data access queries (products, orders, brands, etc.)
│   │   ├── schema.sql          # SQL schema definition
│   │   └── index.js            # Database initializer & connection pool
│   ├── utils/                  # Formatters, currency helpers, and validators
│   └── web/                    # Express REST API & static server
│       ├── middleware/         # Telegram WebApp auth verification
│       ├── routes/             # REST endpoints (/products, /orders, /brands, /upload, /stats)
│       └── server.js           # Express app setup and SPA routing
├── tools/                      # Database & CLI maintenance scripts
│   ├── init-db.js              # Initialize SQLite schema
│   ├── seed-db.js              # Seed database with sample brands, models, and shoes
│   ├── backup-db.js            # Create database backup
│   ├── reset-db.js             # Reset database schema
│   ├── test-db.js              # Run database queries validation test
│   └── import.js               # Bulk import products from JSON
├── Dockerfile                  # Production container definition
├── fly.toml                    # Fly.io deployment configuration
├── package.json                # Project dependencies and script definitions
└── .env.example                # Template for environment configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v9.x or higher
- **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather)
- **Telegram User ID**: Your personal Telegram ID for the admin role (obtained via [@userinfobot](https://t.me/userinfobot))
- **Telegram Media Channel**: A private channel with your bot added as administrator to store product images

---

### 1. Installation

Clone the repository and install dependencies for both the root backend and the dashboard:

```bash
# Clone the repository
git clone <repository-url>
cd shoe-shop-bot

# Install backend dependencies
npm install

# Install dashboard frontend dependencies
cd dashboard
npm install
cd ..
```

---

### 2. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Bot Configuration
BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
OWNER_CHAT_ID=123456789

# Telegram Channel for hosting uploaded product pictures (starts with -100)
MEDIA_CHANNEL_ID=-1001234567890

# Public URL (leave empty during local polling development; set when deploying)
WEB_URL=

# Shop Details
SHOP_NAME=Amazing Shoes Addis
SHOP_PHONE=251912345678
SHOP_LOCATION=Bole, Addis Ababa
SHOP_TELEGRAM=@your_telegram_handle

# Database File Path
DB_PATH=./data/shop.db

# App Settings
PRODUCTS_PER_PAGE=10
MAX_CART_ITEMS=20

# Server Environment
NODE_ENV=development
PORT=3000
WEB_PORT=3000

# Set true to bypass Telegram WebApp auth during local browser testing
DEV_AUTH=true
```

---

### 3. Database Initialization & Seeding

Prepare the SQLite database schema and load sample shoe brands and products:

```bash
# Create database tables and indexes
npm run db:init

# (Optional) Populate with realistic seed catalog data
npm run db:seed
```

---

### 4. Running the Project

#### Development Mode (Bot + API + Dashboard)
Run the bot with nodemon (Long Polling) and the API server:
```bash
npm run dev
```

To run the full development environment with hot-reloading for both the API and the React Dashboard concurrently:
```bash
npm run dev:dashboard
```
- **Bot**: Long-polling updates from Telegram.
- **API Server**: Listening at `http://localhost:3000/api`.
- **Dashboard UI**: Running at `http://localhost:5173` (proxied to API).

#### Building for Production
Build the React dashboard for static serving by Express:
```bash
npm run build:dashboard
```

Start the production server:
```bash
npm start
```

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Runs the production bot and Express server (`src/bot/index.js`) |
| `npm run dev` | Runs the bot with `nodemon` auto-reload on changes |
| `npm run dev:api` | Runs the Express API server only with auto-reload |
| `npm run dev:dashboard` | Runs both API and Vite dashboard in parallel via `concurrently` |
| `npm run build:dashboard` | Compiles the React dashboard into `dashboard/dist` |
| `npm run db:init` | Executes schema migration to create all tables and indexes |
| `npm run db:seed` | Populates the database with default brands, models, and shoes |
| `npm run db:test` | Validates database connectivity, relations, and stock queries |
| `npm run db:backup` | Generates a timestamped backup copy in `data/backups/` |
| `npm run db:reset` | Drops and recreates the database from scratch |
| `npm run import` | Imports catalog products from a `products_import.json` file |

---

## ⚙️ Environment Variables Reference

| Variable | Required | Description |
| :--- | :---: | :--- |
| `BOT_TOKEN` | **Yes** | Telegram Bot token provided by [@BotFather](https://t.me/BotFather) |
| `OWNER_CHAT_ID` | **Yes** | Telegram numeric ID of the store owner |
| `MEDIA_CHANNEL_ID` | Recommended | Telegram channel ID (prefixed with `-100`) used to host uploaded product photos |
| `WEB_URL` | Production | HTTPS URL of your deployed application (required for Telegram WebApp) |
| `SHOP_NAME` | No | Name of the boutique displayed in messages and receipts |
| `SHOP_PHONE` | No | Customer service phone number (e.g., `2519...`) |
| `SHOP_LOCATION` | No | Physical shop address or pickup location |
| `SHOP_TELEGRAM` | No | Support Telegram handle for customer inquiries |
| `DB_PATH` | No | File path to SQLite database (Default: `./data/shop.db`) |
| `PRODUCTS_PER_PAGE`| No | Pagination limit for browse lists (Default: `10`) |
| `MAX_CART_ITEMS` | No | Maximum quantity per user cart (Default: `20`) |
| `NODE_ENV` | No | Environment mode: `development` or `production` |
| `PORT` / `WEB_PORT`| No | Port for the web and API server (Default: `3000`) |
| `DEV_AUTH` | No | Allows owner bypass header (`x-dev-user-id`) for local dashboard testing |

---

## 🚢 Deployment

### Deploying to Fly.io

The repository includes a ready-to-use [`Dockerfile`](./Dockerfile) and [`fly.toml`](./fly.toml) configured with a persistent storage volume for the SQLite database.

1. **Install Fly CLI and log in**:
   ```bash
   fly auth login
   ```

2. **Launch the app**:
   ```bash
   fly launch --no-deploy
   ```

3. **Create a persistent volume** for SQLite database storage:
   ```bash
   fly volumes create teleshop_data --size 1 --region fra
   ```

4. **Set secrets on Fly.io**:
   ```bash
   fly secrets set BOT_TOKEN="your_bot_token" \
                   OWNER_CHAT_ID="your_telegram_id" \
                   MEDIA_CHANNEL_ID="-100xxxxxxxxxx" \
                   WEB_URL="https://your-app-name.fly.dev"
   ```

5. **Deploy**:
   ```bash
   fly deploy
   ```

When `NODE_ENV=production` and `WEB_URL` are configured, the bot automatically switches from long-polling to Telegram Webhook mode with endpoint `/webhook/<BOT_TOKEN>` and serves the built dashboard at `/admin`.

---

## 🔒 Security Best Practices

- **Never commit `.env`**: `.gitignore` is configured to prevent committing environment variables, secret tokens, and private database files.
- **Admin Verification**: The admin API strictly verifies the cryptographic HMAC signature sent by the Telegram WebApp client against `BOT_TOKEN`.
- **Channel Access**: Ensure your bot is an administrator in the media channel with permission to post messages and photos.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
