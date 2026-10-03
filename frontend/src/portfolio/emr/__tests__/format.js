/**
 * Test helpers: print a check result / response in the exact line format of the
 * spec's binding outputs (§8.1; the reference runner's `fmt`), and parse those blocks.
 */

const r3 = (x) => Math.round(x * 1000) / 1000

export const fmtFindings = (r) => r.findings.map((x) => `${x.ruleId}/${x.severity}[${x.drugIds.join('+')}]`)
export const fmtDoses = (r) => r.doses.map((x) => `${x.drugId}:${x.perDoseMg ?? 'null'}mg:${x.status}${x.ratio != null ? '(' + r3(x.ratio) + ')' : ''}${x.strengthId ? ' plan=' + x.administration?.ko : ''}${x.combined ? ' Σ' + x.combined.totalMg + 'mg' : ''}`)
export const fmtNotes = (r) => r.notes.map((x) => x.id)
export const fmtRows = (c) => Object.entries(c.adapter.rows).map(([k, v]) => `${k}=${v.protocolId ?? '∅'}${v.confirm.length ? '!' + v.confirm.join('+') : ''}${v.notes.length ? '~' + v.notes.join('+') : ''}${v.inClinic ? '@Tx' : ''}`)

/** The reference runner's block for one scenario. */
export function fmtCheck(id, c) {
  if (!c.supported) return `${id}\n  supported=false${c.reason ? ' (' + c.reason + ')' : ''}`
  const r = c.result
  const an = [...(c.adapter.adapterNotes || []), ...(c.adapter.visitConfirm || [])]
  return `${id}\n  verdict=${r.verdict.level} complete=${c.complete}${c.complete ? '' : ' (' + c.incompleteReasons.join('; ') + ')'}`
    + `\n  findings: ${fmtFindings(r).join(', ') || '—'}\n  doses: ${fmtDoses(r).join(', ')}\n  notes: ${fmtNotes(r).join(', ') || '—'}`
    + `\n  rows: ${fmtRows(c).join(' ')}${an.length ? '\n  adapterNotes: ' + an.join(', ') : ''}`
}

/** Split a binding block into { id → text } (a block starts with an id at column 0). */
export function splitBlocks(text) {
  const out = {}
  let id = null
  for (const line of text.replace(/^\n/, '').replace(/\n$/, '').split('\n')) {
    if (/^E\d/.test(line)) { id = line.split(' ')[0]; out[id] = [line] } else if (id) out[id].push(line)
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('\n')]))
}

/** Parse one raw-output block into its fields. */
export function parseRaw(block) {
  const lines = block.split('\n').slice(1).map((l) => l.trim())
  const get = (prefix) => lines.find((l) => l.startsWith(prefix))?.slice(prefix.length)
  const sup = get('supported=')
  if (sup != null) return { supported: false, reason: /\((.*)\)/.exec(sup)?.[1] ?? null }
  const v = /^verdict=(\S+) complete=(true|false)(?: \((.*)\))?$/.exec(lines[0])
  const list = (s, sep = ', ') => (s == null || s === '—' ? [] : s.split(sep))
  // Row entries are space-separated, but a row note can contain spaces ("EU/UK 라벨 기준(자동)").
  const ROW_SEP = / (?=[a-z]+-\d+=)/
  return {
    supported: true,
    level: v[1],
    complete: v[2] === 'true',
    incompleteReasons: v[3] ? v[3].split('; ') : [],
    findings: list(get('findings: ')),
    doses: list(get('doses: ')),
    notes: list(get('notes: ')),
    rows: list(get('rows: '), ROW_SEP),
    adapterNotes: list(get('adapterNotes: ')),
  }
}

/** One card in the card-decisions format: `RULE/sev primary=[..] related=[..] sugg=[..] hash=N`. */
export function fmtCard(card) {
  const e = card.extension
  const sugg = card.suggestions.map((s) => (s.extension.kind === 'delete' ? (s.extension.scope === 'row' ? `delete-row:${s.extension.rowId}` : `delete:${s.extension.drugId}`) : `${s.extension.kind}:${s.extension.rowId}`))
  return `${e.ruleIds[0]}/${e.severity} primary=[${e.primaryRowIds}] related=[${e.relatedRowIds}] sugg=[${sugg}] hash=${e.inputHash}`
}

/** Parse the card-decisions block → { id → { unsupported } | { gate, cards: string[] } }. */
export function parseCardDecisions(text) {
  const out = {}
  for (const line of text.replace(/^\n/, '').replace(/\n$/, '').split('\n')) {
    const [id, rest = ''] = [line.slice(0, line.indexOf(' ')), line.slice(line.indexOf(' ') + 1)]
    if (rest.trim() === 'unsupported') { out[id] = { unsupported: true }; continue }
    const m = /^gate=(\S+) ?(.*)$/.exec(rest)
    out[id] = { gate: m[1], cards: m[2].trim() ? m[2].trim().split(' | ') : [] }
  }
  return out
}
