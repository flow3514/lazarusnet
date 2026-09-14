import type { NextConfig } from 'next'
import path from 'node:path'

/**
 * @coinbase/cdp-sdk (transitive via wagmi → @wagmi/connectors) imports optional
 * `@x402/*` peers that npm does not install. Lazarus Net never executes that path,
 * so the specifiers are aliased to a CommonJS stub. Turbopack wants a
 * project-relative specifier; webpack wants an absolute one.
 */
const STUB_RELATIVE = './src/lib/stubs/x402-stub.cjs'
const STUB = path.resolve(process.cwd(), STUB_RELATIVE)
const X402_IDS = [
  '@x402/core/client',
  '@x402/core/server',
  '@x402/evm',
  '@x402/evm/batch-settlement/client',
  '@x402/evm/exact/client',
  '@x402/evm/exact/server',
  '@x402/evm/exact/v1/client',
  '@x402/evm/upto/client',
  '@x402/evm/upto/server',
  '@x402/express',
  '@x402/extensions/bazaar',
  '@x402/extensions/builder-code',
  '@x402/fetch',
  '@x402/svm/exact/client',
  '@x402/svm/exact/server',
  '@x402/svm/exact/v1/client',
]
const X402_ALIASES = {
  ...Object.fromEntries(X402_IDS.map((id) => [id, STUB_RELATIVE])),
  '@react-native-async-storage/async-storage': STUB_RELATIVE,
}
const X402_ALIASES_EXACT = {
  ...Object.fromEntries(X402_IDS.map((id) => [`${id}$`, STUB])),
  '@react-native-async-storage/async-storage$': STUB,
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@prisma/client'],
  turbopack: { resolveAlias: X402_ALIASES },
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias ?? {}), ...X402_ALIASES_EXACT }
    config.externals = [...(config.externals ?? []), 'pino-pretty', 'lokijs', 'encoding']
    return config
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
    { source: '/account', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    { source: '/app', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
  ],
}

export default nextConfig
