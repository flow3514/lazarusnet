// Local simulation of LazarusTreasury against Anvil (anvil --port 8546). Run: node scripts/sim-treasury.mjs
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'
import { readFileSync } from 'node:fs'
const art = JSON.parse(readFileSync('src/config/treasury-artifact.json', 'utf8'))
const owner = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
const other = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')
const chain = { ...foundry, id: 31337 }
const pub = createPublicClient({ chain, transport: http('http://127.0.0.1:8546') })
const w = (a) => createWalletClient({ account: a, chain, transport: http('http://127.0.0.1:8546') })
const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n} ${x}`); if (!c) process.exitCode = 1 }
const hash = await w(owner).deployContract({ abi: art.abi, bytecode: art.bytecode, args: [owner.address, 2000n] })
const rc = await pub.waitForTransactionReceipt({ hash })
const addr = rc.contractAddress
const read = (fn, args = []) => pub.readContract({ address: addr, abi: art.abi, functionName: fn, args })
const write = (acct, fn, args = [], value) => w(acct).writeContract({ address: addr, abi: art.abi, functionName: fn, args, value }).then((h) => pub.waitForTransactionReceipt({ hash: h }))
ok('deployed', !!addr, `${addr} gas ${rc.gasUsed}`)
ok('deployed bytecode matches artifact', (await pub.getCode({ address: addr })).toLowerCase() === art.deployedBytecode.toLowerCase())
ok('owner + allocation', (await read('owner')).toLowerCase() === owner.address.toLowerCase() && (await read('computeAllocationBps')) === 2000n)
await w(other).sendTransaction({ to: addr, value: parseEther('1') }).then((h) => pub.waitForTransactionReceipt({ hash: h }))
await write(other, 'depositFees', ['trading fees batch 1'], parseEther('0.5'))
ok('fees counted (plain transfer + depositFees)', (await read('totalProtocolFees')) === parseEther('1.5'), formatEther(await read('totalProtocolFees')))
ok('computeBudget = 20% of fees', (await read('computeBudget')) === parseEther('0.3'))
let reverted = false
try { await write(other, 'payProvider', [other.address, parseEther('0.1'), 'x']) } catch { reverted = true }
ok('non-owner cannot pay providers', reverted)
reverted = false
try { await write(owner, 'payProvider', [other.address, parseEther('0.31'), 'over budget']) } catch { reverted = true }
ok('payProvider capped by computeBudget', reverted)
await write(owner, 'payProvider', [other.address, parseEther('0.2'), 'GPU provider invoice #1'])
ok('compute spend recorded', (await read('totalComputeSpend')) === parseEther('0.2') && (await read('computeBudget')) === parseEther('0.1'))
await write(owner, 'setComputeAllocationBps', [5000n])
ok('allocation change raises budget', (await read('computeBudget')) === parseEther('0.55'))
await write(owner, 'withdraw', [owner.address, parseEther('0.5'), 'non-compute share'])
ok('withdraw does not count as compute spend', (await read('totalComputeSpend')) === parseEther('0.2') && (await pub.getBalance({ address: addr })) === parseEther('0.8'))
await write(owner, 'transferOwnership', [other.address])
ok('ownership pending until accepted', (await read('owner')).toLowerCase() === owner.address.toLowerCase())
await write(other, 'acceptOwnership')
ok('ownership accepted', (await read('owner')).toLowerCase() === other.address.toLowerCase())
