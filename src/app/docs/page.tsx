import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { CURL_EXAMPLE } from '@/components/landing/DeveloperApi'

export const metadata: Metadata = { title: 'Docs', description: 'How Lazarus Net works: architecture, configuration, credits and the developer API.' }

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Architecture',
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Next.js App Router, TypeScript, Tailwind, Framer Motion, wagmi + viem, Prisma on PostgreSQL, Zod, Recharts.</li>
        <li>
          Provider adapters in <code className="kbd">src/lib/providers</code>: <code className="kbd">openai-compatible</code> (vLLM, TGI, Together, Fireworks, OpenRouter…), <code className="kbd">ollama</code>, and a <code className="kbd">mock</code> that only exists outside production.
        </li>
        <li>
          Treasury adapters in <code className="kbd">src/lib/treasury</code> read the treasury contract (<code className="kbd">totalProtocolFees</code>, <code className="kbd">computeAllocationBps</code>, <code className="kbd">totalComputeSpend</code>) and admin-recorded events with tx hashes.
        </li>
        <li>Health, model status, revenue and treasury endpoints return typed &quot;awaiting&quot; / &quot;not configured&quot; states instead of numbers when a source is missing.</li>
      </ul>
    ),
  },
  {
    title: 'Configuration',
    body: (
      <pre className="code">{`DATABASE_URL=                 PostgreSQL (Neon / Supabase / npm run db:local)
NEXT_PUBLIC_CHAIN_ID=         EVM chain id (Robinhood Chain)
NEXT_PUBLIC_RPC_URL=          JSON-RPC endpoint — never invented
NEXT_PUBLIC_EXPLORER_URL=     block explorer base URL
NEXT_PUBLIC_TOKEN_CONTRACT=   ERC-20 used for holder tiers (blank = "Token contract not configured")
NEXT_PUBLIC_TREASURY_CONTRACT=treasury contract (blank = "Awaiting treasury contract integration")
GPU_PROVIDER=                 openai-compatible | ollama | mock
GPU_PROVIDER_ENDPOINT=        e.g. https://host/v1 (server-only)
GPU_PROVIDER_API_KEY=         server-only, never sent to the browser
AUTH_SECRET=                  32+ random bytes for signed sessions
ADMIN_WALLETS=                comma-separated admin addresses`}</pre>
    ),
  },
  {
    title: 'Wallet authentication',
    body: (
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          <code className="kbd">POST /api/auth/nonce</code> with the address → a SIWE-style message containing a single-use nonce.
        </li>
        <li>The wallet signs the message (EIP-191 personal_sign). No transaction, no funds.</li>
        <li>
          <code className="kbd">POST /api/auth/verify</code> checks the signature, consumes the nonce and sets an HMAC-signed httpOnly cookie.
        </li>
        <li>Route handlers read the address from the cookie only; a body-supplied address is never trusted.</li>
      </ol>
    ),
  },
  {
    title: 'Credits',
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          Holder balance → tier (<code className="kbd">config/tokenomics.ts</code>, admin-overridable) → credits per epoch, allocated once per epoch with a unique ledger index so it can never double-credit.
        </li>
        <li>Every inference reserves an estimate (prompt estimate + max tokens, +10%) under a row lock, executes, then charges the real usage and releases the reservation. Balances cannot go negative.</li>
        <li>
          Ledger types: <code className="kbd">epoch_allocation</code>, <code className="kbd">compute_usage</code>, <code className="kbd">refund</code>, <code className="kbd">manual_adjustment</code>, <code className="kbd">protocol_reward</code>.
        </li>
      </ul>
    ),
  },
  {
    title: 'Developer API',
    body: <pre className="code">{CURL_EXAMPLE}</pre>,
  },
  {
    title: 'Data honesty',
    body: <p>Nothing on this site is fabricated. No placeholder GPU statistics, no sample revenue, no fake transaction hashes or wallet balances. When a source is missing you will see &quot;Awaiting live network data&quot;, &quot;Not connected&quot; or &quot;Not configured&quot; instead.</p>,
  },
]

export default function DocsPage() {
  return (
    <>
      <PageHeader eyebrow="Docs" title="Documentation" lead="How the network is wired, configured and secured." />
      <div className="wrap grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block" aria-label="Sections">
          <ul className="sticky top-24 space-y-2 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.title}>
                <a href={`#${s.title.toLowerCase().replace(/\s+/g, '-')}`} className="text-muted hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-10 text-sm leading-relaxed">
          {SECTIONS.map((s) => (
            <section key={s.title} id={s.title.toLowerCase().replace(/\s+/g, '-')}>
              <h2 className="mb-3 text-lg font-semibold tracking-[-0.01em]">{s.title}</h2>
              <div className="text-ink/85">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
