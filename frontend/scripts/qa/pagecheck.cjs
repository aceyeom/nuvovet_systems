/*
 * In-page checks shared by shots.cjs, a11y.cjs and emr.cjs. Everything here runs inside the page
 * (page.evaluate(audit, opts)) and walks open shadow roots too, so the EMR widget is covered.
 *
 * audit(opts) returns { [checkName]: [ { el, …detail } ] } (empty arrays pass):
 *   §9.2  hscroll, numLine, koreanWrap (+ koreanOverwide, reported separately), clipped, minSize
 *   §9.7  colour, fontSizes, radius, shadow, nesting, icons, letterCase, canvas
 *   §9.5  contrast (+ overImage for manual review)
 * opts: { kind: 'app'|'marketing'|'emr'|'widget', skipHost: bool (exclude the fictional EMR host's
 *         light DOM from the design budgets), contrast: bool, limit: n }
 */

function audit(opts) {
  const { kind = 'app', skipHost = false, contrast = false, limit = 12, shadowOnly = false } = opts || {}
  const out = {}
  const add = (k, v) => { (out[k] = out[k] || []).push(v) }

  // ── traversal ────────────────────────────────────────────────────────────────
  const elements = []
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      elements.push(el)
      if (el.shadowRoot) walk(el.shadowRoot)
    }
  }
  walk(document)
  const parentOf = (el) => el.parentElement || (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null)
  const closestDeep = (el, sel) => {
    for (let e = el; e; e = parentOf(e)) if (e.matches && e.matches(sel)) return e
    return null
  }
  // The fictional EMR host (.emr-root) and the deliberately hostile third-party page (kind 'widget') are not
  // ours: on them only the widget's shadow DOM is held to the design budgets.
  const inShadow = (el) => el.getRootNode() instanceof ShadowRoot
  const inHost = (el) => (kind === 'widget' ? !inShadow(el) : !!(skipHost && el.closest('.emr-root')))
  const describe = (el) => {
    let s = el.tagName.toLowerCase()
    if (el.id) s += '#' + el.id
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    if (cls) s += '.' + cls
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return t ? `${s} "${t}"` : s
  }
  const csCache = new Map()
  const cs = (el) => { let c = csCache.get(el); if (!c) { c = getComputedStyle(el); csCache.set(el, c) } return c }
  const visible = (el) => {
    const c = cs(el)
    if (c.visibility === 'hidden' || c.display === 'none' || Number(c.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const srOnly = (el) => {
    for (let e = el; e && e !== document.body; e = parentOf(e)) {
      const c = cs(e)
      if (c.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(c.clipPath)) return true
      const r = e.getBoundingClientRect()
      if (c.overflow === 'hidden' && (r.width <= 1 || r.height <= 1)) return true
    }
    return false
  }
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent).join('').trim()
  const visibleEls = elements.filter((el) => !(el instanceof SVGElement && el.tagName !== 'svg' && el.tagName !== 'text' && el.tagName !== 'tspan') && visible(el))
  const visSet = new Set(visibleEls)
  const isVisibleDeep = (el) => {
    for (let e = el; e; e = parentOf(e)) {
      const c = cs(e)
      if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) === 0) return false
    }
    return true
  }

  // text nodes (visible, not sr-only)
  const textNodes = []
  const tw = (root) => {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = it.nextNode(); n; n = it.nextNode()) {
      if (!n.textContent.trim()) continue
      const p = n.parentElement
      if (!p || !visSet.has(p) || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'OPTION'].includes(p.tagName)) continue
      if (srOnly(p)) continue
      textNodes.push(n)
    }
  }
  tw(document)
  for (const el of elements) if (el.shadowRoot) tw(el.shadowRoot)

  // ── colour helpers (canvas normalises any CSS colour syntax to 8-bit sRGB) ───
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const colCache = new Map()
  const rgba = (s) => {
    if (!s) return [0, 0, 0, 0]
    let v = colCache.get(s)
    if (v) return v
    if (s === 'transparent' || /rgba\(0, 0, 0, 0\)/.test(s)) v = [0, 0, 0, 0]
    else {
      cx.clearRect(0, 0, 1, 1)
      cx.fillStyle = '#000'
      cx.fillStyle = s
      cx.fillRect(0, 0, 1, 1)
      const d = cx.getImageData(0, 0, 1, 1).data
      v = [d[0], d[1], d[2], d[3] / 255]
    }
    colCache.set(s, v)
    return v
  }
  const over = (top, bot) => {
    const a = top[3] + bot[3] * (1 - top[3])
    if (!a) return [0, 0, 0, 0]
    return [0, 1, 2].map((i) => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a)
  }
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const chroma = (c) => {
    const [r, g, b] = [lin(c[0]), lin(c[1]), lin(c[2])]
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return Math.hypot(A, B)
  }
  const pageBg = rgba(getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#fff')
  const opaqueBg = pageBg[3] ? pageBg : [255, 255, 255, 1]
  /** Effective background behind `el`, blending translucent layers up to the first opaque one. */
  const bgCache = new Map()
  const effectiveBg = (el) => {
    if (bgCache.has(el)) return bgCache.get(el)
    const layers = []
    let image = false
    for (let e = el; e; e = parentOf(e)) {
      const c = cs(e)
      if (c.backgroundImage && c.backgroundImage !== 'none') image = true
      const b = rgba(c.backgroundColor)
      if (b[3] > 0) { layers.push(b); if (b[3] >= 0.999) break }
    }
    let acc = [...opaqueBg]
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc)
    const res = { bg: acc, image }
    bgCache.set(el, res)
    return res
  }
  const opacityChain = (el) => { let o = 1; for (let e = el; e; e = parentOf(e)) o *= Number(cs(e).opacity); return o }

  // ── §9.2 no horizontal page scroll ─────────────────────────────────────────
  if (kind !== 'widget' && document.documentElement.scrollWidth > innerWidth) {
    const wide = visibleEls.filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !closestDeep(el, '[data-scroll-x], .overflow-x-auto')).slice(0, 5).map(describe)
    add('hscroll', { scrollWidth: document.documentElement.scrollWidth, innerWidth, wide })
  }

  // ── §9.2 numbers and IDs on one line ───────────────────────────────────────
  for (const el of visibleEls) {
    if (!el.matches('.num, .id, td.num, th.num') || (kind === 'widget' && !inShadow(el))) continue
    if (!el.textContent.trim()) continue
    // rects of the visible text only (an sr-only description inside the element is not on screen)
    const rects = []
    const it = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = it.nextNode(); n; n = it.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement || srOnly(n.parentElement) || !isVisibleDeep(n.parentElement)) continue
      if (n.parentElement !== el && n.parentElement.closest('[data-radix-popper-content-wrapper], [role=tooltip]')) continue
      const r = document.createRange()
      r.selectNodeContents(n)
      rects.push(...r.getClientRects())
    }
    const tops = new Set(rects.filter((x) => x.width > 0).map((x) => Math.round(x.top + x.height / 2)))
    // fragments on one line can differ by a pixel or two (mixed inline boxes)
    const lines = [...tops].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] > 4)
    if (lines.length > 1) add('numLine', { el: describe(el), lines: lines.length })
  }

  // ── text-node checks ───────────────────────────────────────────────────────
  const HANGUL = /[가-힣]/
  const sizes = new Map()
  const measure = document.createElement('canvas').getContext('2d')
  for (const n of textNodes) {
    const p = n.parentElement
    const c = cs(p)
    const fs = parseFloat(c.fontSize)
    const hostText = inHost(p)
    if (kind === 'widget' && hostText) continue
    // min size (§9.2 / T3)
    if (fs < 12 && !p.closest('svg[aria-hidden="true"]')) add('minSize', { el: describe(p), fontSize: c.fontSize })
    if (!hostText) sizes.set(c.fontSize, (sizes.get(c.fontSize) || 0) + 1)
    // letter case (§9.7.7)
    if (c.textTransform === 'uppercase') add('letterCase', { el: describe(p), textTransform: 'uppercase' })
    if (HANGUL.test(n.textContent) && c.letterSpacing !== 'normal' && parseFloat(c.letterSpacing) > 0) add('letterCase', { el: describe(p), letterSpacing: c.letterSpacing })
    // Korean wrapping (§9.2)
    if (HANGUL.test(n.textContent)) {
      const text = n.textContent
      const re = /\S+/g
      let m
      while ((m = re.exec(text))) {
        const word = m[0]
        if ((word.match(/[가-힣]/g) || []).length < 2) continue
        const r = document.createRange()
        r.setStart(n, m.index)
        r.setEnd(n, m.index + word.length)
        const rects = [...r.getClientRects()].filter((x) => x.width > 0)
        if (rects.length < 2) continue
        const t0 = Math.round(rects[0].top)
        if (rects.every((x) => Math.abs(Math.round(x.top) - t0) < 3)) continue
        // find the break positions
        let prevTop = null
        for (let i = 0; i < word.length; i++) {
          const cr = document.createRange()
          cr.setStart(n, m.index + i)
          cr.setEnd(n, m.index + i + 1)
          const rr = cr.getClientRects()[0]
          if (!rr) continue
          if (prevTop !== null && rr.top - prevTop > 3 && HANGUL.test(word[i]) && HANGUL.test(word[i - 1])) {
            measure.font = c.font
            const natural = measure.measureText(word).width
            const box = p.getBoundingClientRect().width
            add(natural > box + 1 ? 'koreanOverwide' : 'koreanWrap', { el: describe(p), word, at: i })
            break
          }
          prevTop = rr.top
        }
      }
    }
    // contrast (§9.5): every text node
    if (contrast) {
      const fg0 = rgba(c.color)
      if (p.closest('[disabled], [aria-disabled="true"]') || p.closest('[inert]')) continue
      if (shadowOnly && !(p.getRootNode() instanceof ShadowRoot)) continue
      const { bg, image } = effectiveBg(p)
      const o = opacityChain(p)
      const fg = over([fg0[0], fg0[1], fg0[2], fg0[3] * o], bg)
      const rt = ratio(fg, bg)
      const large = fs >= 24 || (fs >= 18.66 && Number(c.fontWeight) >= 700)
      const need = large ? 3 : 4.5
      if (image) add('overImage', { el: describe(p) })
      else if (rt < need - 0.005) add('contrast', { el: describe(p), ratio: Math.round(rt * 100) / 100, need, fg: c.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(', ')})` })
    }
  }
  const sizeLimit = kind === 'marketing' ? 8 : 6
  if (sizes.size > sizeLimit) add('fontSizes', { count: sizes.size, limit: sizeLimit, sizes: [...sizes.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([s, n]) => `${s}×${n}`) })

  // ── §9.2 clipped text ──────────────────────────────────────────────────────
  for (const el of visibleEls) {
    if (kind === 'widget' && !inShadow(el)) continue
    if (el.scrollWidth <= el.clientWidth + 1) continue
    const c = cs(el)
    if (!/(hidden|clip)/.test(c.overflowX) && c.textOverflow !== 'ellipsis') continue
    if (srOnly(el) || inHost(el) && el.closest('[data-truncate][title]')) continue
    if (el.matches('[data-truncate][title]') || el.closest('[data-truncate][title]')) continue
    if (el.matches('input, select, textarea, svg')) continue
    const own = ownText(el)
    let clippedChild = null
    if (!own) {
      // a container that clips a descendant's text horizontally
      const box = el.getBoundingClientRect()
      for (const d of el.querySelectorAll('*')) {
        const t = ownText(d)
        if (!t || !visSet.has(d)) continue
        const r = d.getBoundingClientRect()
        if (r.right > box.right + 1 || r.left < box.left - 1) { if (!d.closest('[data-truncate][title]')) { clippedChild = d; break } }
      }
    }
    if (own || clippedChild) add('clipped', { el: describe(el), child: clippedChild ? describe(clippedChild) : undefined, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })
  }

  // ── §9.7 element budgets ───────────────────────────────────────────────────
  // "a link" includes the design system's link-styled controls: Button variant="link" and the widget's .nv-link-btn
  const ALLOWED_COLOUR = '[data-status], a, [data-variant="link"], .nv-link-btn, :focus-visible, [aria-selected="true"], [aria-current], [data-chart], [class*="recharts"]'
  const RADII = new Set([0, 4, 6, 8, 12])
  const radiusOk = (v) => {
    if (v.endsWith('%')) return v === '50%' || v === '0%'
    const parts = v.split(' ').map(parseFloat)
    return parts.every((x) => RADII.has(Math.round(x * 100) / 100) || x >= 9999)
  }
  const isControl = (el) => el.matches('button, input, select, textarea, a, kbd, [role=button], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=combobox], [role=option], [role=menuitem], [data-badge], [data-status], dialog, [role=dialog], [role=alertdialog]')
  const bordered3 = (el) => {
    const c = cs(el)
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== 'none' && rgba(c[`border${s}Color`])[3] > 0)
    return sides.length >= 3
  }
  for (const el of visibleEls) {
    if (inHost(el)) continue
    const c = cs(el)
    // colour
    if (!closestDeep(el, ALLOWED_COLOUR)) {
      const hasText = !!ownText(el)
      const checks = []
      if (hasText) checks.push(['color', c.color])
      const b = rgba(c.backgroundColor)
      if (b[3] > 0) checks.push(['background', c.backgroundColor])
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== 'none') checks.push([`border-${s.toLowerCase()}`, c[`border${s}Color`]])
      for (const [prop, val] of checks) {
        const v = rgba(val)
        if (!v[3]) continue
        const blended = over(v, effectiveBg(parentOf(el) || el).bg)
        const ch = chroma(blended)
        if (ch > 0.04) { add('colour', { el: describe(el), prop, value: val, chroma: Math.round(ch * 1000) / 1000 }); break }
      }
    }
    // radius
    for (const k of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) {
      if (!radiusOk(c[k])) { add('radius', { el: describe(el), [k]: c[k] }); break }
    }
    // shadow
    if (c.boxShadow && c.boxShadow !== 'none' && !closestDeep(el, '[data-radix-popper-content-wrapper], [role=dialog], [role=alertdialog], [data-sonner-toast], [data-sonner-toaster], [data-floating], dialog')) {
      add('shadow', { el: describe(el), boxShadow: c.boxShadow.slice(0, 80) })
    }
    // nesting
    if (!isControl(el) && el.getBoundingClientRect().height > 28 && bordered3(el)) {
      let n = 0
      const chain = []
      for (let a = parentOf(el); a; a = parentOf(a)) {
        if (skipHost && a.closest && a.closest('.emr-root') && !(a.getRootNode() instanceof ShadowRoot)) continue
        if (!isControl(a) && visSet.has(a) && bordered3(a)) { n++; chain.push(describe(a).slice(0, 50)) }
      }
      if (n > 1) add('nesting', { el: describe(el), ancestors: chain })
    }
  }
  // icons per table row
  for (const row of elements.filter((e) => e.matches('tbody tr, [role=row]') && !e.querySelector('th, [role=columnheader]') && visSet.has(e))) {
    if (inHost(row)) continue
    const cells = row.querySelectorAll(':scope > td, :scope > [role=cell], :scope > [role=gridcell]')
    const last = cells[cells.length - 1]
    const icons = [...row.querySelectorAll('svg.lucide')].filter((s) => visSet.has(s) && !(last && last.contains(s) && s.closest('button, a')))
    if (icons.length > 1) add('icons', { el: describe(row), icons: icons.length })
  }
  // canvas
  const bodyBg = rgba(cs(document.body).backgroundColor)
  if (kind !== 'widget' && (bodyBg.slice(0, 3).join() !== pageBg.slice(0, 3).join() || bodyBg[3] < 1)) add('canvas', { el: 'body', bg: cs(document.body).backgroundColor })
  if (kind !== 'emr' && kind !== 'widget') {
    for (const main of document.querySelectorAll('main')) {
      const b = rgba(cs(main).backgroundColor)
      if (b[3] > 0 && b.slice(0, 3).join() !== pageBg.slice(0, 3).join()) add('canvas', { el: 'main', bg: cs(main).backgroundColor })
    }
  }

  for (const k of Object.keys(out)) if (out[k].length > limit) out[k] = [...out[k].slice(0, limit), { more: out[k].length - limit }]
  return out
}

/** §9.2 landing layout: hero crop top ≤ 520 px at 1440×900, no stat strip. */
function landingLayout() {
  const crop = document.querySelector('[data-hero-crop]')
  const top = crop ? crop.getBoundingClientRect().top + scrollY : null
  const strips = []
  for (const parent of document.querySelectorAll('body *')) {
    const kids = [...parent.children]
    if (kids.length < 3) continue
    const hits = kids.filter((k) => {
      const big = [...k.querySelectorAll('*')].concat(k).some((e) => /\d/.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')) && parseFloat(getComputedStyle(e).fontSize) >= 32)
      const cap = [...k.querySelectorAll('*')].some((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) <= 13)
      return big && cap
    })
    if (hits.length >= 3) strips.push(parent.tagName + '.' + String(parent.className).slice(0, 40))
  }
  return { cropTop: top, strips }
}

/** Marks up to 5 text-bearing elements (Hangul, Latin, digits) for CDP font sampling. */
function markFontSamples(skipHost) {
  const want = [/[가-힣]{2}/, /[A-Za-z]{4}/, /\d[\d,.]{2}/]
  const picked = []
  for (const re of want) {
    let n = 0
    for (const el of document.querySelectorAll('body *')) {
      if (skipHost && el.closest('.emr-root')) continue
      if (el.closest('pre, code, svg, .mono')) continue
      const own = [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join('').trim()
      if (!own || !re.test(own)) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      el.setAttribute('data-qa-font', String(picked.length))
      picked.push(own.slice(0, 20))
      if (++n >= (re === want[0] ? 2 : re === want[1] ? 2 : 1)) break
    }
  }
  return picked
}

module.exports = { audit, landingLayout, markFontSamples }
