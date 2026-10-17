# QR Studio

Scan QR codes & barcodes with your camera, create custom branded QR codes, and share them instantly. All history is saved locally in a SQLite database.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite
- **Scanner**: @zxing/browser + @zxing/library (15+ barcode formats)
- **Generator**: qrcode (PNG/SVG)
- **Package manager**: Bun (recommended) — or npm/yarn/pnpm

## Prerequisites

1. **Node.js 18+** (20+ recommended) — https://nodejs.org
2. **Bun** (recommended for exact dependency versions) — https://bun.sh
   ```bash
   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash
   # Windows (PowerShell)
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

## Setup in VS Code

1. **Unzip** this folder somewhere permanent, e.g. `~/projects/qr-studio`.

2. **Open in VS Code**:
   ```bash
   cd qr-studio
   code .
   ```
   (Or use File → Open Folder in VS Code.)

3. **Recommended VS Code extensions** (install from the Extensions panel, Ctrl+Shift+X):
   - **ESLint** (dbaeumer.vscode-eslint) — shows lint errors inline
   - **Prettier - Code formatter** (esbenp.prettier-vscode)
   - **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss) — autocomplete for classes
   - **Prisma** (Prisma.prisma) — schema highlighting + formatting
   - **PostgreSQL/SQLite** if you want to browse the DB visually
   - Optional: **Console Ninja**, **Error Lens**

4. **Install dependencies** (in VS Code's integrated terminal — Ctrl+` to open it):
   ```bash
   bun install
   ```
   If you don't have Bun, use npm instead: `npm install`

5. **Create the database**:
   ```bash
   bun run db:push
   # or: npx prisma db push
   ```

6. **Start the dev server**:
   ```bash
   bun run dev
   # or: npm run dev
   ```

7. **Open** http://localhost:3000 in your browser.

## Project Structure

```
qr-studio/
├── prisma/
│   └── schema.prisma        # ScanHistory database model
├── public/                  # Static assets
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout, fonts, metadata
│   │   ├── page.tsx         # Main page (Scanner / Create / History tabs)
│   │   ├── globals.css      # Tailwind + theme variables + animations
│   │   └── api/
│   │       ├── scans/       # GET/POST/DELETE history; PATCH/DELETE by id
│   │       └── generate/    # Server-side QR generation (fallback)
│   ├── components/
│   │   ├── scanner/qr-scanner.tsx     # Camera + image-upload scanner
│   │   ├── generator/qr-generator.tsx # 7 content types + styling
│   │   ├── history/history-view.tsx   # Search/filter/star/delete
│   │   ├── share-menu.tsx             # Web Share API + shareable links
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── db.ts             # Prisma client singleton
│   │   ├── qr/types.ts       # Content builders + classifier
│   │   └── utils.ts          # cn() helper
│   └── hooks/                # use-mobile, use-toast
├── .env                      # DATABASE_URL (SQLite path)
├── components.json           # shadcn/ui config
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Useful Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server at localhost:3000 |
| `bun run build` | Production build |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Apply schema changes to SQLite |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:migrate` | Create a DB migration |
| `bun run db:reset` | Reset DB (⚠️ deletes data) |

## Notes

- The database is a single file at `db/custom.db`. Back it up by copying the file.
- History is stored server-side (SQLite via Prisma). For a true offline PWA, you'd swap Prisma calls for IndexedDB on the client.
- The scanner requires a secure context (HTTPS or localhost) for camera access. localhost works during development.
- Dark mode is toggled via the sun/moon button in the header; preference is saved to localStorage.

## Deploy

This app deploys cleanly to any Node host (Vercel, Railway, Fly.io, Render).
For Vercel, note that SQLite won't persist — switch the Prisma datasource to PostgreSQL or use Vercel Postgres / Neon.

```bash
# Build for production
bun run build
bun run start
```

## License

MIT — yours to use and modify freely.
