'use client'
import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import { cn } from '@/lib/utils/format'

const FAQS = [
  { q: 'Where does the compute come from?', a: 'From GPU providers integrated through the provider adapter layer: any OpenAI-compatible endpoint or an Ollama node. The Compute Treasury pays for capacity; the application routes inference jobs to it. Until a provider is configured the console says "Compute provider not configured" and the Run button stays disabled — no output is ever simulated.' },
  { q: 'Do holders get unlimited free compute?', a: 'No. Holders receive credit allocations per epoch according to their tier. Tiers, thresholds and allocations are protocol-configurable and subject to available capacity.' },
  { q: 'Which models can I run?', a: 'Open-weight models listed in the registry: general reasoning, code, research, embedding and vision. Availability is health-checked against the provider; only models the provider actually serves show as ONLINE.' },
  { q: 'How is revenue measured?', a: 'Every completed job writes a usage record. External API usage is metered at the model list price and recorded as compute revenue; holder usage is recorded as subsidy cost. Nothing is projected or estimated.' },
  { q: 'Is the token live?', a: 'Yes. $LAZARUS trades on Robinhood Chain and the Token section reads its contract, supply and pool figures live. The Compute Treasury contract is a separate piece: until it is deployed and receiving fees, the treasury dashboard says "Awaiting treasury contract integration" rather than showing a number.' },
  { q: 'Is my prompt stored?', a: 'Only a SHA-256 hash of the prompt is stored with the job. Output text is kept for wallet-session jobs so the Jobs page can display it, and is capped in length.' },
]

export function FAQ() {
  const [open, setOpen] = React.useState<number | null>(0)
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions, answered plainly.">
      <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
        {FAQS.map((f, i) => (
          <div key={f.q} style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium">
              {f.q}
              <ChevronDown size={16} className={cn('shrink-0 text-muted transition-transform duration-300', open === i && 'rotate-180')} />
            </button>
            <div className={cn('grid transition-[grid-template-rows] duration-300', open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
