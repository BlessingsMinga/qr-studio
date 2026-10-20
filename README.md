# QR Studio

Scan QR codes & barcodes with your camera, create custom branded QR codes, and share them instantly. All activity is saved to a local SQLite database.

## Features

- **QR & barcode scanner** — live camera scanning powered by ZXing, with support for **15 formats** (QR Code, Data Matrix, Aztec, PDF 417, Code 128/39/93, Codabar, ITF, EAN-13, EAN-8, UPC-A, UPC-E, RSS-14, RSS Expanded).
  - Front/rear camera switching, torch toggle, and a *Precision / Fast* decode toggle
  - Scan from an uploaded image file as a fallback
  - Results are auto-classified (URL, email, phone, SMS, WiFi, contact, location, crypto, etc.) with quick-action links
- **QR generator** — create codes for **7 content types**: Text, URL, Email, Phone, SMS, WiFi, and vCard (contact).
  - Error-correction level (L/M/Q/H), margin, and size controls
  - Color customization with presets (Slate, Emerald, Rose, Amber, Violet, Teal, Inverted) or custom colors
  - Live preview, download as **PNG**, and get the **SVG** markup
- **Sharing** — copy the content, copy a shareable link (`?share=...` payload), share via the native Web Share API (including the QR image file), or download the QR image
- **History** — everything is stored server-side in SQLite:
  - Filter by *All / Scanned / Created / ★ Favorites*
  - Debounced full-text search across content, notes, and format
  - Star favorites, add/clear notes, delete individual items or clear everything
- **Dark mode** — theme toggle persisted to `localStorage`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack, `output: "standalone"`) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite |
| Scanner | `@zxing/browser` + `@zxing/library` |
| Generator | `qrcode` (PNG data-URL / SVG) |
| Package manager | Bun (recommended) — npm/yarn/pnpm work too |

## Getting Started

### Prerequisites

- **Node.js 20+** — https://nodejs.org
- **Bun** (recommended) — https://bun.sh

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Setup

```bash
# 1. Clone & install dependencies
git clone https://github.com/BlessingsMinga/qr-studio.git
cd qr-studio
bun install              # or: npm install

# 2. Configure environment (SQLite path)
cp .env.example .env     # DATABASE_URL="file:./db/custom.db"

# 3. Create the database & generate the Prisma client
bun run db:push          # or: npx prisma db push

# 4. Start the dev server
bun run dev              # or: npm run dev
```

Open http://localhost:3000.

> **Note:** the camera requires a **secure context** (HTTPS or `localhost`). `localhost` works during development; on a deployed HTTPS domain the scanner works automatically.

### Without Bun

If you prefer npm:

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the dev server on port 3000 (logs appended to `dev.log`) |
| `bun run build` | Production build (`next build`) + assembles the standalone output |
| `bun run start` | Serve the production standalone build (logs to `server.log`) |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Apply Prisma schema changes to SQLite |
| `bun run db:generate` | Regenerate the Prisma client |
| `bun run db:migrate` | Create/apply a Prisma migration |
| `bun run db:reset` | Reset the database (⚠️ deletes all data) |
| `bun test` | Run unit tests (sharing helpers) |

## Project Structure

```
qr-studio/
├── prisma/
│   ├── schema.prisma            # ScanHistory model
│   └── db/custom.db             # SQLite database file
├── public/                      # Static assets (logo.svg, robots.txt)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout, fonts, metadata
│   │   ├── page.tsx             # Main page (Scanner / Create / History tabs)
│   │   ├── globals.css          # Tailwind + theme variables + animations
│   │   └── api/
│   │       ├── route.ts         # Health check (GET)
│   │       ├── scans/route.ts   # History list / create / clear-all
│   │       ├── scans/[id]/route.ts  # Single item get/update/delete
│   │       └── generate/route.ts    # Server-side QR generation (fallback)
│   ├── components/
│   │   ├── scanner/qr-scanner.tsx     # Live camera + image-upload scanner
│   │   ├── generator/qr-generator.tsx # 7 content types + styling
│   │   ├── history/history-view.tsx   # Search / filter / star / delete
│   │   ├── share-menu.tsx             # Web Share API + shareable links
│   │   ├── theme-provider.tsx         # next-themes dark mode
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── utils.ts            # cn() helper
│   │   └── qr/
│   │       ├── types.ts        # Content builders + classifier
│   │       ├── share.ts        # Share-link encode/decode helpers
│   │       └── share.test.ts   # Unit tests (bun:test)
│   └── hooks/                  # use-mobile, use-toast
├── .env.example                # DATABASE_URL template
├── components.json             # shadcn/ui config
├── next.config.ts
├── package.json
└── tsconfig.json
```

## API

All API routes live under `/api` and return JSON.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api` | Health check — `{ message: "Hello, world!" }` |
| `GET` | `/api/scans` | List history items. Query params: `type` (`scan`\|`generated`), `q` (search across content, note, format) |
| `POST` | `/api/scans` | Create a history item. Body: `type`, `format`, `content`, plus optional `rawValue`, `note`, `options`, `imageData`, `isFavorite` |
| `DELETE` | `/api/scans` | Clear history. Optional `?type=scan\|generated` to clear only one group |
| `GET` | `/api/scans/[id]` | Get a single history item |
| `PATCH` | `/api/scans/[id]` | Update a history item — accepts `note` and/or `isFavorite` |
| `DELETE` | `/api/scans/[id]` | Delete a single history item |
| `POST` | `/api/generate` | Server-side QR generation (fallback). Body: `content` (required), plus optional `save`, `format`, `note`, `options`. Returns `{ dataUrl, item }` |

### Data model

```prisma
model ScanHistory {
  id         String   @id @default(cuid())
  type       String   // "scan" | "generated"
  format     String   // e.g. "QR_CODE", "CODE_128", "EAN_13"
  content    String   // decoded text / source text
  rawValue   String?  // optional raw value
  note       String?  // user note
  options    String?  // generator options (JSON string)
  imageData  String?  // preview data URL for generated codes
  isFavorite Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([type])
  @@index([createdAt])
}
```

## Notes & Deployment

- **Database** — a single SQLite file at `prisma/db/custom.db`. The `DATABASE_URL="file:./db/custom.db"` path resolves **relative to the `prisma/` folder**. Back up by copying the file.
- **History** is stored server-side (SQLite via Prisma). For a fully offline PWA, swap the Prisma calls for IndexedDB on the client.
- **Deploying** — the app deploys to any Node host (Vercel, Railway, Fly.io, Render). The build produces a self-contained `.next/standalone` output. Note that **SQLite won't persist on serverless platforms like Vercel** — switch the Prisma datasource to PostgreSQL (or Vercel Postgres / Neon) in that case.
- **Type-checking** is disabled during `next build` (`typescript.ignoreBuildErrors` in `next.config.ts`), so run `bun run lint` and `bun test` in CI to catch issues.

## License

MIT — yours to use and modify freely.
