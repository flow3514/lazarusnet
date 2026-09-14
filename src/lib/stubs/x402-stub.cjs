/**
 * Stand-in for the optional `@x402/*` peers of @coinbase/cdp-sdk (pulled in
 * transitively by wagmi's connector barrel). Lazarus Net never runs that
 * payment code path; the Proxy keeps every named import resolvable while
 * making any actual call fail loudly.
 */
const unavailable = (name) => () => {
  throw new Error(`@x402 export "${String(name)}" is not available in Lazarus Net.`)
}
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === '__esModule') return false
      if (prop === 'default') return module.exports
      return unavailable(prop)
    },
  },
)
