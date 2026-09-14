#!/usr/bin/env node
/**
 * Headless screenshot over the Chrome DevTools Protocol (no puppeteer).
 *   node scripts/shot.mjs <url> <out.png> [--width=1440] [--height=900] [--scroll=0] [--wait=6000] [--mobile]
 * Uses Node's global WebSocket. Chrome's virtual-time budget freezes
 * Framer Motion, so real time is waited instead.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'

const args = process.argv.slice(2)
const url = args[0]
const out = args[1] ?? 'shot.png'
const opt = (k, d) => {
  const a = args.find((x) => x.startsWith(`--${k}=`))
  return a ? a.slice(k.length + 3) : d
}
const mobile = args.includes('--mobile')
const reduced = args.includes('--reduced')
const width = Number(opt('width', mobile ? 390 : 1440))
const height = Number(opt('height', mobile ? 844 : 900))
const scrollY = Number(opt('scroll', 0))
const wait = Number(opt('wait', 6000))
const evalExpr = opt('eval', '')
const cookie = opt('cookie', '') // name=value, set for the page's host before navigation
const port = 9700 + Math.floor(Math.random() * 300)

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].filter(Boolean)
const chrome = chromeCandidates.find((p) => fs.existsSync(p))
if (!chrome) throw new Error('Chrome not found; set CHROME_PATH')

const proc = spawn(chrome, [
  '--headless=new',
  '--disable-gpu-sandbox',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  `--remote-debugging-port=${port}`,
  `--window-size=${width},${height}`,
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${process.env.TEMP || '/tmp'}/lz-shot-${port}`,
  'about:blank',
], { stdio: 'ignore' })

const getJson = (path) =>
  new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (res) => {
      let s = ''
      res.on('data', (d) => (s += d))
      res.on('end', () => {
        try {
          resolve(JSON.parse(s))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let targets = null
for (let i = 0; i < 40 && !targets; i++) {
  await sleep(250)
  targets = await getJson('/json/list').catch(() => null)
}
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id
    pending.set(i, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)))
    ws.send(JSON.stringify({ id: i, method, params }))
  })

await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true })
const consoleLog = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) consoleLog.push(`[${m.params.type}] ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`)
  if (m.method === 'Runtime.exceptionThrown') consoleLog.push(`[exception] ${(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text ?? '').slice(0, 300)}`)
})
if (reduced) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
if (cookie) {
  const [cname, ...rest] = cookie.split('=')
  await send('Network.enable')
  await send('Network.setCookie', { name: cname, value: rest.join('='), url, secure: cname.startsWith('__Secure-') })
}
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url })
await sleep(wait)
if (scrollY > 0) {
  // Scroll in steps so ScrollTrigger scrub catches up like a real user.
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    await send('Runtime.evaluate', { expression: `window.scrollTo({ top: ${Math.round((scrollY * i) / steps)}, behavior: 'instant' })` })
    await sleep(120)
  }
  await sleep(2500)
}
if (evalExpr) {
  const r = await send('Runtime.evaluate', { expression: evalExpr, returnByValue: true, awaitPromise: true })
  console.log('eval', JSON.stringify(r.result.value))
}
const logs = await send('Runtime.evaluate', { expression: 'JSON.stringify({ title: document.title, h: document.body.scrollHeight, err: (window.__errs||[]) })', returnByValue: true })
console.log('page', logs.result.value)
if (consoleLog.length) console.log('console', JSON.stringify(consoleLog.slice(0, 12), null, 1))
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))
console.log('saved', out)
ws.close()
proc.kill()
process.exit(0)
