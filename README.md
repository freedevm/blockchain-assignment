# Worklo — Blockchain Assignment

Welcome to the Worklo Blockchain Assignment!

Worklo is a PSA (Professional Services Automation) platform for managing projects, tasks, time tracking, and client relationships. In this exercise you'll add a simple on-chain reward feature to the existing codebase.

Everything runs locally on a Hardhat node. No real funds, no wallets, no risk.

Focus on quality over completeness. Submit what you have when time is up.

If you have any questions, feel free to reach out — we're happy to clarify anything.

## Time Consideration     

This assignment is scoped for 3–4 hours. If you hit that limit, submit what you have and use README.md to describe what you'd finish next.

## Getting Started

You'll need Node.js 18+ and a free Supabase project.

```bash
# 1. Fork this repo and clone your fork
npm install

# 2. Set up environment variables
cp .env.local.template .env.local
# Fill in your Supabase URL and keys in .env.local

# 3. Run the database schema
# → Supabase dashboard → SQL Editor → paste and run supabase/schema.sql

# 4. Start a local Hardhat node (separate terminal)
npx hardhat node

# 5. Deploy the Worklo Points token to the local Hardhat node
npm run blockchain:deploy
# Copy the deployed contract address into WPT_TOKEN_ADDRESS in .env.local.
# Use the first private key printed by `npx hardhat node` for WPT_OWNER_PRIVATE_KEY.

# 6. Start the dev server
npm run dev              # Next.js on http://localhost:3000
```

## Environment Variables

Supabase values are required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_or_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Local blockchain reward values:

```bash
HARDHAT_RPC_URL=http://127.0.0.1:8545
WPT_TOKEN_ADDRESS=0x...
WPT_OWNER_PRIVATE_KEY=0x...
WPT_REWARD_RECIPIENT_ADDRESS=
WPT_REWARD_AMOUNT=10
```

`WPT_REWARD_RECIPIENT_ADDRESS` is optional. If it is empty, rewards are minted to the owner wallet used by `WPT_OWNER_PRIVATE_KEY`.

## Reward Feature

This implementation adds a local Worklo Points (`WPT`) reward flow for completed tasks:

- `contracts/WorkloPoints.sol` is an OpenZeppelin ERC-20 contract.
- Only the owner can call `mint(address to, uint256 amount)`.
- `POST /api/tasks/[taskId]/reward` authenticates the user, fetches the task, checks project access, mints WPT with `ethers.js`, saves `tx_hash` to Supabase, and returns `{ txHash }`.
- The project detail page shows `Reward WPT` next to completed tasks, `Rewarding...` while the transaction is pending, inline errors on failure, and a `Rewarded` badge with the transaction hash after success.

## Testing The Reward Flow

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Start the local chain with `npx hardhat node`.
3. Deploy WPT with `npm run blockchain:deploy`.
4. Copy the deployed contract address and owner private key into `.env.local`.
5. Start the app with `npm run dev`.
6. Open a project detail page and find a task with status `done` or `complete`.
7. Click `Reward WPT`.
8. Confirm the task shows a `Rewarded` badge and the `tasks.tx_hash` value is saved in Supabase.

Useful checks:

```bash
npm run blockchain:compile
npx eslint app/api/tasks/[taskId]/reward/route.ts app/projects/[projectId]/page.tsx hardhat.config.js scripts/deploy-wpt.js
```

## With More Time

- Add contract tests for owner-only mint access.
- Add API tests for auth, task status validation, and duplicate rewards.
- Store a wallet address per user instead of using a configured local recipient.
- Add a dedicated reward ledger table for stronger reward history and duplicate prevention.

## Task Overview

**1. Contract** — Write a minimal ERC-20 using OpenZeppelin where only the `owner` can `mint(address to, uint256 amount)`. Deploy to the local Hardhat node.

**2. API Route** — Add `POST /api/tasks/[taskId]/reward` under `app/api/tasks/[taskId]/` (follow the existing route pattern in `app/api/roles/route.js`). Authenticate, fetch the task, call `mint()` via `ethers.js`, save `tx_hash` to Supabase, return `{ txHash }`.

**3. Frontend** — On the project detail page, next to each completed task: a **"Reward WPT"** button, a loading state while the tx is in flight, and a **"Rewarded"** badge with the `txHash` on success. Use `apiFetch` from `lib/api-config.ts`.

## How We Evaluate 

- Contract correctness and access control
- Backend route following existing auth and error handling patterns
- Frontend states: loading, success, error
- Code quality and consistency with the existing codebase
- README clarity

## Submission Guidelines

Don't open a PR to this repo. Share your fork URL.

In your forked repository, include a README that explains:

- How to run your project.
- What you'd improve or do differently if you had more time.

Make sure your code runs locally based on the instructions in your README.
