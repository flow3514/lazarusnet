'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import { ProtocolFlow } from '@/components/dashboard/ProtocolFlow'
import { Button } from '@/components/ui/button'

export function RevenueLoop() {
  return (
    <Section id="revenue" eyebrow="Revenue loop" title="Usage pays the network back." lead="The protocol flow dashboard: click a node to see its metric, where the number comes from, when it was last updated and whether the source is live.">
      <ProtocolFlow />
      <div className="mt-8">
        <Link href="/revenue">
          <Button variant="secondary">
            Revenue dashboard <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </Section>
  )
}
