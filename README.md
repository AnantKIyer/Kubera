# Kubera

Personal finance PWA for day-to-day money management (INR-first). Track transactions, accounts, budgets, subscriptions, loans/EMIs, investments, shared expense groups, and analytics — backed by Clerk auth and a Convex database.

## Features

- **Auth** — Sign up / sign in via Clerk (email/password and Clerk’s reset flow); Convex trusts Clerk JWTs
- **Dashboard** — Monthly balance, income, expenses, savings rate, charts, and recent activity
- **Transactions** — Income/expense CRUD, search/filters, categories, accounts, foreign-currency amounts
- **Accounts** — Bank, credit, debit, and wallet accounts with balances and credit utilization
- **Budgets** — Monthly category budgets with spend progress
- **Subscriptions** — Recurring charges, billing cycles, pause/resume, burn tracking
- **EMIs / loans** — Loan tracking, EMI calculation, payment progress
- **Investments** — SIP, mutual funds, stocks, gold/silver, LIC, crypto, RD, FD
- **Groups** — Shared expenses with join requests, equal/custom/percent splits, settlement recording, and balances
- **Analytics** — Trends, category breakdowns, projections, portfolio summary
- **PWA** — Installable app with offline fallback page

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts |
| Backend | Convex (database, queries/mutations/actions, file storage) |
| Auth | [Clerk](https://clerk.com/) (JWT → Convex) |
| PWA | `@ducanh2912/next-pwa` |
| FX rates | [Frankfurter](https://www.frankfurter.app/) |

## Prerequisites

- Node.js 18+
- npm
- A [Convex](https://www.convex.dev/) account
- A [Clerk](https://clerk.com/) application (with the Convex integration enabled)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start Convex (backend)

In one terminal:

```bash
npx convex dev
```

This creates/links a Convex deployment and writes `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, and `NEXT_PUBLIC_CONVEX_SITE_URL` into `.env.local`. You can also copy `.env.local.example` and fill those values manually.

### 3. Configure Clerk

1. Create a Clerk application and **activate the Convex integration** in the Clerk Dashboard (sets session `aud` to `convex` when available).
2. Ensure a JWT template named `convex` with claim `"aud": "convex"` exists (Clerk Dashboard → JWT Templates, or create via CLI). Prefer a **3600s** lifetime to reduce token-refresh flicker. `ConvexProviderWithClerk` uses the session token when `aud === "convex"`, otherwise requests the `convex` template.
3. Copy the Clerk Frontend API URL (e.g. `https://verb-noun-00.clerk.accounts.dev`).
4. Set it on Convex:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://YOUR_INSTANCE.clerk.accounts.dev"
```

Replace any placeholder value (e.g. `REPLACE_WITH_CLERK_FRONTEND_API`) with your real Frontend API URL from Clerk → API Keys. Keep the env name `CLERK_JWT_ISSUER_DOMAIN` (used by [`convex/auth.config.ts`](convex/auth.config.ts)).

5. Add Clerk keys to `.env.local` (see `.env.local.example`):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

Existing Convex user rows are **linked by email** when the same address signs in with Clerk (`clerkId` is stored on `users`), only if that row has no other `clerkId`. Passwords from the old Convex Auth system do not carry over — use Clerk sign-up / reset with the same email.

### 4. Start the Next.js app

In another terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: field encryption

Sensitive string fields can be encrypted at rest in Convex with **AES-256-GCM** (`convex/lib/encryption.ts`). Ciphertext is stored with an `enc:v1:` prefix. The key lives only in Convex env — not in `.env.local`.

#### Generate and set the key

```bash
node scripts/generate-encryption-key.mjs
npx convex env set DATA_ENCRYPTION_KEY "<generated-key>"
```

The key must be a **base64-encoded 32-byte** value. Keep a secure backup (password manager / secrets vault). Losing the key means encrypted fields cannot be recovered.

#### Behavior

| Situation | Result |
|-----------|--------|
| Key **not** set | Writes stay plaintext; app runs normally |
| Key set | New/updated sensitive fields are encrypted on write |
| Legacy plaintext rows | Still readable after enabling encryption (decrypt is a no-op for non-`enc:v1:` values) |
| Encrypted row, key missing | Decrypt throws — set `DATA_ENCRYPTION_KEY` before serving encrypted data |
| Already-encrypted value | Re-encrypt is a no-op (idempotent) |

#### Fields covered

| Domain | Encrypted fields |
|--------|------------------|
| Accounts | `name`, `institution`, `lastFour` |
| Transactions | `description` |
| Subscriptions | `name`, `notes` |
| EMIs | `name`, `lender`, `notes` |
| Investments | `name`, `notes` |
| Groups | `name`, `description` |
| Group expenses | `description` |

Amounts, dates, categories, and other non-string identifiers are **not** encrypted.

#### Key rotation

There is **no dual-key / automatic rotation** yet. Changing `DATA_ENCRYPTION_KEY` without migrating data will make existing `enc:v1:` values undecryptable.

Safe approach today:

1. Keep the current key available until migration is done.
2. To rotate: decrypt with the old key, set the new key, then re-save (re-encrypt) each sensitive document.
3. Do not delete the old key from your vault until every encrypted row has been rewritten.

#### Validate locally

```bash
npm run test:encryption
```

This smoke-tests round-trip encrypt/decrypt, plaintext fallback, legacy passthrough, missing-key errors, and wrong-key failure — without needing a Convex deployment.

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js frontend |
| `npm run dev:backend` | Convex backend (`convex dev`) |
| `npm run test:encryption` | Smoke-test AES-GCM field encryption helpers |
| `npm run convex:codegen` | Regenerate Convex client types |
| `npm run pwa:icons` | Generate PWA icons |
| `npm run build` | Generate icons + production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

## Project structure

```
Kubera/
├── app/
│   ├── (auth)/          # Clerk sign-in / sign-up
│   ├── (app)/           # Authenticated screens (dashboard, transactions, …)
│   ├── offline/         # PWA offline fallback
│   ├── layout.tsx
│   ├── providers.tsx    # ClerkProvider + ConvexProviderWithClerk
│   └── manifest.ts
├── middleware.ts        # clerkMiddleware route protection
├── components/          # UI, forms, charts, layout, feature widgets
├── convex/              # Schema and domain functions
│   ├── auth.config.ts   # Clerk JWT issuer for Convex
│   ├── schema.ts
│   ├── users.ts         # ensureCurrentUser (Clerk → users row)
│   └── lib/             # Shared server helpers (user, EMI, encryption, …)
├── lib/                 # Client/shared helpers (format, dates, nav, …)
├── scripts/             # Encryption key, PWA icons, verify helpers
└── public/              # Static assets / generated PWA output
```

There is no Next.js `app/api` layer — the client talks to Convex directly.

## App routes

| Route | Screen |
|-------|--------|
| `/` | Dashboard |
| `/transactions` | Transactions |
| `/accounts` | Accounts (includes EMIs) |
| `/groups` | Shared expense groups |
| `/subscriptions` | Subscriptions |
| `/investments` | Investments |
| `/analytics` | Analytics |
| `/budgets` | Budgets |
| `/categories` | Categories |
| `/settings` | Profile (password via Clerk account) |
| `/sign-in`, `/sign-up` | Clerk auth (password reset is inside Clerk sign-in) |

## Production build

```bash
npm run build
npm start
```

PWA service worker registration is disabled in development and enabled in production builds.

## License

MIT
