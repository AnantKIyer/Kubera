# Kubera

Personal finance PWA for day-to-day money management (INR-first). Track transactions, accounts, budgets, subscriptions, loans/EMIs, investments, shared expense groups, and analytics — backed by Convex Auth and a Convex database.

## Features

- **Auth** — Sign up / sign in with email, username, or phone; password reset via phone OTP
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
| Auth | Convex Auth (custom password provider) |
| PWA | `@ducanh2912/next-pwa` |
| FX rates | [Frankfurter](https://www.frankfurter.app/) |
| Optional SMS | Twilio (password-reset OTP) |

## Prerequisites

- Node.js 18+
- npm
- A [Convex](https://www.convex.dev/) account

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

### 3. Configure Convex Auth

One-time setup for JWT keys and local site URL:

```bash
npm run setup:auth
```

This sets `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL=http://localhost:3000` on your Convex deployment.

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

### Optional: Twilio SMS (password reset OTP)

Set these on the Convex deployment if you want SMS OTP delivery:

```bash
npx convex env set TWILIO_ACCOUNT_SID "..."
npx convex env set TWILIO_AUTH_TOKEN "..."
npx convex env set TWILIO_PHONE_NUMBER "..."
```

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js frontend |
| `npm run dev:backend` | Convex backend (`convex dev`) |
| `npm run setup:auth` | Generate and set Convex Auth JWT env vars |
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
│   ├── (auth)/          # Sign in, sign up, forgot password
│   ├── (app)/           # Authenticated screens (dashboard, transactions, …)
│   ├── offline/         # PWA offline fallback
│   ├── layout.tsx
│   ├── providers.tsx
│   └── manifest.ts
├── components/          # UI, forms, charts, layout, feature widgets
├── convex/              # Schema, auth, and domain functions
│   ├── schema.ts
│   ├── transactions.ts, accounts.ts, budgets.ts, …
│   ├── groups.ts
│   ├── currency.ts
│   └── lib/             # Shared server helpers (EMI, encryption, …)
├── lib/                 # Client/shared helpers (format, dates, nav, …)
├── scripts/             # Auth setup, encryption key, PWA icons
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
| `/settings` | Profile & password |
| `/sign-in`, `/sign-up`, `/forgot-password` | Auth |

## Production build

```bash
npm run build
npm start
```

PWA service worker registration is disabled in development and enabled in production builds.

## License

MIT
