#!/usr/bin/env node
/**
 * Compiles contracts/LazarusTreasury.sol with solc-js (0.8.28, optimizer on,
 * evmVersion paris — the level Robinhood Chain's Orbit stack executes) and
 * writes the ABI + creation bytecode to src/config/treasury-artifact.json,
 * which the /deploy page and the treasury reader import.
 *   node scripts/compile-treasury.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const solc = require('solc')
const source = readFileSync('contracts/LazarusTreasury.sol', 'utf8')
const input = {
  language: 'Solidity',
  sources: { 'LazarusTreasury.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'paris',
    metadata: { bytecodeHash: 'none' },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'] } },
  },
}
const out = JSON.parse(solc.compile(JSON.stringify(input)))
const errors = (out.errors ?? []).filter((e) => e.severity === 'error')
for (const e of out.errors ?? []) console.error(e.formattedMessage)
if (errors.length) process.exit(1)
const c = out.contracts['LazarusTreasury.sol'].LazarusTreasury
const artifact = {
  contractName: 'LazarusTreasury',
  compiler: `solc ${solc.version()}`,
  evmVersion: 'paris',
  optimizer: { enabled: true, runs: 200 },
  sourceSha256: (await import('node:crypto')).createHash('sha256').update(source).digest('hex'),
  abi: c.abi,
  bytecode: '0x' + c.evm.bytecode.object,
  deployedBytecode: '0x' + c.evm.deployedBytecode.object,
}
writeFileSync('src/config/treasury-artifact.json', JSON.stringify(artifact, null, 2) + '\n')
console.log(`✓ compiled LazarusTreasury (${artifact.compiler}) — ${(artifact.bytecode.length - 2) / 2} bytes creation code, ${artifact.abi.length} ABI entries`)
