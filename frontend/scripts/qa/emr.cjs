/*
 * EMR popup spec §8.4: UX and accessibility tests on /dur#/emr/* (dev server) and the standalone file.
 * Folds in WP4's interaction script (A–J) and adds the remaining §8.4 items: gate per visit, NV-OTH,
 * related badges, language, em dashes, ARIA, live region, widget-text contrast, the §8.4 screenshots.
 *
 *   node scripts/qa/emr.cjs                 dev server (/dur) + standalone (dist-portfolio/index.html)
 *   node scripts/qa/emr.cjs --only dev|file
 */
const fs = require('fs')
const path = require('path')
const { OUT, STANDALONE, playwright, arg, devServer, staticServer, Report, sleep, NOISE } = require('./lib.cjs')
const { audit } = require('./pagecheck.cjs')

const ALLOWED_ASCII = new Set(['DUR', 'nuvovet', 'NuvoVet', 'MDR1', 'ABCB1', 'P-gp', 'CYP3A', 'NSAID', 'NSAIDs'])

async function suite(browser, BASE, tag, report, opts = {}) {
  const OUTD = path.join(OUT, 'emr', tag)
  fs.mkdirSync(OUTD, { recursive: true })
  const ok = (name, cond, info) => report.check(`${tag} ${name}`, cond, info)
  const isFile = BASE.startsWith('file:')

  async function open(visit, o = {}) {
    const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, acceptDownloads: true, hasTouch: !!o.touch, colorScheme: o.site === 'dark' ? 'dark' : 'light' })
    await ctx.addInitScript((site) => { try { localStorage.setItem('nv-theme', site || 'light') } catch {} }, o.site || 'light')
    if (o.init) await ctx.addInitScript(o.init)
    const page = await ctx.newPage()
    page.logs = []
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !NOISE.some((r) => r.test(m.text()))) page.logs.push(m.type() + ': ' + m.text().slice(0, 200)) })
    page.on('pageerror', (e) => page.logs.push('pageerror: ' + e.message))
    await page.goto(`${BASE}#/emr/${visit}${o.q || ''}`)
    await page.waitForFunction(() => window.__emr && window.__emr.dur() && window.__emr.dur().getState().response, null, { timeout: 20000 })
    await sleep(300)
    return { ctx, page }
  }
  const state = (page) => page.evaluate(() => {
    const r = window.__emr.dur().getState().response
    return { level: r.extension.verdict.level, complete: r.extension.verdict.complete, cards: r.cards.map((c) => ({ rule: c.extension.ruleIds[0], sev: c.extension.severity, sugg: c.suggestions.map((s) => s.label), rows: c.extension.rowIds })), log: window.__emr.dur().getLog().map((f) => f.outcome) }
  })
  const badge = (page, rowId) => page.evaluate((id) => (document.querySelector(`[data-nv-slot="${id}"]`)?.shadowRoot?.textContent || '').trim(), rowId)
  const dialogOpen = (page) => page.evaluate(() => !!document.querySelector('nuvovet-dur-overlay')?.shadowRoot?.querySelector('dialog[open]'))
  const panelText = (page) => page.evaluate(() => document.getElementById('nv-panel')?.shadowRoot?.textContent || '')
  const proceedDisabled = (page) => page.locator('dialog [data-nv="proceed"]').isDisabled()
  const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUTD, `${name}.png`), fullPage: full })

  // A. Type the full V7 prescription from empty: badges update < 500 ms, focus stays, no dialog.
  {
    const { ctx, page } = await open('V7')
    for (let i = 0; i < 4; i++) await page.locator('.emr-grid tbody tr').first().locator('.emr-del').click()
    await sleep(100)
    const rows = [['카프로펜 정 100 mg', '4.4', '1', '7'], ['프레드니솔론 정 5 mg', '0.5', '1', '7'], ['트라마돌 정 50 mg', '5', '4', '5'], ['트라조돈 정 100 mg', '10', '1', '1']]
    let dialogSeen = false
    const focusLost = []
    const latency = []
    for (const [name, q, tt, dy] of rows) {
      await page.locator('[data-emr="rx-search"]').fill(name)
      await sleep(50)
      await page.keyboard.press('Enter')
      await sleep(50)
      const rowId = await page.evaluate(() => document.activeElement?.getAttribute('data-emr-qty'))
      if (!rowId) focusLost.push(name + ':qty-not-focused')
      await page.keyboard.type(q, { delay: 40 })
      const t0 = Date.now()
      await page.waitForFunction((id) => ((document.querySelector(`[data-nv-slot="${id}"]`)?.shadowRoot?.textContent || '').trim().length > 0), rowId, { timeout: 2000 }).catch(() => {})
      latency.push(Date.now() - t0)
      if (await dialogOpen(page)) dialogSeen = true
      await page.locator(`tr[data-row="${rowId}"] input[aria-label^="횟수"]`).click()
      await page.keyboard.type(tt, { delay: 40 })
      if (await dialogOpen(page)) dialogSeen = true
      await page.locator(`tr[data-row="${rowId}"] input[aria-label^="일수"]`).click()
      await page.keyboard.type(dy, { delay: 40 })
      if (await dialogOpen(page)) dialogSeen = true
      if (!(await page.evaluate(() => !!document.activeElement?.closest('.emr-grid')))) focusLost.push(name + ':focus-left-grid')
    }
    await sleep(500)
    const st = await state(page)
    ok('A timing: typing V7 from empty never opens a dialog', !dialogSeen && !(await dialogOpen(page)))
    ok('A timing: focus stays in the grid', focusLost.length === 0, focusLost)
    ok('A timing: row badge within 500 ms of the Qty edit', latency.every((l) => l < 500), latency)
    ok('A re-typed V7: major NSAID_CORTICOSTEROID + SEROTONERGIC', st.level === 'major' && st.cards.some((c) => c.rule === 'NSAID_CORTICOSTEROID') && st.cards.some((c) => c.rule === 'SEROTONERGIC'), st.cards.map((c) => c.rule + '/' + c.sev))
    ok('A console clean', page.logs.length === 0, page.logs)
    await ctx.close()
  }

  // Gate per visit: V1, V4, V7, V8, V9, V10 gate; V2, V3, V5, V6 save with the toast.
  {
    const gated = []
    const toasts = []
    for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10']) {
      const { ctx, page } = await open(v)
      await page.click('[data-emr="save"]')
      await sleep(350)
      if (await dialogOpen(page)) gated.push(v)
      else if (/처방을 저장했습니다/.test((await page.locator('.emr-toast').textContent().catch(() => '')) || '')) toasts.push(v)
      await ctx.close()
    }
    ok('gate per visit: V1 V4 V7 V8 V9 V10 open the gate', gated.join() === 'V1,V4,V7,V8,V9,V10', gated)
    ok('gate per visit: V2 V3 V5 V6 save directly with the toast', toasts.join() === 'V2,V3,V5,V6', toasts)
  }

  // B. V7 override (reason alone), NV-OTH needs a comment, chart line, dedupe, re-raise on dose / weight change.
  {
    const { ctx, page } = await open('V7')
    await page.click('[data-emr="save"]'); await sleep(300)
    ok('B V7 gate opens', await dialogOpen(page))
    ok('B proceed disabled before a reason', await proceedDisabled(page))
    await page.locator('dialog input[type="radio"][value="NV-OTH"]').check()
    const othAlone = await proceedDisabled(page)
    await page.locator('dialog textarea').fill('보호자와 상의 후 단기 병용, 3일 후 재평가')
    const othComment = await proceedDisabled(page)
    ok('B NV-OTH: disabled without a comment, enabled with a valid one', othAlone && !othComment, { othAlone, othComment })
    await page.locator('dialog textarea').fill('')
    await page.locator('dialog input[type="radio"][value="NV-J2"]').check()
    ok('B major: a reason alone enables proceed', !(await proceedDisabled(page)))
    const cb = page.locator('dialog .nv-check input[type="checkbox"]')
    ok('B major: 보호자 checkbox shown and optional', (await cb.count()) > 0 && !(await cb.first().isChecked()))
    await shot(page, 'v7-gate-1440')
    await page.locator('dialog [data-nv="proceed"]').click(); await sleep(300)
    const lines = await page.locator('[data-emr="chart-lines"] li').allTextContents()
    ok('B proceed: toast + one chart line', (await page.locator('.emr-toast').textContent()) === '처방을 저장했습니다 (데모)' && lines.length === 1 && /NV-J2/.test(lines[0]), lines)
    await sleep(2800)
    await page.click('[data-emr="save"]'); await sleep(300)
    ok('B dedupe: saving again opens no gate', !(await dialogOpen(page)))
    await page.locator('tr[data-row="rx-2"] input[data-emr-qty]').fill('1'); await sleep(450)
    await page.click('[data-emr="save"]'); await sleep(300)
    ok('B prednisolone 1 mg/kg re-raises the gate', await dialogOpen(page))
    await page.keyboard.press('Escape'); await sleep(200)
    await page.locator('tr[data-row="rx-2"] input[data-emr-qty]').fill('0.5'); await sleep(450)
    await page.click('[data-emr="save"]'); await sleep(300)
    const backToAck = !(await dialogOpen(page))
    if (!backToAck) { await page.keyboard.press('Escape'); await sleep(200) }
    await page.locator('[data-emr="weight"]').fill('26'); await sleep(450)
    await page.click('[data-emr="save"]'); await sleep(300)
    ok('B weight 26 kg re-raises the gate', await dialogOpen(page), { backToAck })
    ok('B console clean', page.logs.length === 0, page.logs)
    await ctx.close()
  }

  // C. V1 contraindicated requirements, Enter safety, NV-DATA, suggestion, export.
  {
    const { ctx, page } = await open('V1')
    await page.click('[data-emr="save"]'); await sleep(300)
    await page.locator('dialog input[type="radio"][value="NV-J2"]').check()
    ok('C V1 reason alone: still disabled', await proceedDisabled(page))
    await page.locator('dialog textarea').fill('ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ')
    ok('C meaningless comment: still disabled', await proceedDisabled(page))
    await page.locator('dialog textarea').fill('케토코나졸 감량 병용, 2주 후 재검')
    ok('C reason + comment, no 보호자 tick: still disabled', await proceedDisabled(page))
    await page.locator('dialog .nv-check input[type="checkbox"]').check()
    ok('C reason + comment + 보호자: enabled', !(await proceedDisabled(page)))
    await page.locator('dialog textarea').press('Enter'); await sleep(200)
    ok('C Enter does not override', (await dialogOpen(page)) && (await state(page)).log.length === 0)
    await page.keyboard.press('Escape'); await sleep(200)
    await page.click('[data-emr="save"]'); await sleep(300)
    await page.locator('dialog input[type="radio"][value="NV-DATA"]').check(); await sleep(100)
    await page.locator('dialog button', { hasText: '차트 수정' }).click(); await sleep(250)
    const fx = await page.evaluate(() => ({ active: document.activeElement?.getAttribute('data-emr'), log: window.__emr.dur().getLog().length }))
    ok('C NV-DATA: fix-chart focuses 특이사항 and logs nothing', !(await dialogOpen(page)) && fx.active === 'mdr1' && fx.log === 0, fx)
    await page.locator('#nv-panel button', { hasText: '이버멕틴 삭제' }).click(); await sleep(400)
    const st = await state(page)
    const rows = await page.evaluate(() => window.__emr.visit().rows.map((r) => r.rowId))
    ok('C accepting "이버멕틴 삭제" removes the row, clears the card, logs one accepted', rows.join() === 'rx-2' && !st.cards.some((c) => c.rule === 'MDR1_PGP_ML') && st.log.filter((x) => x === 'accepted').length === 1, { rows, log: st.log })
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("기록 내보내기")')])
    const file = path.join(OUTD, 'export.json')
    await dl.saveAs(file)
    const json = JSON.parse(fs.readFileSync(file, 'utf8'))
    const f0 = json.feedback && json.feedback[0]
    ok('C export: {feedback:[…]} with the §3.10 fields', /^nuvovet-dur-log-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()) && Array.isArray(json.feedback) && json.feedback.length === 1 && f0.outcome === 'accepted' && f0.card && f0.outcomeTimestamp, { name: dl.suggestedFilename(), keys: f0 && Object.keys(f0) })
    ok('C console clean', page.logs.length === 0, page.logs)
    await ctx.close()
  }

  // D. V4 species hard stop offers only NV-DATA and NV-OTH.
  {
    const { ctx, page } = await open('V4')
    await page.click('[data-emr="save"]'); await sleep(300)
    const codes = await page.locator('dialog input[type="radio"]').evaluateAll((els) => els.map((e) => e.value))
    ok('D V4 reasons = NV-DATA, NV-OTH', codes.join() === 'NV-DATA,NV-OTH', codes)
    await ctx.close()
  }

  // E. V8 live re-check: Tx meloxicam Dy 1 → 3.
  {
    const { ctx, page } = await open('V8')
    await page.locator('tr[data-row="rx-2"] input[aria-label^="일수"]').fill('3'); await sleep(450)
    const st = await state(page)
    const b = await badge(page, 'rx-2')
    const hard = st.cards.find((c) => c.rule === 'SPECIES_HARDSTOP')
    ok('E V8 Dy 3: 원내 중대 on the Tx row, a second card without a delete suggestion', /원내/.test(b) && /중대/.test(b) && st.cards.length === 2 && hard && hard.sugg.length === 0, { b, cards: st.cards })
    for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h }); await sleep(400)
      await shot(page, `v8b-${w}`)
    }
    await ctx.close()
  }

  // F. V3 powder.
  {
    const { ctx, page } = await open('V3')
    const before = await badge(page, 'rx-3')
    await page.locator('tr[data-row="rx-3"] select[aria-label^="조제"]').selectOption('가루'); await sleep(450)
    const after = await badge(page, 'rx-3')
    const txt = await panelText(page)
    ok('F V3 가루: ≈ disappears, coverage adds 분쇄 가능 여부', before.includes('≈') && !after.includes('≈') && txt.includes('분쇄 가능 여부'), { before, after })
    await ctx.close()
  }

  // Related badges: V1 ketoconazole, V6 furosemide + benazepril.
  {
    const r = {}
    for (const [v, rowsWanted] of [['V1', ['rx-2']], ['V6', ['rx-2', 'rx-4']]]) {
      const { ctx, page } = await open(v)
      for (const id of rowsWanted) {
        const info = await page.evaluate((x) => {
          const sr = document.querySelector(`[data-nv-slot="${x}"]`)?.shadowRoot
          const b = sr && [...sr.querySelectorAll('[data-status]')].find((e) => /관련/.test(e.textContent))
          return b ? { text: b.textContent.trim(), status: b.getAttribute('data-status'), border: getComputedStyle(b).borderTopWidth, fill: getComputedStyle(b).backgroundColor } : null
        }, id)
        r[`${v}/${id}`] = info
      }
      await ctx.close()
    }
    ok('related: V1 ketoconazole and V6 furosemide/benazepril show the outline 관련 badge', Object.values(r).every((x) => x && x.status === 'related' && parseFloat(x.border) >= 1), r)
  }

  // G. V5 weight cleared, unmapped product via the test hook.
  {
    const { ctx, page } = await open('V5')
    await shot(page, 'v5-1440')
    await page.locator('[data-emr="weight"]').fill(''); await sleep(450)
    const v = await page.evaluate(() => { const el = document.getElementById('nv-panel').shadowRoot.querySelector('[data-nv="verdict"]'); return { text: el?.textContent, check: !!el?.querySelector('.lucide-circle-check, .lucide-circle-check-big') } })
    ok('G V5 no weight: 검토 불완전, no check icon', /검토 불완전/.test(v.text) && !v.check, v)
    await page.evaluate(() => window.__emr.addRow({ kind: 'Rx', rowId: 'rx-9', productCode: 'RX-XYZ-999', unit: 'mg/kg', qty: '1', tt: '1', dy: '7', rt: 'PO' })); await sleep(300)
    ok('G unmapped RX-XYZ-999 shows 검토 안 함', (await badge(page, 'rx-9')).includes('검토 안 함'), await badge(page, 'rx-9'))
    await ctx.close()
  }

  // H. V10 free-text allergy.
  {
    const { ctx, page } = await open('V10')
    await page.locator('button[aria-label^="알레르기 삭제"]').click(); await sleep(450)
    const mid = await state(page)
    await page.locator('[data-emr="allergy"]').fill('페니실린 알레르기')
    await page.locator('[data-emr="allergy"]').press('Enter'); await sleep(450)
    const st = await state(page)
    const txt = await panelText(page)
    ok('H V10: coded allergy removed → no ALLERGY_CLASS', !mid.cards.some((c) => c.rule === 'ALLERGY_CLASS'))
    ok('H free text "페니실린 알레르기": ALLERGY_CLASS + "자유 입력에서 인식: 확인"', st.cards.some((c) => c.rule === 'ALLERGY_CLASS') && txt.includes('자유 입력에서 인식: 확인') && !st.complete, st.cards.map((c) => c.rule))
    await ctx.close()
  }

  // I. localStorage throwing.
  {
    const init = () => { const t = () => { throw new Error('blocked') }; Storage.prototype.getItem = t; Storage.prototype.setItem = t; Storage.prototype.removeItem = t }
    const { ctx, page } = await open('V7', { init })
    await page.click('[data-emr="save"]'); await sleep(300)
    await page.locator('dialog input[type="radio"][value="NV-J2"]').check()
    await page.locator('dialog [data-nv="proceed"]').click(); await sleep(300)
    await page.click('[data-emr="save"]'); await sleep(300)
    ok('I localStorage throwing: override + dedupe still work, no page error', !(await dialogOpen(page)) && !page.logs.some((l) => l.startsWith('pageerror')), page.logs)
    await ctx.close()
  }

  // J. Markers at three viewports, print, language, themes, screenshots.
  for (const [w, h, touch] of [[1440, 900], [1024, 768], [390, 844, true]]) {
    const { ctx, page } = await open('V1', { w, h, touch })
    const vis = await page.evaluate(() => {
      const seen = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom <= innerHeight && r.right <= innerWidth }
      const marker = [...document.querySelectorAll('[data-emr="demo-bar"] *')].find((e) => e.textContent === '교육용 프로토타입')
      return { watermark: seen(document.querySelector('.emr-watermark')), marker: seen(marker), widgetMarker: !!document.getElementById('nv-panel')?.shadowRoot?.querySelector('[data-nv="marker"]') || !!document.querySelector('nuvovet-dur-overlay')?.shadowRoot?.querySelector('[data-nv="marker"]'), sw: document.documentElement.scrollWidth, iw: innerWidth }
    })
    ok(`J ${w}: 가상 EMR + 교육용 프로토타입 visible, widget marker absent, no page scroll`, vis.watermark && vis.marker && !vis.widgetMarker && vis.sw <= vis.iw, vis)
    await shot(page, `v1-panel-${w}`)
    await page.click('[data-emr="save"]'); await sleep(400)
    await shot(page, `v1-gate-${w}`)
    if (w === 1440 || w === 390) {
      const { ctx: c7, page: p7 } = await open('V7', { w, h, touch })
      await p7.click('[data-emr="save"]'); await sleep(400)
      await shot(p7, `v7-gate-${w}`)
      await c7.close()
    }
    await ctx.close()
  }
  if (!isFile) {
    const { ctx, page } = await open('V1')
    await page.emulateMedia({ media: 'print' })
    const pr = await page.evaluate(() => ({ wm: getComputedStyle(document.querySelector('.emr-watermark')).display, panel: document.getElementById('nv-panel') ? getComputedStyle(document.getElementById('nv-panel')).display : 'absent', overlay: getComputedStyle(document.querySelector('nuvovet-dur-overlay')).display }))
    const pdf = path.join(OUTD, 'v1-print.pdf')
    await page.pdf({ path: pdf })
    ok('J print: the 가상 EMR watermark prints; panel and overlay hidden', pr.wm !== 'none' && pr.panel === 'none' && pr.overlay === 'none' && fs.statSync(pdf).size > 1000, pr)
    await ctx.close()
  }
  // Language: ko widget text has no ASCII word of 4+ letters (allowed: codes, rule IDs, units, names); en has no Hangul chrome.
  {
    const widgetText = (page) => page.evaluate(() => {
      const roots = [document.querySelector('nuvovet-dur-overlay')?.shadowRoot, document.getElementById('nv-panel')?.shadowRoot, ...[...document.querySelectorAll('[data-nv-slot]')].map((s) => s.shadowRoot)].filter(Boolean)
      const out = []
      for (const r of roots) {
        const it = document.createTreeWalker(r, NodeFilter.SHOW_TEXT)
        // source citations (.nv-cite chips and the card's 근거 list) are reference titles, quoted as published
        const cited = (el) => !!el && (!!el.closest('.nv-cite') || !!(el.closest('li') && /^(근거|Evidence)/.test(el.closest('section')?.querySelector('h4')?.textContent || '')))
        for (let n = it.nextNode(); n; n = it.nextNode()) if (n.textContent.trim() && !cited(n.parentElement)) out.push(n.textContent.trim())
        for (const el of r.querySelectorAll('[aria-label]')) out.push(el.getAttribute('aria-label'))
      }
      return out
    })
    const koWords = []
    const dashes = []
    for (const v of ['V1', 'V4', 'V7', 'V8']) {
      const { ctx, page } = await open(v)
      await page.click('[data-emr="save"]'); await sleep(350)
      const texts = await widgetText(page)
      const hostText = await page.evaluate(() => document.querySelector('.emr-root')?.innerText || '')
      for (const t of texts) {
        for (const w of t.match(/[A-Za-z][A-Za-z-]{3,}/g) || []) {
          if (ALLOWED_ASCII.has(w)) continue
          if (/^[A-Z0-9_]+$/.test(w) || /^NV-[A-Z]+$/.test(w)) continue // rule IDs, drug and override-reason codes
          if (/\b(19|20)\d\d\b/.test(t)) continue // source citations ("Mealey 2008")
          if (/^(mg|mL|kg|day|dose|tab|IU|mcg)/.test(w)) continue // units
          if (/doi|DOI/.test(t)) continue
          koWords.push(`${v}: ${w} in "${t.slice(0, 50)}"`)
        }
        if (t.includes('—')) dashes.push(`${v} widget: ${t.slice(0, 60)}`)
      }
      if (hostText.includes('—')) dashes.push(`${v} host`)
      await ctx.close()
    }
    ok('language ko: no ASCII word of 4+ letters in widget text except codes, units, names', koWords.length === 0, koWords.slice(0, 15))
    ok('no "—" in any widget or host string', dashes.length === 0, dashes)
    const hangul = []
    for (const v of ['V1', 'V7']) {
      const { ctx, page } = await open(v, { q: '?lang=en' })
      await page.click('[data-emr="save"]'); await sleep(350)
      const texts = await widgetText(page)
      // patient and drug names come from the (Korean) host chart: allow any Hangul word the host shows
      const hostWords = new Set((await page.evaluate(() => document.querySelector('.emr-root')?.innerText || '')).match(/[가-힣]+/g) || [])
      for (const t of texts) for (const w of t.match(/[가-힣]+/g) || []) if (!hostWords.has(w)) hangul.push(`${v}: ${w} in "${t.slice(0, 50)}"`)
      if (v === 'V1') await shot(page, 'v1-gate-en-1440')
      await ctx.close()
    }
    ok('language en: no Hangul in widget chrome (patient and drug names excepted)', hangul.length === 0, hangul.slice(0, 15))
  }
  // Accessibility: ARIA, live region, contrast (widget light + dark).
  {
    const { ctx, page } = await open('V1')
    const a = await page.evaluate(() => {
      const pr = document.getElementById('nv-panel').shadowRoot
      const region = pr.querySelector('[role=region]')
      const discl = [...pr.querySelectorAll('button[aria-controls], button[aria-expanded]')]
      const badges = [...document.querySelectorAll('[data-nv-slot]')].map((s) => s.shadowRoot?.querySelector('.nv-rowbadge')).filter(Boolean)
      return {
        region: region ? region.getAttribute('aria-label') || region.getAttribute('aria-labelledby') : null,
        disclosuresWithExpanded: discl.filter((b) => b.hasAttribute('aria-expanded')).length, disclosures: discl.length,
        badgeButtons: badges.filter((b) => b.tagName === 'BUTTON' && (b.getAttribute('aria-label') || '').length > 6).length, badges: badges.length,
        live: document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('[aria-live]')?.textContent || '',
      }
    })
    ok('a11y: panel role=region with a name', !!a.region, a.region)
    ok('a11y: disclosures carry aria-expanded', a.disclosures > 0 && a.disclosuresWithExpanded === a.disclosures, a)
    ok('a11y: row badges are buttons with descriptive aria-labels', a.badges > 0 && a.badgeButtons === a.badges, a)
    // live region: a qty edit that keeps the counts must not change it; a count change must
    const live = () => page.evaluate(() => document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('[aria-live]')?.textContent || '')
    const l0 = await live()
    await page.locator('tr[data-row="rx-2"] input[data-emr-qty]').fill('5.5'); await sleep(500)
    const l1 = await live()
    await page.evaluate(() => window.__emr.deleteRow('rx-1')); await sleep(500)
    const l2 = await live()
    ok('a11y: live region changes only when counts change', l1 === l0 && l2 !== l1, { l0, l1, l2 })
    await page.click('[data-emr="save"]').catch(() => {}); await sleep(300)
    await ctx.close()
    const g = await open('V1')
    await g.page.click('[data-emr="save"]'); await sleep(350)
    const gd = await g.page.evaluate(() => { const d = document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('dialog'); return { tag: d.tagName, role: d.getAttribute('role'), modal: d.matches(':modal') } })
    ok('a11y: gate is role=alertdialog on a modal <dialog>', gd.tag === 'DIALOG' && gd.role === 'alertdialog' && gd.modal, gd)
    await g.ctx.close()
    for (const theme of ['light', 'dark']) {
      const { ctx: c2, page: p2 } = await open('V1', { q: theme === 'dark' ? '?theme=dark' : '' })
      const r1 = await p2.evaluate(audit, { kind: 'emr', contrast: true, shadowOnly: true, limit: 10 })
      await p2.click('[data-emr="save"]'); await sleep(350)
      const r2 = await p2.evaluate(audit, { kind: 'emr', contrast: true, shadowOnly: true, limit: 10 })
      if (theme === 'dark') await shot(p2, 'v1-gate-widget-dark-1440')
      const bad = [...(r1.contrast || []), ...(r2.contrast || [])]
      ok(`a11y: every widget text node ≥ 4.5:1 (widget ${theme}, panel + gate)`, bad.length === 0, bad)
      await c2.close()
    }
  }
  // Site dark keeps the EMR light; widget dark keeps the host light.
  {
    const { ctx, page } = await open('V1', { site: 'dark' })
    const r = await page.evaluate(() => ({ host: getComputedStyle(document.querySelector('.emr-root')).backgroundColor, bar: getComputedStyle(document.querySelector('[data-emr="demo-bar"]')).backgroundColor }))
    ok('site dark: demo bar dark, EMR host light', r.host === 'rgb(233, 236, 239)' && r.bar !== 'rgb(255, 255, 255)', r)
    await shot(page, 'v1-site-dark-1440')
    await ctx.close()
    const w = await open('V1', { q: '?theme=dark' })
    const bg = await w.page.evaluate(() => getComputedStyle(document.querySelector('.emr-root')).backgroundColor)
    ok('widget dark: host stays light', bg === 'rgb(233, 236, 239)', bg)
    await shot(w.page, 'v1-widget-dark-1440')
    await w.ctx.close()
  }
}

/** The widget footer marker is on by default in the IIFE (widget-demo/index.html). */
async function markerOnIIFE(browser, sbase, report) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${sbase}/widget-demo/index.html`)
  await page.waitForFunction(() => !!document.getElementById('nv-panel')?.shadowRoot?.querySelector('.nv-card'), null, { timeout: 10000 }).catch(() => {})
  const has = await page.evaluate(() => !!document.getElementById('nv-panel')?.shadowRoot?.querySelector('[data-nv="marker"]'))
  report.check('markers: the widget footer marker is present on widget-demo/index.html', has)
  await page.close()
}

async function main() {
  const only = arg('--only', null)
  const report = new Report(arg('--name', 'emr'))
  const browser = await playwright().chromium.launch()
  const dev = only === 'file' ? null : await devServer()
  const st = await staticServer()
  try {
    if (dev) await suite(browser, dev.base + '/dur', 'dev', report)
    if (only !== 'dev') await suite(browser, STANDALONE, 'file', report)
    await markerOnIIFE(browser, st.base, report)
  } catch (e) {
    report.check('emr suite ran to the end', false, e.message.slice(0, 400))
  } finally {
    await browser.close()
    st.stop()
    if (dev) dev.stop()
  }
  return report.finish()
}

if (require.main === module) main()
module.exports = { main }
