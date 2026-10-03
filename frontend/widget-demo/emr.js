/*
 * Plain-HTML fictional EMR for the widget demo pages (EMR popup spec §7, §8.3). No React, no
 * framework: a table with <td><span data-nv-slot="rx-1"></span></td> per row, a save button and a
 * right-hand column the widget docks into. It builds the CDS-Hooks-shaped request by hand
 * (§3.3), as a third-party EMR would, and talks to the bundle only through window.NuvoVetDUR.
 *
 * All patients, visits, products and prices are fictional (EMR popup spec Appendix B).
 *
 * Page switches (read from <body data-*> and the query string):
 *   ?visit=V1|V4|V7|V8   ?lang=en   ?theme=dark   ?layout=docked|floating|sheet
 *   <body data-responsive>  the right column is removed from the DOM below 1280 px and
 *                           re-created above it (a responsive host layout, §2.2 / §8.3 test 9)
 */
;(function () {
  'use strict'

  var VISITS = {
    V1: {
      id: 'V1', date: '2026-10-03',
      patient: { id: '1042', name: '초코', species: 'Canine', speciesKo: '개', breed: 'ROUGH COLLIE/러프 콜리', sex: 'Neutered Male', birthDate: '2022-05-14', weight: 24.0, guardian: '이○○', mdr1: 'unknown', remarks: 'MDR1 미검사' },
      diagnoses: [{ code: 'D-DERM-012', display: '전신성 모낭충증' }, { code: 'D-EAR-004', display: '말라세지아 외이염·피부염' }],
      rows: [
        { kind: 'Rx', rowId: 'rx-1', productCode: 'RX-IVM-SOL10', name: '이버멕틴 경구액 10 mg/mL (액)', unit: 'mcg/kg', qty: 300, tt: 1, dy: 7, rt: 'PO' },
        { kind: 'Rx', rowId: 'rx-2', productCode: 'RX-KTZ-T200', name: '케토코나졸 정 200 mg (정)', unit: 'mg/kg', qty: 5, tt: 2, dy: 21, rt: 'PO' },
      ],
    },
    V4: {
      id: 'V4', date: '2026-10-03',
      patient: { id: '1455', name: '모찌', species: 'Feline', speciesKo: '고양이', breed: 'KOREAN SHORTHAIR/코리안숏헤어', sex: 'Spayed Female', birthDate: '2024-04-11', weight: 3.8, guardian: '정○○', mdr1: 'unknown', remarks: '' },
      diagnoses: [],
      rows: [{ kind: 'Rx', rowId: 'rx-1', productCode: 'RX-PERM-SPOT', name: '퍼메트린 스팟온 (개 전용) (외)', unit: 'EA', qty: 1, tt: 1, dy: 1, rt: 'Top' }],
    },
    V7: {
      id: 'V7', date: '2026-10-03',
      patient: { id: '0650', name: '해피', species: 'Canine', speciesKo: '개', breed: 'GOLDEN RETRIEVER/골든 리트리버', sex: 'Neutered Male', birthDate: '2019-02-17', weight: 28.0, guardian: '윤○○', mdr1: 'unknown', remarks: '' },
      diagnoses: [{ code: 'D-MSK-002', display: '골관절염' }, { code: 'D-DERM-001', display: '아토피 피부염' }, { code: 'D-BEH-001', display: '불안 / 내원 스트레스' }],
      rows: [
        { kind: 'Rx', rowId: 'rx-1', productCode: 'RX-CRP-T100', name: '카프로펜 정 100 mg (정)', unit: 'mg/kg', qty: 4.4, tt: 1, dy: 7, rt: 'PO' },
        { kind: 'Rx', rowId: 'rx-2', productCode: 'RX-PRED-T5', name: '프레드니솔론 정 5 mg (정)', unit: 'mg/kg', qty: 0.5, tt: 1, dy: 7, rt: 'PO' },
        { kind: 'Rx', rowId: 'rx-3', productCode: 'RX-TRM-T50', name: '트라마돌 정 50 mg (정)', unit: 'mg/kg', qty: 5, tt: 4, dy: 5, rt: 'PO' },
        { kind: 'Rx', rowId: 'rx-4', productCode: 'RX-TRZ-T100', name: '트라조돈 정 100 mg (정)', unit: 'mg/kg', qty: 10, tt: 1, dy: 1, rt: 'PO' },
      ],
    },
    V8: {
      id: 'V8', date: '2026-10-03',
      patient: { id: '1388', name: '레오', species: 'Feline', speciesKo: '고양이', breed: 'RUSSIAN BLUE/러시안 블루', sex: 'Neutered Male', birthDate: '2017-07-01', weight: 3.5, guardian: '장○○', mdr1: 'unknown', remarks: '' },
      diagnoses: [{ code: 'D-URO-002', display: '세균성 요로감염' }],
      rows: [
        { kind: 'Rx', rowId: 'rx-1', productCode: 'RX-ENR-T68', name: '엔로플록사신 정 68 mg (정)', unit: 'EA', qty: 0.5, tt: 1, dy: 10, rt: 'PO' },
        { kind: 'Tx', rowId: 'rx-2', productCode: 'RX-MLX-INJ5', name: '멜록시캄 주사액 5 mg/mL (주)', unit: 'mg/kg', qty: 0.3, tt: 1, dy: 1, rt: 'SC' },
      ],
    },
  }

  var q = new URLSearchParams(location.search)
  var visitId = VISITS[q.get('visit')] ? q.get('visit') : 'V1'
  var visit = JSON.parse(JSON.stringify(VISITS[visitId]))
  var responsive = document.body.hasAttribute('data-responsive')
  var $ = function (sel, root) { return (root || document).querySelector(sel) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }

  // ── CDS-Hooks-shaped request (§3.3), built by the host ─────────────────────
  function blank(x) { return x == null || String(x).trim() === '' }
  function medicationRequest(r) {
    var repeat = {}
    if (!blank(r.tt)) { repeat.frequency = Number(r.tt); repeat.period = 1; repeat.periodUnit = 'd' }
    if (!blank(r.dy)) repeat.boundsDuration = { value: Number(r.dy), unit: 'd' }
    return {
      resourceType: 'MedicationRequest', id: r.rowId, status: 'draft', intent: 'order',
      medicationCodeableConcept: { coding: [{ system: 'urn:demo-emr:product', code: r.productCode, display: r.name }] },
      dosageInstruction: [{ text: '', route: { text: r.rt }, doseAndRate: [{ doseQuantity: { value: blank(r.qty) ? null : Number(r.qty), unit: r.unit } }], timing: { repeat: repeat } }],
      extension: [
        { url: 'urn:demo-emr:category', valueCode: r.kind },
        { url: 'urn:demo-emr:dispense', valueCode: 'tablet' },
      ].concat(r.protocolChoice ? [{ url: 'urn:nuvovet:protocol-choice', valueString: r.protocolChoice }] : []),
    }
  }
  function toRequest(hook) {
    var p = visit.patient
    var ctx = {
      userId: 'Practitioner/demo-kim', patientId: p.id, encounterId: 'enc-' + visit.id + '-' + visit.date,
      draftOrders: { resourceType: 'Bundle', type: 'collection', entry: visit.rows.map(function (r) { return { resource: medicationRequest(r) } }) },
    }
    if (hook === 'order-select') ctx.selections = visit.rows.map(function (r) { return 'MedicationRequest/' + r.rowId })
    return {
      hook: hook, hookInstance: String(Date.now()), context: ctx,
      prefetch: {
        patient: { id: p.id, name: p.name, species: p.species, breed: p.breed, sex: p.sex, birthDate: p.birthDate },
        weight: blank(p.weight) ? null : { valueQuantity: { value: Number(p.weight), unit: 'kg' }, effectiveDateTime: visit.date },
        labs: [], conditions: visit.diagnoses.slice(), allergies: [], genotype: { abcb1: p.mdr1 }, visitDate: visit.date,
      },
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function renderHeader() {
    var p = visit.patient
    $('#pt').innerHTML =
      '<b>' + esc(p.name) + '</b> #' + esc(p.id) + ' · ' + esc(p.speciesKo) + ' · ' + esc(p.breed) + ' · 체중 ' +
      '<input id="weight" aria-label="체중 (kg)" size="5" value="' + esc(p.weight) + '"> kg · 보호자 ' + esc(p.guardian) +
      ' · 특이 <input id="remarks" aria-label="특이사항" size="14" value="' + esc(p.remarks) + '">' +
      '<div class="dx">진단: ' + (visit.diagnoses.map(function (d) { return esc(d.code + ' ' + d.display) }).join(', ') || '없음') + '</div>'
  }
  function renderRows() {
    $('#rows').innerHTML = visit.rows.map(function (r) {
      return '<tr data-row="' + r.rowId + '">' +
        '<td>' + r.kind + '</td><td class="code">' + esc(r.productCode) + '</td><td>' + esc(r.name) + '</td>' +
        '<td>' + esc(r.unit) + '</td>' +
        '<td><input data-f="qty" aria-label="투여량: ' + esc(r.name) + '" size="5" value="' + esc(r.qty) + '"></td>' +
        '<td><input data-f="tt" aria-label="횟수: ' + esc(r.name) + '" size="2" value="' + esc(r.tt) + '"></td>' +
        '<td><input data-f="dy" aria-label="일수: ' + esc(r.name) + '" size="2" value="' + esc(r.dy) + '"></td>' +
        '<td>' + esc(r.rt) + '</td>' +
        '<td class="dur"><span data-nv-slot="' + r.rowId + '"></span></td>' +
        '<td><button type="button" data-del aria-label="행 삭제: ' + esc(r.name) + '">×</button></td></tr>'
    }).join('')
  }
  function toast(text) {
    var t = $('#toast')
    t.textContent = text
    t.hidden = false
    clearTimeout(toast.timer)
    toast.timer = setTimeout(function () { t.hidden = true }, 2500)
  }

  // ── Widget ─────────────────────────────────────────────────────────────────
  var events = (window.__nvEvents = [])
  var dur = NuvoVetDUR.create({
    locale: q.get('lang') === 'en' ? 'en' : 'ko',
    theme: q.get('theme') === 'dark' ? 'dark' : 'light',
    layout: q.get('layout') || 'auto',
    user: { id: 'Practitioner/demo-kim', display: '김민서 (가상)' },
    links: { workbenchBase: '/dur#' },
    onEvent: onEvent,
  })
  window.__dur = dur

  function onEvent(e) {
    events.push({ type: e.type, rowId: e.rowId, field: e.field, highlight: e.highlight, proceed: e.proceed })
    if (e.type === 'gate-open') $('#emr').inert = true
    if (e.type === 'gate-close') $('#emr').inert = false
    if (e.type === 'remove-row') {
      visit.rows = visit.rows.filter(function (r) { return r.rowId !== e.rowId })
      renderRows()
      check()
    }
    if (e.type === 'update-row') {
      visit.rows.forEach(function (r) { if (r.rowId === e.rowId) Object.assign(r, e.patch) })
      renderRows()
      check()
    }
    if (e.type === 'focus-row') {
      if (e.highlight !== undefined) {
        document.querySelectorAll('tr.hl').forEach(function (tr) { tr.classList.remove('hl') })
        ;(e.rowIds || []).forEach(function (id) { var tr = $('tr[data-row="' + id + '"]'); if (tr) tr.classList.add('hl') })
      } else {
        var input = $('tr[data-row="' + e.rowId + '"] input[data-f="qty"]')
        if (input) setTimeout(function () { input.focus() }, 0)
      }
    }
    if (e.type === 'fix-chart') {
      var field = e.field === 'weight' ? '#weight' : '#remarks'
      setTimeout(function () { var el = $(field); if (el) el.focus() }, 0)
    }
  }

  var timer = 0
  function check() { clearTimeout(timer); dur.check(toRequest('order-select')) }
  function scheduleCheck() { clearTimeout(timer); timer = setTimeout(check, 300) }

  // ── Wiring ─────────────────────────────────────────────────────────────────
  $('#rows').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f')
    var tr = e.target.closest('tr')
    if (!f || !tr) return
    visit.rows.forEach(function (r) { if (r.rowId === tr.getAttribute('data-row')) r[f] = e.target.value })
    scheduleCheck()
  })
  $('#rows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]')
    if (!b) return
    var id = b.closest('tr').getAttribute('data-row')
    visit.rows = visit.rows.filter(function (r) { return r.rowId !== id })
    renderRows()
    check()
  })
  $('#pt').addEventListener('input', function (e) {
    if (e.target.id === 'weight') visit.patient.weight = e.target.value
    if (e.target.id === 'remarks') {
      visit.patient.remarks = e.target.value
      visit.patient.mdr1 = /MDR1\s*정상|정상/.test(e.target.value) ? 'normal' : 'unknown'
    }
    scheduleCheck()
  })
  $('#save').addEventListener('click', function () {
    clearTimeout(timer)
    var save = this
    dur.gate(toRequest('order-sign')).then(function (r) {
      window.__lastGate = r
      if (r.proceed) {
        toast('처방을 저장했습니다 (데모)')
        r.feedback.forEach(function (f) {
          var li = document.createElement('li')
          li.textContent = 'DUR ' + f.extension.severity + ' 예외 처리 (' + f.overrideReason.reason.code + ') · 김민서 (가상) · 규칙 ' + f.extension.ruleIds.join(',') + '@' + f.extension.ruleVersion + ' · 엔진 ' + f.extension.engineVersion
          $('#chart').appendChild(li)
        })
      } else if (r.focusRowId) {
        var input = $('tr[data-row="' + r.focusRowId + '"] input[data-f="qty"]')
        ;(input || save).focus()
      }
    })
  })

  // Right column: the docked panel host. On a responsive host it exists only at ≥ 1280 px.
  var column = $('#right')
  function panelHost() { return $('#nv-panel') }
  function syncColumn() {
    if (!responsive) return
    var wide = window.innerWidth >= 1280
    var host = panelHost()
    if (wide && !host) {
      var aside = document.createElement('aside')
      aside.id = 'nv-panel'
      aside.className = 'panel-host'
      column.appendChild(aside)
      dur.mount({ panel: aside })
    } else if (!wide && host) {
      host.remove()
    }
  }

  // Test hooks for the isolation checks (§8.3): add a row back, re-render the grid.
  window.__emr = {
    visit: function () { return visit },
    addRow: function (row) { visit.rows.push(row); renderRows(); check() },
    deleteRow: function (id) { visit.rows = visit.rows.filter(function (r) { return r.rowId !== id }); renderRows(); check() },
    rerender: function () { renderRows(); check() },
    check: check,
  }

  renderHeader()
  renderRows()
  if (responsive && window.innerWidth < 1280 && panelHost()) panelHost().remove()
  dur.mount({ panel: panelHost() || undefined })
  window.addEventListener('resize', syncColumn)
  check()
})()
