# T-Bill Desk

T-Bill Desk is a small full-stack demo for exploring the U.S. Treasury yield curve and submitting simulated Treasury orders.

It:

- Fetches daily par yield curve data from the official U.S. Treasury XML feed.
- Plots maturities from 1 month through 30 years.
- Lets a user choose a maturity and submit a paper order amount.
- Stores order history in Supabase.
- Uses anonymous Supabase Auth so the demo does not require account creation.

> This is a demonstration only. Orders are not sent to a brokerage or TreasuryDirect.

## Prerequisites

Install these before starting:

- Node.js 20 or newer
- npm
- Git
- A Supabase account
- The Supabase CLI

You do not need Docker for the hosted Supabase workflow below. Docker is only needed if you want to run the entire Supabase stack locally with `supabase start`.

## 1. Clone the repository

```bash
git clone https://github.com/mpaustin/t-bill-orders.git
cd t-bill-orders
```

If you already have the repository, make sure you are in the checkout you intend to run:

```bash
pwd
```

## 2. Install the Supabase CLI

Use the native CLI on macOS. Do not use `npx supabase` on macOS if it reports a `darwin-x64` or `darwin-arm64` binary mismatch.

### Homebrew

```bash
brew install supabase/tap/supabase
supabase --version
```

If Homebrew cannot install the formula because of an Xcode/toolchain issue, use the official standalone binary instead. This example selects the correct binary for Apple Silicon or Intel macOS:

```bash
SUPABASE_CLI_VERSION=2.113.0
SUPABASE_MACHINE_ARCH="$(uname -m)"

if [ "$SUPABASE_MACHINE_ARCH" = "arm64" ]; then
  SUPABASE_CLI_ASSET="darwin_arm64"
else
  SUPABASE_CLI_ASSET="darwin_amd64"
fi

curl -L "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_${SUPABASE_CLI_ASSET}.tar.gz" \
  -o /tmp/supabase-cli.tar.gz

tar -xzf /tmp/supabase-cli.tar.gz -C /tmp
mkdir -p "$HOME/bin"
install -m 0755 /tmp/supabase "$HOME/bin/supabase"
export PATH="$HOME/bin:$PATH"

supabase --version
```

The CLI is available from the [official Supabase CLI releases](https://github.com/supabase/cli/releases) and [installation documentation](https://supabase.com/docs/guides/local-development/cli/getting-started).

## 3. Authenticate the Supabase CLI

Run:

```bash
supabase login
```

The CLI opens a browser login page and displays a verification code. Complete the browser login, then paste the verification code back into the terminal prompt.

You can also authenticate with a personal access token:

```bash
supabase login --token YOUR_PERSONAL_ACCESS_TOKEN
```

Create personal access tokens at [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens). A project API key is not the same thing as a CLI personal access token.

Verify authentication:

```bash
supabase projects list
```

## 4. Create or choose a Supabase project

List your organizations:

```bash
supabase orgs list
```

List existing projects:

```bash
supabase projects list
```

If you need to create a new project, set a database password and run:

```bash
read -s SUPABASE_DB_PASSWORD
export SUPABASE_DB_PASSWORD

supabase projects create t-bill-orders \
  --org-id YOUR_ORGANIZATION_ID \
  --region us-east-2 \
  --db-password "$SUPABASE_DB_PASSWORD"

unset SUPABASE_DB_PASSWORD
```

Run `supabase projects list` again and copy the project reference (`ref`) for the project you want to use.

## 5. Link the repository to Supabase

Set the project reference in your current terminal session:

```bash
export SUPABASE_PROJECT_REF=YOUR_PROJECT_REF
```

Link the local repository:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
```

The repository already contains `supabase/config.toml` and the database migration under `supabase/migrations`.

## 6. Apply the database and Auth configuration

Push the checked-in Supabase configuration. This enables anonymous sign-ins for the demo:

```bash
supabase config push --project-ref "$SUPABASE_PROJECT_REF"
```

Apply the `orders` table and row-level security policies:

```bash
supabase db push
```

Confirm the migration was applied:

```bash
supabase migration list --linked
```

The migration creates:

- `public.orders`
- A `user_id` column tied to Supabase Auth users
- Term and minimum-amount constraints
- Row-level security policies restricting users to their own orders

The equivalent SQL is available in [`supabase/schema.sql`](./supabase/schema.sql).

## 7. Create local environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Retrieve the project keys:

```bash
supabase projects api-keys --project-ref "$SUPABASE_PROJECT_REF"
```

Edit `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Use the `anon` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the `service_role` key for `SUPABASE_SERVICE_ROLE_KEY`. The application currently uses these legacy key names.

Security requirements:

- Never commit `.env.local`.
- Never put the service-role key in a `NEXT_PUBLIC_` variable.
- Never paste the service-role key into GitHub, screenshots, or a public issue.

## 8. Install dependencies and run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If port 3000 is already in use:

```bash
npm run dev -- --port 3001
```

Use the same exact host and port each time. `localhost:3000`, `localhost:3001`, and `127.0.0.1:3000` are different browser origins and therefore have different anonymous-user sessions.

## 9. Verify the app

1. Confirm the yield curve loads.
2. Choose a maturity and enter an amount of at least `$100`.
3. Submit a paper order.
4. Confirm it appears in Order History.
5. Refresh the page and confirm the order is still present.
6. In Supabase, open **Table Editor → orders** to inspect the stored row.

The app uses an anonymous Supabase user. Restarting the Next.js server does not create a new user; the browser session is retained. Clearing browser data, using a different browser, using an incognito window, or changing the origin creates a different anonymous user and therefore a different order history.

If the Treasury feed is unavailable, the app displays a clearly labeled demo curve so the order workflow remains reviewable.

## Useful commands

```bash
# Run the app
npm run dev

# Validate a production build
npm run build

# Check Supabase migration state
supabase migration list --linked

# Preview pending database migrations
supabase db push --dry-run

# Apply pending database migrations
supabase db push
```

## Troubleshooting

### `No matching Supabase CLI binary package found`

Do not use `npx supabase` on macOS when npm is running under Rosetta or the package lacks your architecture. Install the native CLI with Homebrew or the standalone binary and use `supabase` directly.

Check your architecture:

```bash
uname -m
node -p "process.arch"
```

On an Apple Silicon Mac, `uname -m` should report `arm64`. If Node reports `x64`, reopen Terminal/iTerm without “Open using Rosetta” enabled or use the native standalone CLI.

### Order history is empty after switching URLs

Anonymous sessions are scoped to the browser origin. Use the same URL and port that created the order.

### Supabase changes are not visible

Restart the Next.js process after editing `.env.local`:

```bash
npm run dev
```

### `supabase db push` mentions Docker

For a hosted project, the remote migration can still apply. Docker is only required for commands that run the local Supabase stack, such as `supabase start`.

## Project structure

```text
app/page.tsx             Main dashboard and order flow
app/api/treasury         Treasury feed proxy and fallback
app/api/orders           Supabase-backed order API
components/yield-chart   Lightweight SVG curve chart
lib/treasury.ts          Feed URL, parser, and demo curve
supabase/config.toml     Supabase CLI and Auth configuration
supabase/migrations      Versioned database migrations
supabase/schema.sql      SQL equivalent of the orders schema
```
