/*
 * EMR popup spec §8.3 widget isolation tests. The checks themselves live in WP3's
 * widget-demo/isolation.cjs (hostile.html, csp.html, the clean index.html reference, and the in-app
 * host with --emr); this runs it against dist-widget plus the dev server's /dur#/emr/V1 and the
 * standalone file, with screenshots in qa-shots/widget/.
 *
 *   node scripts/qa/widget.cjs
 */
const path = require('path')
const { spawnSync } = require('child_process')
const { ROOT, OUT, STANDALONE, devServer, Report } = require('./lib.cjs')

async function main() {
  const report = new Report('widget')
  const dev = await devServer()
  try {
    for (const [tag, emr, port] of [['dev', dev.base + '/dur', 5195], ['file', STANDALONE, 5194]]) {
      const r = spawnSync(process.execPath, [path.join(ROOT, 'widget-demo/isolation.cjs'), '--port', String(port), '--shots', path.join(OUT, 'widget', tag), '--emr', emr], { cwd: ROOT, encoding: 'utf8', timeout: 600000 })
      const lines = (r.stdout || '').split('\n').filter((l) => /^(PASS|FAIL)/.test(l))
      for (const l of lines) report.check(`${tag}: ${l.replace(/^(PASS|FAIL)\s+/, '')}`, l.startsWith('PASS'))
      if (!lines.length || r.status !== 0 && !lines.some((l) => l.startsWith('FAIL'))) report.check(`${tag}: isolation.cjs ran`, false, (r.stderr || r.stdout || '').slice(-600))
    }
  } finally {
    dev.stop()
  }
  return report.finish()
}

if (require.main === module) main()
module.exports = { main }
