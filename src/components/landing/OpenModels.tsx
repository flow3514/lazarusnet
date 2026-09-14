import { Section } from '@/components/landing/Section'
import { Item, Stagger } from '@/components/landing/motion'
import { modelCategories, modelSeeds } from '@/config/models'

/** Slow, pausable ticker of the registry — pure CSS, static under reduced motion. */
function ModelTicker() {
  const items = modelSeeds.map((m) => ({ id: m.id, label: m.name, meta: `${m.publisher} · ${m.type}` }))
  const row = [...items, ...items]
  return (
    <div className="marquee mt-8 border-y py-3" style={{ borderColor: 'var(--border)' }} aria-hidden>
      <div className="marquee-track">
        {row.map((m, i) => (
          <span key={`${m.id}-${i}`} className="mx-6 inline-flex items-center gap-3 whitespace-nowrap font-mono text-[11.5px] uppercase tracking-[0.14em]">
            <span className="tri-accent inline-block h-2 w-1.5 bg-magenta/70" />
            <span className="text-ink">{m.label}</span>
            <span className="text-muted">{m.meta}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function OpenModels() {
  return (
    <Section id="open-models" eyebrow="Open models" title="Open models. Open access." lead="Lazarus Net prioritizes open-weight models that can run across independent compute infrastructure.">
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {modelCategories.map((c) => {
          const count = modelSeeds.filter((m) => m.type === c.id).length
          return (
            <Item key={c.id}>
              <div className="card group h-full p-5 transition-[border-color,transform] duration-500 hover:-translate-y-0.5 hover:[border-color:rgba(217,41,137,0.5)]">
                <div className="flex items-center justify-between">
                  <span className="tri-accent inline-block h-3 w-2 bg-magenta transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
                  <span className="font-mono text-[11px] text-muted">{count} in registry</span>
                </div>
                <div className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">{c.id}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{c.blurb}</p>
              </div>
            </Item>
          )
        })}
      </Stagger>
      <ModelTicker />
      <p className="mt-6 text-xs text-muted">Models in the registry belong to their respective publishers and are used under their own licences. Lazarus Net does not claim ownership of any third-party model.</p>
    </Section>
  )
}
