'use client'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyPoint } from '@/lib/revenue/summary'
import { StateBlock } from '@/components/dashboard/StateBlock'

/**
 * Daily charts. Rendered only when there is at least one data point with
 * activity; otherwise the honest empty state is shown.
 */
const MAGENTA = '#D92989'
const BRIGHT = '#F13CA6'
const WINE = '#8F1338'

function toRows(daily: DailyPoint[]) {
  return daily.map((d) => ({
    date: d.date.slice(5),
    jobs: d.jobs,
    external: d.externalJobs,
    holder: d.holderJobs,
    tokens: d.tokens,
    revenue: Number(d.revenueMicroUsd) / 1e6,
    subsidy: Number(d.subsidyMicroUsd) / 1e6,
    credits: Number(d.creditsConsumed) / 1e6,
  }))
}

const compact = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) < 0.01 && v !== 0 ? v.toExponential(1) : Number.isInteger(v) ? String(v) : v.toFixed(3))

const tooltipStyle = { background: 'rgb(var(--surface))', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: 12, color: 'rgb(var(--ink))' }

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="eyebrow mb-4">{title}</div>
      <div className="h-[220px]">{children}</div>
    </div>
  )
}

export function RevenueCharts({ daily }: { daily: DailyPoint[] }) {
  const rows = toRows(daily)
  const hasActivity = rows.some((r) => r.jobs > 0 || r.revenue > 0)
  if (!hasActivity) return <StateBlock state="empty" message="No compute activity in this window. Charts appear once jobs have run." />
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Daily compute usage (tokens)">
        <ResponsiveContainer>
          <AreaChart data={rows} margin={{ left: -18, right: 6, top: 6 }}>
            <defs>
              <linearGradient id="gTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MAGENTA} stopOpacity={0.35} />
                <stop offset="100%" stopColor={MAGENTA} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={compact} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="tokens" stroke={MAGENTA} fill="url(#gTokens)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Daily revenue (USD, metered)">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ left: -18, right: 6, top: 6 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={compact} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toFixed(4)}`} />
            <Bar dataKey="revenue" fill={BRIGHT} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Credits consumed">
        <ResponsiveContainer>
          <AreaChart data={rows} margin={{ left: -18, right: 6, top: 6 }}>
            <defs>
              <linearGradient id="gCredits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WINE} stopOpacity={0.5} />
                <stop offset="100%" stopColor={WINE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={compact} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="credits" stroke={WINE} fill="url(#gCredits)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="External vs holder usage (jobs)">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ left: -18, right: 6, top: 6 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={56} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="external" stackId="a" fill={BRIGHT} />
            <Bar dataKey="holder" stackId="a" fill={WINE} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
