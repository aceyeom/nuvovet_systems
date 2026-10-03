// Regenerates the small files derived from the claims snapshot (run after re-exporting the snapshot):
//   node src/pages/insurance/data/build-derived.mjs
// preview/heroClaim.json  the landing hero claim (DESIGN_SYSTEM.md §5.1), so `/` never loads the snapshot
// data/claimIndex.json    per-claim 검토 대상 금액 and rule IDs, so the overview chart and rule filters work
//                         against the live list endpoint (which returns neither)
// Both are checked against the snapshot by src/pages/insurance/__tests__/derived.test.js.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { toHeroClaim } from '../preview/model.js'
import { buildClaimIndex } from './claimIndex.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const snapshot = JSON.parse(readFileSync(here('../../../data/claimsDemoSnapshot.json'), 'utf8'))

writeFileSync(here('../preview/heroClaim.json'), JSON.stringify(toHeroClaim(snapshot)) + '\n')
writeFileSync(here('./claimIndex.json'), JSON.stringify(buildClaimIndex(snapshot)) + '\n')
console.log('wrote heroClaim.json and claimIndex.json')
