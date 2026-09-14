import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/landing/motion'
import { Button } from '@/components/ui/button'
import { AssembleMark } from '@/components/landing/AssembleMark'

export function FinalCTA() {
  return (
    <section className="py-24">
      <div className="wrap">
        <Reveal>
          <div className="card relative overflow-hidden p-10 text-center sm:p-16">
            <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000,transparent)]" aria-hidden />
            <div className="magenta-glow absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-60" aria-hidden />
            <div className="relative">
              <AssembleMark size={96} className="mx-auto" />
              <Reveal delay={0.5} y={16}>
                <h2 className="h-section mx-auto mt-8 max-w-2xl">Trade. Fund compute. Run open models. Share the upside.</h2>
              </Reveal>
              <Reveal delay={0.65} y={12}>
                <p className="mx-auto mt-5 max-w-xl text-muted">Lazarus Net converts protocol activity into community-owned compute. Trading fees fund GPU capacity, open models run on that infrastructure, and holders receive access to the network while paid compute usage creates new protocol revenue.</p>
              </Reveal>
              <Reveal delay={0.8} y={10}>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/compute">
                    <Button size="lg" className="group">
                      Launch Compute <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                  <Link href="/developers">
                    <Button size="lg" variant="secondary">
                      Get an API key
                    </Button>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
