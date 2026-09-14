export const site = {
  name: 'Lazarus Net',
  tagline: 'Compute belongs to the people.',
  title: 'Lazarus Net — Community-Owned Compute',
  description: 'Lazarus Net turns protocol activity into GPU compute for open models.',
  ogHeadline: 'Compute belongs to the people.',
  chainLabel: 'Built for Robinhood Chain',
  x: 'https://x.com/LazarusNetRH',
  xHandle: '@LazarusNetRH',
  github: 'https://github.com/flow3514/lazarusnet',
}

export const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/compute', label: 'Compute' },
  { href: '/models', label: 'Models' },
  { href: '/treasury', label: 'Treasury' },
  { href: '/revenue', label: 'Revenue' },
  { href: '/developers', label: 'Developers' },
] as const

export const APP_NAV = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/account', label: 'Account' },
] as const

export const FOOTER_NAV = [
  { href: '/compute', label: 'Compute' },
  { href: '/models', label: 'Models' },
  { href: '/treasury', label: 'Treasury' },
  { href: '/developers', label: 'Developers' },
  { href: '/#token', label: 'Token' },
  { href: '/docs', label: 'Docs' },
] as const

export const footerDisclaimer = 'Lazarus Net is experimental infrastructure. Compute availability, protocol allocations, and token utilities may change through protocol configuration.'
