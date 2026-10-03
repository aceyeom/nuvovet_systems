/*
 * `npm run qa` (DESIGN_SYSTEM.md §9, EMR popup spec §8.3/§8.4). Exits non-zero on any failure.
 * Run after: npm ci && npm test && npm run build && npm run build:portfolio && npm run build:widget,
 * with the API on :8000 (cd backend && uvicorn main:app --port 8000) for /clinic/claim results.
 *
 *   node scripts/qa/run.cjs                 every step
 *   node scripts/qa/run.cjs --only lint,shots
 *
 * Steps: lint (§9.4) · dead (unreferenced source files) · bundles (§9.3 budgets) · shots (§9.2 + §9.3
 * runtime + §9.7 budgets) · nav (§9.3 links) · a11y (§9.5) · golden (§9.9) · widget (popup §8.3) · emr (popup §8.4).
 * A dev server on QA_PORT (default 5197) is reused or started once and shared by every step.
 * Results: qa-shots/<step>.json, screenshots under qa-shots/.
 */
const path = require('path')
const { spawnSync } = require('child_process')
const { ROOT, API, arg, get, devServer } = require('./lib.cjs')

const STEPS = [
  ['lint', 'lint-design.cjs'],
  ['dead', 'dead-files.cjs'],
  ['bundles', 'bundles.cjs'],
  ['shots', 'shots.cjs'],
  ['nav', 'nav.cjs'],
  ['a11y', 'a11y.cjs'],
  ['golden', 'golden.cjs'],
  ['widget', 'widget.cjs'],
  ['emr', 'emr.cjs'],
]

;(async () => {
  const only = arg('--only', null)
  const steps = STEPS.filter(([id]) => !only || only.split(',').includes(id))
  if ((await get(API + '/docs')) !== 200) console.log(`WARN  API ${API} is not answering: /clinic/claim result states will fail`)
  const dev = await devServer()
  const summary = []
  try {
    for (const [id, file] of steps) {
      const t0 = Date.now()
      console.log(`\n── ${id} (${file}) ${'─'.repeat(50)}`)
      const r = spawnSync(process.execPath, [path.join(__dirname, file)], { cwd: ROOT, stdio: 'inherit', env: process.env })
      summary.push([id, r.status === 0, Math.round((Date.now() - t0) / 1000)])
    }
  } finally {
    dev.stop()
  }
  console.log('\nQA summary')
  for (const [id, ok, s] of summary) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(8)} ${s} s`)
  process.exit(summary.every(([, ok]) => ok) ? 0 : 1)
})()
