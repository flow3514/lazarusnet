'use client'
import { Coins, Cpu, Network } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import { Item, Stagger } from '@/components/landing/motion'
import { holderTiers, tokenomicsDisclaimer } from '@/config/tokenomics'
import { useToken, formatUsdCompact } from '@/components/landing/TokenSection'

const CARDS = [
  { icon: <Coins size={18} />, title: 'Hold', body: 'Token balance determines your current compute tier.' },
  { icon: <Cpu size={18} />, title: 'Use', body: 'Spend credits on supported models.' },
  { icon: <Network size={18} />, title: 'Contribute', body: 'Protocol activity expands available capacity.' },
]

export function HolderCompute() {
  const { data } = useToken()
  const symbol = data?.contract?.symbol ?? 'tokens'
  const price = data?.market?.priceUsd ? Number(data.market.priceUsd) : null

  return (
    <Section id="holders" eyebrow="Holder compute" title="Hold the network. Use the network." lead="Eligible holders receive compute credits that can be spent on models running through Lazarus Net.">
      <Stagger className="grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <Item key={c.title}>
            <div className="card h-full p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border text-magenta-bright" style={{ borderColor: 'var(--border-strong)' }}>
                {c.icon}
              </div>
              <div className="mt-4 text-lg font-semibold tracking-[-0.01em]">{c.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          </Item>
        ))}
      </Stagger>
      <div className="card mt-6 overflow-x-auto">
        <table className="table-base min-w-[560px]">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Minimum balance</th>
              {price !== null && <th>At today&rsquo;s price</th>}
              <th>Credits / epoch</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {holderTiers.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.name}</td>
                <td className="font-mono">
                  {Number(t.minBalance).toLocaleString('en-US')} {symbol}
                </td>
                {price !== null && <td className="font-mono text-muted">{formatUsdCompact(String(Number(t.minBalance) * price))}</td>}
                <td className="font-mono">{Number(t.creditsPerEpoch).toLocaleString('en-US')}</td>
                <td className="text-muted">{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">
        <span className="font-mono uppercase tracking-[0.14em] text-magenta-bright">Note · </span>
        {tokenomicsDisclaimer} Values shown are the current default configuration and can be changed by protocol admins.
        {price !== null && ' The USD column is the live pool price at load time, not a quote.'}
      </p>
    </Section>
  )
}
