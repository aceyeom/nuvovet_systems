// API 연동 (DESIGN_SYSTEM.md §5.3): two-column reference. Left: endpoint, method badge, description and
// a parameters table; right: CodeBlock with curl / Python / Node tabs. Bodies are real engine shapes.
import { Badge } from '@/ui/primitives/badge'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { ADJUDICATE_REQUEST_BODY, ADJUDICATE_RESPONSE_BODY, BASE_URL, REQUEST_JSON_OPTIONS } from '../apiExamples.js'
import { Page } from './states'

const col = createColumnHelper()
const paramColumns = [
  col.accessor('name', { header: '이름', enableSorting: false, cell: (i) => <span className="mono text-foreground">{i.getValue()}</span> }),
  col.accessor('type', { header: '형식', enableSorting: false, meta: { className: 'text-text-2' } }),
  col.accessor('required', { header: '필수', enableSorting: false, cell: (i) => (i.getValue() ? '필수' : <span className="text-muted-foreground">선택</span>) }),
  col.accessor('desc', { header: '설명', enableSorting: false, meta: { className: 'whitespace-normal text-text-2' } }),
]

const ENDPOINTS = [
  {
    id: 'adjudicate',
    method: 'POST',
    path: '/api/claims/adjudicate',
    title: '청구 심사',
    desc: '청구와 계약을 받아 표준 코드로 정형화하고, 항목별 지급 판정과 규칙 ID가 붙은 소견, 서류 요청 사유를 돌려줍니다.',
    params: [
      { name: 'claim', type: 'object', required: true, desc: '진료 항목, 처방, 진단, 첨부 서류가 담긴 청구 본문' },
      { name: 'policy', type: 'object', required: false, desc: '계약 조건. 없으면 기본 계약으로 계산합니다.' },
      { name: 'history', type: 'array', required: false, desc: '같은 환자의 이전 청구. 중복·반복 고가 신호에 씁니다.' },
    ],
    code: {
      curl: `curl -X POST ${BASE_URL}/api/claims/adjudicate \\\n  -H 'Content-Type: application/json' \\\n  -d @claim.json`,
      python: `import json\nimport requests\n\nwith open("claim.json", encoding="utf-8") as f:\n    body = json.load(f)\n\nr = requests.post("${BASE_URL}/api/claims/adjudicate", json=body, timeout=10)\nr.raise_for_status()\nprint(r.json()["decision"])`,
      node: `import { readFile } from 'node:fs/promises'\n\nconst body = JSON.parse(await readFile('claim.json', 'utf8'))\n\nconst res = await fetch('${BASE_URL}/api/claims/adjudicate', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(body),\n})\nconst result = await res.json()\nconsole.log(result.decision)`,
    },
    request: ADJUDICATE_REQUEST_BODY,
    response: ADJUDICATE_RESPONSE_BODY,
  },
  {
    id: 'precheck',
    method: 'POST',
    path: '/api/claims/precheck',
    title: '병원용 사전 점검',
    desc: '제출 전에 병원이 고칠 항목과 발급할 서류를 돌려줍니다. 본문은 청구 본문과 같습니다.',
    params: [
      { name: 'body', type: 'claim', required: true, desc: '청구 본문 (claim 객체 그대로)' },
      { name: 'insurer_id', type: 'query string', required: false, desc: '보험사 서류 요건 프로필: kb, samsung, meritz 등' },
    ],
    code: {
      curl: `curl -X POST '${BASE_URL}/api/claims/precheck?insurer_id=kb' \\\n  -H 'Content-Type: application/json' \\\n  -d @claim-only.json`,
      python: `r = requests.post("${BASE_URL}/api/claims/precheck", params={"insurer_id": "kb"}, json=claim, timeout=10)\nprint(r.json()["ready_to_submit"], r.json()["blocking_count"])`,
      node: `const res = await fetch('${BASE_URL}/api/claims/precheck?insurer_id=kb', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(claim),\n})\nconst { ready_to_submit, blocking_count } = await res.json()`,
    },
  },
  {
    id: 'extract',
    method: 'POST',
    path: '/api/claims/extract',
    title: '영수증 전사',
    desc: '영수증이나 진료비 세부내역서 사진을 청구 초안으로 옮깁니다. 판정은 하지 않습니다.',
    params: [{ name: 'image', type: 'file (multipart)', required: true, desc: 'JPG 또는 PNG, 10 MB 이하. 요청 수가 제한됩니다.' }],
    code: {
      curl: `curl -X POST ${BASE_URL}/api/claims/extract \\\n  -F image=@receipt.jpg`,
      python: `with open("receipt.jpg", "rb") as f:\n    r = requests.post("${BASE_URL}/api/claims/extract", files={"image": f}, timeout=30)\ndraft = r.json()["draft"]`,
      node: `const form = new FormData()\nform.append('image', file)\nconst res = await fetch('${BASE_URL}/api/claims/extract', { method: 'POST', body: form })\nconst { draft } = await res.json()`,
    },
  },
  {
    id: 'insurers',
    method: 'GET',
    path: '/api/claims/insurers',
    title: '보험사 서류 요건',
    desc: '보험사별 필요 서류 프로필을 출처, 기준일, 검증 여부와 함께 돌려줍니다.',
    params: [],
    code: {
      curl: `curl ${BASE_URL}/api/claims/insurers`,
      python: `r = requests.get("${BASE_URL}/api/claims/insurers", timeout=10)\nprofiles = r.json()["profiles"]`,
      node: `const { profiles } = await (await fetch('${BASE_URL}/api/claims/insurers')).json()`,
    },
  },
  {
    id: 'codes',
    method: 'GET',
    path: '/api/claims/codes',
    title: '표준 코드북',
    desc: '표준 진료 항목 코드와 질병 코드 목록을 돌려줍니다.',
    params: [],
    code: {
      curl: `curl ${BASE_URL}/api/claims/codes`,
      python: `book = requests.get("${BASE_URL}/api/claims/codes", timeout=10).json()\nprint(len(book["procedures"]), len(book["diagnoses"]))`,
      node: `const { procedures, diagnoses } = await (await fetch('${BASE_URL}/api/claims/codes')).json()`,
    },
  },
]

const PRINCIPLES = [
  ['판정은 규칙이 내립니다', '모델은 문서 전사에만 쓰고, 같은 입력에는 항상 같은 판정을 돌려줍니다.'],
  ['자동 거절은 없습니다', '가장 강한 판정은 지급 거절 권고이며 심사역이 확정합니다.'],
  ['정보가 부족하면 서류를 요청합니다', '필요한 서류와 요청 대상(병원·보호자)을 함께 돌려줍니다.'],
  ['모든 소견에 규칙 ID가 붙습니다', '소견마다 규칙 ID, 금액 영향, 근거 출처를 돌려줍니다.'],
  ['진료부는 SIU 의뢰 때만 요청합니다', '요청할 때는 그 근거 규칙 ID를 응답에 남깁니다.'],
]

function Endpoint({ e }) {
  return (
    <section id={e.id} aria-labelledby={`${e.id}-title`} className="grid scroll-mt-16 gap-6 border-t border-border pt-6 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3">
        <h2 id={`${e.id}-title`} className="text-lg font-semibold text-foreground">
          {e.title}
        </h2>
        <p className="flex flex-wrap items-center gap-2">
          <Badge variant="id">{e.method}</Badge>
          <span className="mono text-foreground">{e.path}</span>
        </p>
        <p className="text-sm text-text-2">{e.desc}</p>
        {e.params.length ? (
          <DataTable aria-label={`${e.title} 파라미터`} columns={paramColumns} data={e.params} getRowId={(p) => p.name} paginate={false} className="rounded-lg border border-border" />
        ) : (
          <p className="text-sm text-text-2">파라미터가 없습니다.</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <CodeBlock
          tabs={[
            { value: 'curl', label: 'curl', code: e.code.curl },
            { value: 'python', label: 'Python', code: e.code.python },
            { value: 'node', label: 'Node', code: e.code.node },
          ]}
          className="[&_pre]:max-h-96"
        />
        {e.request ? <CodeBlock title="claim.json" json={e.request} jsonOptions={REQUEST_JSON_OPTIONS} className="[&_pre]:max-h-72 [&_pre]:overflow-y-auto" /> : null}
        {e.response ? <CodeBlock title="응답 200" json={e.response} jsonOptions={REQUEST_JSON_OPTIONS} className="[&_pre]:max-h-72 [&_pre]:overflow-y-auto" /> : null}
      </div>
    </section>
  )
}

export default function Api() {
  useTitle('API 연동', 'nuvovet')
  return (
    <Page>
      <PageHeader title="API 연동" meta={<span>기본 주소 <span className="mono text-foreground">{BASE_URL}</span></span>} />
      <section aria-labelledby="principles" className="flex flex-col gap-3">
        <h2 id="principles" className="text-lg font-semibold text-foreground">
          설계 원칙
        </h2>
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {PRINCIPLES.map(([t, d]) => (
            <li key={t} className="flex gap-4 py-2.5 text-sm max-sm:flex-col max-sm:gap-0.5">
              <span className="w-64 shrink-0 font-medium text-foreground max-sm:w-auto">{t}</span>
              <span className="text-text-2">{d}</span>
            </li>
          ))}
        </ul>
      </section>
      {ENDPOINTS.map((e) => (
        <Endpoint key={e.id} e={e} />
      ))}
    </Page>
  )
}
