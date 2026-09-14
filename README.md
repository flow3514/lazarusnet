# Lazarus Net

**Compute belongs to the people.**

Lazarus Net is a community-owned compute network for Robinhood Chain. Trading activity generates protocol fees, a configurable share funds a Compute Treasury, the treasury buys GPU capacity, open-weight models run on it, holders receive compute credits by tier, and paid external usage recycles revenue back into the protocol.

Nothing in this application is fabricated. When a data source is not configured the UI says so ("Awaiting live network data", "Not connected", "Token contract not configured", "Awaiting treasury contract integration") instead of showing a number.

## Live

| | |
| --- | --- |
| Site | https://www.lazarusnet.org |
| X | https://x.com/LazarusNetRH |
| Repo | https://github.com/flow3514/lazarusnet |
| $LAZARUS | `0x41b305a081ad8d54fa3b54896fe6b8837599e662` on Robinhood Chain (4663) |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn-style UI primitives · Framer Motion · wagmi + viem · Prisma + PostgreSQL · Zod · Recharts.

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in what you have; blanks render honest "not configured" states
npm run db:local                  # real local PostgreSQL on :5433 (embedded-postgres), keep it running
npm run db:push                   # create the schema
npm run dev                       # http://localhost:10200
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, and `node scripts/e2e.mjs` against a running server (signs in with a throwaway key, runs jobs, exercises the developer API).

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (Neon, Supabase or the local server) |
| `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_EXPLORER_URL` | Robinhood Chain (or any EVM chain). No RPC URL is invented; blank = "Chain not configured" |
| `NEXT_PUBLIC_TOKEN_CONTRACT` | ERC-20 read with `balanceOf(address)` for holder tiers. Blank = "Token contract not configured" |
| `NEXT_PUBLIC_TREASURY_CONTRACT` | Contract exposing `totalProtocolFees()`, `computeAllocationBps()`, `totalComputeSpend()`. Blank = "Awaiting treasury contract integration" |
| `GPU_PROVIDER` | `openai-compatible` (vLLM, TGI, Together, Fireworks, OpenRouter…), `ollama`, or `mock` (refuses to run in production) |
| `GPU_PROVIDER_ENDPOINT`, `GPU_PROVIDER_API_KEY` | Server-only; never reach the browser |
| `AUTH_SECRET` | 32+ random bytes for HMAC-signed session cookies |
| `ADMIN_WALLETS` | Comma-separated wallets allowed to change protocol configuration |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional; enables WalletConnect next to injected wallets |

## What actually operates

- **Wallet authentication** — nonce → EIP-191 signature → verified server-side → httpOnly signed cookie. Route handlers never trust a body-supplied address.
- **Token balance reading** — `balanceOf(address)` on the configured ERC-20 at the current block; tier resolution from `config/tokenomics.ts` (admin-overridable).
- **Holder credit engine** — per-epoch allocations (unique ledger index prevents double credit), row-locked reservations, real-usage settlement, non-negative balances, full ledger.
- **Inference adapters** — `src/lib/providers/*` implement one interface (`getAvailableModels`, `getCapacity`, `runInference`, `getJobStatus`, `getUsage`, `getBilling`, `health`).
- **Job tracking** — `ComputeJob` rows with reservation/charge/tokens/latency/idempotency; `/jobs` page and `/api/jobs`.
- **Model registry** — seeded from `config/models.ts`, health-checked against the provider by `/api/models/status`; only models the provider actually lists become ONLINE.
- **Treasury data architecture** — `src/lib/treasury` reads the contract when configured and admin-recorded events (with tx hashes) otherwise.
- **Revenue accounting** — every completed job writes usage + a metered revenue/subsidy record; `/api/revenue/summary` aggregates them, charts appear only when activity exists.
- **Developer API** — `POST /api/v1/inference` with hashed Bearer keys, per-key/wallet/IP rate limits (HTTP 429 + Retry-After).
- **Admin** — `/admin` (allowlisted wallets): tiers, epoch, allocation bps, provider preference, model enable/disable/maintenance/credit cost, manual ledger entries, treasury event records.

## Going live (no demo data)

1. **Token** — done: `$LAZARUS` is live and `/api/token` reads its contract, transfer activity and pool figures. Republish with `npm run token:ca -- 0x…` if the address ever changes.
2. **Treasury contract** — open `/deploy`, deploy `contracts/LazarusTreasury.sol` from your own wallet (MetaMask signs; the site never holds a key), then either click *Activate on this site* as an admin or run `npm run treasury:ca -- 0x…` to publish it to Vercel env. Fees sent to the contract, the allocation and compute spend are then read on-chain.
3. **GPU provider** — set `GPU_PROVIDER=openai-compatible`, `GPU_PROVIDER_ENDPOINT` and `GPU_PROVIDER_API_KEY` in `.env.neon` and run `npm run deploy`. Groq (`https://api.groq.com/openai/v1`), Together, Fireworks, OpenRouter and vLLM ids are all mapped through model aliases in `config/models.ts`, so the registry goes ONLINE without code changes.
4. **Admins** — `ADMIN_WALLETS` lists the wallets allowed into `/admin` and to activate contracts.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run db:local` | Starts embedded PostgreSQL in `.data/pg` |
| `npm run db:push` / `db:migrate` | Prisma schema sync / migrations (loads `.env.local`) |
| `npm run brand` | Regenerates icons and the OG image from the vector logo |
| `npm run compile:treasury` | Compiles `contracts/LazarusTreasury.sol` (solc 0.8.28, paris) to `src/config/treasury-artifact.json` |
| `npm run treasury:ca -- 0x…` | Verifies bytecode + views on chain, publishes `NEXT_PUBLIC_TREASURY_CONTRACT`, redeploys |
| `npm run token:ca -- 0x…` | Verifies the ERC-20 on chain, publishes `NEXT_PUBLIC_TOKEN_CONTRACT`, redeploys |
| `npm run deploy` | Vercel production deploy with env from `.env.neon` |
| `node scripts/make-logo.mjs` | Re-traces `public/brand/lazarus-logo.jpg` into `src/config/logo-geometry.ts` |
| `node scripts/shot.mjs <url> <out.png> [--mobile]` | Headless screenshot over CDP |
| `node scripts/e2e.mjs` | End-to-end API check against a running server |
| `node scripts/sim-treasury.mjs` | Deploys the compiled treasury to a local Anvil (`anvil --port 8546`) and checks fees, budget cap, spend, withdraw, ownership |

## Structure

```
src/app            routes + API handlers (/api/auth, /api/inference, /api/v1/inference, /api/jobs, /api/models, /api/treasury, /api/revenue, /api/health, /api/keys, /api/admin)
src/components     landing/, dashboard/, compute/, charts/, models/, jobs/, account/, admin/, layout/, ui/, brand/
src/lib            providers/, blockchain/, auth/, credits/, jobs/, models/, treasury/, revenue/, health/, security/, apikeys/, admin/, db/
src/config         tokenomics.ts, models.ts, site.ts, logo-geometry.ts
prisma             schema.prisma
```

Lazarus Net is experimental infrastructure. Compute availability, protocol allocations, and token utilities may change through protocol configuration.
