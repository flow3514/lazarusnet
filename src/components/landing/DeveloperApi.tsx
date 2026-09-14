import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import { Reveal } from '@/components/landing/motion'
import { Button } from '@/components/ui/button'

export const CURL_EXAMPLE = `curl -X POST https://<your-host>/api/v1/inference \\
  -H "Authorization: Bearer lz_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama-3.1-8b-instruct",
    "prompt": "Explain community-owned compute in one paragraph.",
    "temperature": 0.7,
    "maxTokens": 256
  }'`

export function DeveloperApi() {
  return (
    <Section id="developers" eyebrow="Developer API" title="One endpoint. Metered compute." lead="Generate an API key from your wallet account and call the network directly. Usage is charged to your compute account and recorded as external revenue.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <ul className="space-y-4 text-sm">
            {[
              ['Authentication', 'Bearer API key, hashed at rest, shown once.'],
              ['Rate limits', 'Per key, per wallet and per IP. HTTP 429 with Retry-After.'],
              ['Accounting', 'Credits are reserved before the call and settled from real token usage.'],
              ['Idempotency', 'Send idempotencyKey to make retries safe.'],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-4">
                <span className="tri-accent mt-1.5 h-2.5 w-2 shrink-0 bg-magenta" aria-hidden />
                <div>
                  <div className="font-medium">{k}</div>
                  <div className="text-muted">{v}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/developers">
              <Button variant="secondary">
                Developer console <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <pre className="code">{CURL_EXAMPLE}</pre>
        </Reveal>
      </div>
    </Section>
  )
}
