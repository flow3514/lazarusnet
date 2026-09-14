'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Check, Copy, ExternalLink } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import { Item, Stagger } from '@/components/landing/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { api } from '@/lib/utils/fetcher'
import type { TokenSnapshot } from '@/lib/token/market'
import { cn, relativeTime } from '@/lib/utils/format'

export function useToken() {
  return useQuery({ queryKey: ['token'], queryFn: () => api<TokenSnapshot>('/api/token'), staleTime: 60_000, refetchInterval: 120_000 })
}

export function formatUsdPrice(v: string): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '$0'
  if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 4 })}`
  // Sub-cent prices: keep four significant digits.
  const decimals = Math.min(18, Math.max(2, Math.ceil(-Math.log10(n)) + 3))
  return `$${n.toFixed(decimals)}`
}

export function formatUsdCompact(v: string | null): string | null {
  if (v === null) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`
  if (n >= 1_000) return `$${(n / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'up' | 'down' }) {
  return (
    <div className="card p-4">
      <div className="eyebrow">{label}</div>
      <div className={cn('mt-2 text-[19px] font-semibold tracking-[-0.01em]', tone === 'up' && 'text-emerald-500', tone === 'down' && 'text-red-500')}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(address).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[12px] transition-colors hover:border-magenta/50"
      style={{ borderColor: 'var(--border-strong)' }}
      aria-label="Copy contract address"
    >
      <span className="truncate">{address}</span>
      {copied ? <Check size={13} className="shrink-0 text-emerald-500" /> : <Copy size={13} className="shrink-0 text-muted" />}
    </button>
  )
}

/**
 * $LAZARUS: contract facts read from the chain plus pool market data from
 * GeckoTerminal. Every figure is live; when no pool is indexed the section
 * says so instead of printing a price.
 */
export function TokenSection() {
  const { data, isLoading, isError } = useToken()

  return (
    <Section id="token" eyebrow="Token" title="The asset behind the network." lead="$LAZARUS is the balance the credit engine reads. Everything below is read live from the contract and its liquidity pool.">
      {isLoading && <StateBlock state="loading" rows={4} />}
      {isError && <StateBlock state="error" message="Token data could not be loaded." />}
      {data && !data.configured && <StateBlock state="not_configured" message={data.reason ?? 'Token contract not configured.'} />}
      {data?.configured && !data.contract && <StateBlock state="error" message={data.reason ?? 'The token contract could not be read.'} />}

      {data?.contract && (
        <>
          <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold tracking-[-0.01em]">
                  {data.contract.name} <span className="text-magenta-bright">${data.contract.symbol}</span>
                </span>
                <Badge tone="ok" dot>
                  Live on {data.chain.name}
                </Badge>
              </div>
              <div className="mt-3 flex max-w-full flex-wrap items-center gap-2">
                <CopyAddress address={data.contract.address} />
                {data.contract.explorerUrl && (
                  <a href={data.contract.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-magenta-bright">
                    Explorer <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <div className="text-right">
                <div className="eyebrow">Total supply</div>
                <div className="font-mono text-sm">
                  {data.contract.totalSupplyFormatted} {data.contract.symbol}
                </div>
              </div>
              {data.tradeUrl && data.market && (
                <a href={data.tradeUrl} target="_blank" rel="noreferrer">
                  <Button size="sm">
                    Acquire on Pons <ArrowUpRight size={14} />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {data.market ? (
            <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Item>
                <Stat
                  label="Price"
                  value={formatUsdPrice(data.market.priceUsd)}
                  tone={data.market.change24hPct ? (Number(data.market.change24hPct) >= 0 ? 'up' : 'down') : undefined}
                  sub={data.market.change24hPct ? `${Number(data.market.change24hPct) >= 0 ? '+' : ''}${Number(data.market.change24hPct).toFixed(2)}% · 24h` : 'live pool price'}
                />
              </Item>
              <Item>
                <Stat label="Liquidity" value={formatUsdCompact(data.market.liquidityUsd) ?? '—'} sub={`${data.market.pool.name} · ${data.market.pool.dex}`} />
              </Item>
              <Item>
                <Stat label="Volume · 24h" value={formatUsdCompact(data.market.volume24hUsd) ?? '—'} sub={data.market.buys24h !== null ? `${data.market.buys24h} buys · ${data.market.sells24h} sells` : undefined} />
              </Item>
              <Item>
                <Stat label="Fully diluted value" value={formatUsdCompact(data.market.fdvUsd) ?? '—'} sub={data.market.buyers24h !== null ? `${data.market.buyers24h} buyers · ${data.market.sellers24h} sellers · 24h` : undefined} />
              </Item>
            </Stagger>
          ) : (
            <StateBlock state="awaiting" className="mt-4" message={data.marketReason ?? 'No liquidity pool indexed for this token yet.'} />
          )}

          {data.market?.launchpad && !data.market.launchpad.completed && (
            <div className="card mt-4 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="eyebrow">Launchpad progress</div>
                <div className="font-mono text-sm">{data.market.launchpad.graduationPercentage.toFixed(2)}%</div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-magenta transition-[width] duration-700" style={{ width: `${Math.min(100, Math.max(0, data.market.launchpad.graduationPercentage))}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted">Graduation progress reported by the launchpad for this pool. Not a protocol commitment.</p>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <div className="eyebrow mb-3">On-chain activity</div>
              {data.activity ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    <div>
                      <span className="text-2xl font-semibold">{data.activity.transfers.toLocaleString('en-US')}</span>
                      <span className="ml-2 text-xs text-muted">transfers</span>
                    </div>
                    <div>
                      <span className="text-2xl font-semibold">{data.activity.uniqueAddresses.toLocaleString('en-US')}</span>
                      <span className="ml-2 text-xs text-muted">addresses</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    Transfer events counted over the last {data.activity.blocks.toLocaleString('en-US')} blocks
                    {data.activity.approxMinutes !== null ? ` (~${data.activity.approxMinutes} min)` : ''}, ending at block {Number(data.activity.toBlock).toLocaleString('en-US')}.
                  </p>
                </>
              ) : (
                <StateBlock state="awaiting" message={data.activityReason ?? 'The RPC did not return transfer logs for this window.'} />
              )}
            </div>
            <div className="card p-5">
              <div className="eyebrow mb-3">What the token does here</div>
              <ul className="space-y-2 text-sm text-muted">
                {[
                  'Your balance decides your compute tier and the credits granted each epoch.',
                  'Credits are spent on models running through the network.',
                  'Holding is read with balanceOf at the current block — never cached or assumed.',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="tri-accent mt-1.5 h-2 w-1.5 shrink-0 bg-magenta" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">Data read {relativeTime(data.generatedAt)}. Market figures from GeckoTerminal; contract figures straight from {data.chain.name}.</p>
            </div>
          </div>
        </>
      )}
    </Section>
  )
}
