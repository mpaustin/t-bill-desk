# T-Bill Desk

T-Bill Desk is a small full-stack take-home MVP for exploring the U.S. Treasury yield curve and submitting simulated Treasury orders.

## What it does

- Pulls the latest daily par yield curve from the official U.S. Treasury XML feed.
- Plots maturities from 1 month through 30 years.
- Lets a user choose a maturity and order amount.
- Stores and displays submitted paper orders.
- Uses Supabase when configured, with an in-memory local fallback so the app can be reviewed without credentials.

> This is a demonstration only. Orders are not sent to a brokerage or TreasuryDirect.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app fetches live Treasury data through `/api/treasury`. If the Treasury feed is unavailable, the app displays a clearly labeled demo curve so the rest of the workflow remains reviewable.

## Supabase setup

1. Create a Supabase project.
2. In the SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. Enable Anonymous Sign-Ins under Authentication → Providers.
4. Copy `.env.example` to `.env.local` and fill in the project URL, public anon key, and service-role key:

```bash
cp .env.example .env.local
```

The service-role key is used only by the server-side order API. Never expose it as a `NEXT_PUBLIC_` variable or commit it.

## Project structure

```text
app/page.tsx             Main dashboard and order flow
app/api/treasury         Treasury feed proxy and fallback
app/api/orders           Supabase-backed order API
components/yield-chart   Lightweight SVG curve chart
lib/treasury.ts          Feed URL, parser, and demo curve
supabase/schema.sql      Orders table and RLS policies
```

## Verification

```bash
npm run build
```

The local fallback makes the app deterministic to review, while the app uses the official Treasury feed whenever available.
