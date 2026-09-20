import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = path.join(root, 'dist')
const artifacts = path.join(root, 'artifacts')
const executablePath = [process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(candidate => candidate && existsSync(candidate))
assert.ok(executablePath, 'Install Chrome/Edge or set CHROME_PATH.')
assert.ok(existsSync(path.join(dist, 'index.html')), 'Run npm run build first.')
await mkdir(artifacts, { recursive: true })
const axe = await readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8')
let deployment = 1
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  res.setHeader('Cache-Control', 'no-store')
  if (url.pathname === '/sibling/sw.js') {
    res.setHeader('Content-Type', 'text/javascript')
    res.end("self.addEventListener('install',()=>self.skipWaiting());")
    return
  }
  if (!url.pathname.startsWith('/nomogram/')) { res.writeHead(404).end(); return }
  const relative = decodeURIComponent(url.pathname.slice('/nomogram/'.length)) || 'index.html'
  const target = path.resolve(dist, relative)
  if (!target.startsWith(dist + path.sep)) { res.writeHead(403).end(); return }
  try {
    let body = await readFile(target)
    if (relative === 'sw.js' && deployment > 1) {
      // Simulate a new deployment, including an HTML revision, without changing build files.
      const source = body.toString()
      assert.match(source, /url:"index.html",revision:"[^"]+"/)
      body = Buffer.from(source.replace(/url:"index.html",revision:"[^"]+"/, `url:"index.html",revision:"browser-test-${deployment}"`))
    }
    if (relative === 'index.html') body = Buffer.from(body.toString().replace('</head>', `<meta name="test-deployment" content="${deployment}"></head>`))
    res.setHeader('Content-Type', mime[path.extname(relative)] || 'application/octet-stream')
    res.end(body)
  } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}/nomogram/`
let browser
let passed = 0
const errors = []
const pass = name => { passed++; console.log(`PASS ${name}`) }
try {
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 1 })
  await page.goto(base, { waitUntil: 'networkidle0' })
  const setInput = async (selector, value) => {
    await page.$eval(selector, (element, text) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(element, text)
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
  }
  const pace = () => page.$eval('[role="slider"]', element => Number(element.getAttribute('aria-valuenow')))
  const clickText = async text => {
    const selector = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(element => element.textContent.trim() === text && element.getBoundingClientRect().width > 0), text)
    const element = selector.asElement()
    assert.ok(element, `Button exists: ${text}`)
    await element.click()
    await selector.dispose()
  }
  const screenshot = name => page.screenshot({ path: path.join(artifacts, name), fullPage: true })
  const accessibility = async name => {
    await page.addScriptTag({ content: axe })
    const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }))
    await writeFile(path.join(artifacts, `accessibility-${name}.json`), JSON.stringify(results, null, 2))
    assert.deepEqual(results.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })), [], `Accessibility: ${name}`)
    pass(`accessibility: ${name}`)
  }
  await page.waitForFunction(() => document.querySelector('[data-distance="5"]')?.textContent === '25:00')
  assert.equal(await pace(), 300)
  assert.equal(await page.$eval('[data-distance="10"]', el => el.textContent), '50:00')
  pass('default pace and race times')
  assert.equal(await page.$eval('.brand-mark', image => image.complete && image.naturalWidth === 192), true)
  const manifestResponse = await fetch(new URL('manifest.webmanifest', base))
  const manifest = await manifestResponse.json()
  assert.deepEqual(manifest.icons.map(icon => icon.src), ['pace-icon-192.png', 'pace-icon-512.png'])
  for (const icon of manifest.icons) assert.ok((await fetch(new URL(icon.src, base))).ok)
  for (const selector of ['link[rel="apple-touch-icon"]', 'link[rel="icon"][sizes="32x32"]', 'link[rel="icon"][sizes="48x48"]']) {
    const href = await page.$eval(selector, element => element.href)
    assert.ok((await fetch(href)).ok)
  }
  pass('new app icon loads in the header, install manifest and browser links')
  await accessibility('desktop-light')
  await screenshot('desktop-light.png')

  await setInput('#pace-input', '5:35')
  await clickText('Aplicar pace')
  await page.waitForFunction(() => document.querySelector('[role="slider"]').getAttribute('aria-valuenow') === '335')
  assert.equal(await page.$eval('#speed-input', el => el.value), '10,746')
  pass('direct pace synchronizes speed and needle')
  await setInput('#speed-input', '10,8')
  await clickText('Aplicar velocidade')
  await page.waitForFunction(() => document.querySelector('[role="slider"]').getAttribute('aria-valuenow') === '333')
  assert.equal(await page.$eval('#pace-input', el => el.value), '5:33')
  pass('localized speed input rounds pace to nearest second')
  await setInput('#speed-input', '0')
  await clickText('Aplicar velocidade')
  await page.waitForSelector('#converter-error')
  assert.equal(await pace(), 333)
  await setInput('#pace-input', '5:35')
  await clickText('Aplicar pace')
  pass('invalid direct values show an error without changing pace')

  await page.click('.settings summary')
  await page.click('input[value="dark"]')
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
  await accessibility('settings-dark')
  await page.click('.settings summary')
  assert.equal(await pace(), 335)
  await page.click('#tab-calculator')
  await setInput('#expression', '4:59+0:00.6')
  await clickText('= Calcular e guardar')
  assert.equal(await page.$eval('[data-testid="calculation-result"]', el => el.textContent), '5:00')
  await page.click('#tab-nomogram')
  assert.equal(await pace(), 335)
  await page.click('#tab-calculator')
  assert.equal(await page.$eval('#expression', el => el.value), '4:59+0:00.6')
  assert.equal(await page.$$eval('.history li', elements => elements.length), 1)
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$eval('#expression', el => el.value), '4:59+0:00.6')
  assert.equal(await page.$$eval('.history li', elements => elements.length), 1)
  assert.equal(await page.$eval('html', el => el.dataset.theme), 'dark')
  await page.click('#tab-nomogram')
  assert.equal(await pace(), 335)
  pass('pace, expression, history, selected tab and theme survive navigation and reload')

  await page.$eval('[role="slider"]', element => element.focus())
  await page.keyboard.press('ArrowRight')
  assert.equal(await pace(), 336)
  await page.keyboard.down('Shift')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.up('Shift')
  assert.equal(await pace(), 326)
  await page.keyboard.press('Home')
  assert.equal(await pace(), 180)
  await page.keyboard.press('End')
  assert.equal(await pace(), 480)
  pass('dial supports arrows, modified arrows and endpoints')
  await setInput('#pace-input', '12:00')
  await clickText('Aplicar pace')
  assert.equal(await pace(), 720)
  assert.equal(await page.$eval('[role="slider"]', el => Number(el.getAttribute('aria-valuemax'))), 720)
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await pace(), 720)
  assert.equal(await page.$eval('[role="slider"]', el => Number(el.getAttribute('aria-valuemax'))), 720)
  pass('direct entry expands the selected scale')

  await setInput('#goal-distance', '10')
  await setInput('#goal-time', '50:00')
  await clickText('Usar este pace no nomograma')
  assert.equal(await pace(), 300)
  await setInput('#custom-distance', '7,5')
  assert.equal(await page.$eval('.custom-distance output', el => el.textContent), '37:30')
  await setInput('#custom-distance', '0')
  assert.equal(await page.$eval('.custom-distance output', el => el.textContent), '—')
  await setInput('#goal-time', '1:75:00')
  assert.equal(await page.$eval('.goal-result', el => el.textContent), '—')
  assert.equal(await page.$eval('.planner button[type="submit"]', el => el.disabled), true)
  await setInput('#goal-time', '10:00')
  assert.equal(await page.$eval('.goal-result strong', el => el.textContent), '1:00')
  assert.equal(await page.$eval('.planner button[type="submit"]', el => el.disabled), true)
  await setInput('#goal-time', '50:00')
  await setInput('#custom-distance', '7,5')
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$eval('#goal-time', el => el.value), '50:00')
  assert.equal(await page.$eval('#custom-distance', el => el.value), '7,5')
  pass('race planning handles custom distance, inverse calculation and invalid targets')

  await page.focus('#tab-nomogram')
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.$eval('#tab-calculator', el => el.getAttribute('aria-selected')), 'true')
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-calculator')
  pass('tabs support keyboard navigation and move focus')
  for (const [expression, expected] of [['5:00÷5:00', '1'], ['(4:00+5:00)÷2', '4:30'], ['-1+2', '1'], ['59:59+0:00.6', '1:00:00']]) {
    await setInput('#expression', expression)
    await clickText('= Calcular e guardar')
    assert.equal(await page.$eval('[data-testid="calculation-result"]', el => el.textContent), expected)
  }
  for (const expression of ['(1+2', '1+2)', '1..2+3', '5:00+1', '1÷0']) {
    await setInput('#expression', expression)
    await clickText('= Calcular e guardar')
    assert.equal(await page.$eval('[data-testid="calculation-result"]', el => el.textContent), '—')
    assert.ok(await page.$('#calculation-error[role="alert"]'))
  }
  pass('calculator regressions, unit-aware results and visible validation')
  await clickText('C')
  await clickText('1')
  await clickText('+')
  await clickText('2')
  await clickText('= Calcular e guardar')
  assert.equal(await page.$eval('[data-testid="calculation-result"]', el => el.textContent), '3')
  await page.focus('#expression')
  await page.keyboard.press('End')
  await page.keyboard.type('*3')
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval('[data-testid="calculation-result"]', el => el.textContent), '7')
  await page.click('.history li:nth-child(2) button')
  assert.equal(await page.$eval('#expression', el => el.value), '1+2')
  pass('calculator supports keypad, physical keyboard and history reuse')
  await accessibility('calculator-dark')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, hasTouch: true, isMobile: true })
  await screenshot('mobile-calculator-dark.png')

  await page.click('#tab-nomogram')
  await page.click('.settings summary')
  await page.click('input[value="light"]')
  await clickText('Corrida3:00–8:00')
  await page.click('.settings summary')
  await page.$eval('.dial', el => el.scrollIntoView({ block: 'center' }))
  const rect = await page.$eval('.dial', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width } })
  const location = degrees => ({ x: rect.x + (200 + 148 * Math.cos(degrees * Math.PI / 180)) * rect.width / 400, y: rect.y + (200 - 148 * Math.sin(degrees * Math.PI / 180)) * rect.width / 400 })
  const start = location(90), finish = location(0)
  const cdp = await page.createCDPSession()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finish] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.ok(Math.abs(await pace() - 430) <= 1)
  await cdp.detach()
  pass('touch drag moves the actual circular dial')
  await setInput('#pace-input', '5:00')
  await clickText('Aplicar pace')
  await accessibility('mobile-light')
  await screenshot('mobile-light.png')
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`)
  }
  assert.ok(!(await page.$eval('meta[name="viewport"]', el => el.content)).includes('user-scalable=no'))
  pass('responsive layouts and browser zoom remain available')

  // Register another application on the same origin and seed its cache.
  await page.evaluate(async () => {
    const cache = await caches.open('sibling-app-cache')
    await cache.put('/sibling/data', new Response('keep me'))
    const registration = await navigator.serviceWorker.register('/sibling/sw.js', { scope: '/sibling/' })
    const worker = registration.installing || registration.waiting || registration.active
    if (worker.state !== 'activated') await new Promise(resolve => worker.addEventListener('statechange', () => { if (worker.state === 'activated') resolve() }))
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.evaluate(() => navigator.serviceWorker.ready)
  const checkSibling = async () => {
    assert.equal(await page.evaluate(async () => (await (await caches.open('sibling-app-cache')).match('/sibling/data')).text()), 'keep me')
    assert.ok(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).some(reg => reg.scope.endsWith('/sibling/'))))
  }
  await checkSibling()
  await page.setCacheEnabled(false)
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await pace(), 300)
  await page.click('button[aria-label="Aumentar pace em 1 segundo"]')
  assert.equal(await pace(), 301)
  await page.click('#tab-calculator')
  await setInput('#expression', '3:55×10')
  await clickText('= Calcular e guardar')
  assert.equal(await page.$eval('[data-testid="calculation-result"]', el => el.textContent), '39:10')
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$eval('#expression', el => el.value), '3:55×10')
  await checkSibling()
  pass('cold offline reload, calculator and persistence work without deleting sibling caches or workers')

  await page.setOfflineMode(false)
  deployment = 2
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration('/nomogram/'); await registration.update() })
  await page.waitForSelector('aside[aria-label="Atualização disponível"]')
  assert.equal(await page.$eval('meta[name="test-deployment"]', el => el.content), '1')
  await clickText('Depois')
  assert.equal(await page.$eval('meta[name="test-deployment"]', el => el.content), '1')
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('aside[aria-label="Atualização disponível"]')
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), clickText('Atualizar agora')])
  await page.waitForSelector('#expression')
  assert.equal(await page.$eval('meta[name="test-deployment"]', el => el.content), '2')
  assert.equal(await page.$eval('#expression', el => el.value), '3:55×10')
  await page.click('#tab-nomogram')
  assert.equal(await pace(), 301)
  await checkSibling()
  pass('update can be deferred or applied and preserves data and neighboring apps')

  await page.evaluate(() => localStorage.setItem('pace-nomogram:v1', '{broken-json'))
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await pace(), 300)
  pass('corrupt storage recovers to valid defaults')
  const blockedContext = await browser.createBrowserContext()
  const blockedPage = await blockedContext.newPage()
  await blockedPage.evaluateOnNewDocument(() => {
    Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('Blocked', 'SecurityError') } })
    Object.defineProperty(Storage.prototype, 'getItem', { value() { throw new DOMException('Blocked', 'SecurityError') } })
  })
  await blockedPage.goto(base, { waitUntil: 'networkidle0' })
  await blockedPage.waitForFunction(() => document.body.textContent.includes('O navegador não permitiu salvar os dados.'))
  await blockedPage.click('button[aria-label="Aumentar pace em 1 segundo"]')
  assert.equal(await blockedPage.$eval('[role="slider"]', el => el.getAttribute('aria-valuenow')), '301')
  await blockedContext.close()
  pass('blocked storage does not prevent calculations')
  assert.deepEqual(errors, [], 'No browser runtime errors')
  pass('no browser runtime errors')
  console.log(`\n${passed} browser checks passed.`)
} catch (error) {
  if (browser) for (const [index, page] of (await browser.pages()).entries()) {
    await page.screenshot({ path: path.join(artifacts, `failure-${index}.png`), fullPage: true }).catch(() => {})
  }
  throw error
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
