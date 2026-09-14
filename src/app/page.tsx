import { Hero } from '@/components/landing/Hero'
import { StatusStrip } from '@/components/landing/StatusStrip'
import { EconomicLoop } from '@/components/landing/EconomicLoop'
import { ComputeDiagram } from '@/components/landing/ComputeDiagram'
import { ModelPreview } from '@/components/landing/ModelPreview'
import { HolderCompute } from '@/components/landing/HolderCompute'
import { TokenSection } from '@/components/landing/TokenSection'
import { TreasuryTransparency } from '@/components/landing/TreasuryTransparency'
import { RevenueLoop } from '@/components/landing/RevenueLoop'
import { OpenModels } from '@/components/landing/OpenModels'
import { DeveloperApi } from '@/components/landing/DeveloperApi'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatusStrip />
      <EconomicLoop />
      <ComputeDiagram />
      <ModelPreview />
      <HolderCompute />
      <TokenSection />
      <TreasuryTransparency />
      <RevenueLoop />
      <OpenModels />
      <DeveloperApi />
      <FAQ />
      <FinalCTA />
    </>
  )
}
