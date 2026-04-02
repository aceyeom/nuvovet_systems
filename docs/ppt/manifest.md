# NuvoVet Slide Manifest — 18 Slides

Each slide is a `<section class="slide" id="sN">` HTML fragment in `slides/sNN.html`.
Run `python3 build.py` to assemble into `nuvovet_deck.html`.

---

## S01 — 커버 (Cover)
- **Section**: —
- **Visual**: Full dark bg + indigo/blue gradient orbs + dot-grid texture
- **Content**: "nuvovet" wordmark (54px DM Sans 700), subtitle "AI 기반 수의 전문 DUR 솔루션", competition badge, team names + date at bottom
- **Key**: First impression. Clean, confident, no clutter.

## S02 — 문제 인식 (Problem Statement)
- **Section**: 2-1 개발동기
- **Visual**: Left text + right 3 glass stat cards (perspective tilt)
- **Stats**: 5,600+ 동물병원 | 70% 오프라벨 처방 | 0 DUR시스템
- **Key**: Red glow behind "0" card. Stark contrast: human medicine has DUR, animals have nothing.

## S03 — 현장의 문제 (Pain Points)
- **Section**: 2-1 개발동기
- **Visual**: 2×2 glass card grid, each with icon + stat + description
- **Cards**: ① 인지적 과부하 35% (brain) ② 검색시간 3-5분/건 (clock) ③ 부작용 민원 30% (alert) ④ 법적 리스크/벌금 (lock)
- **Key**: Quantified pain. Real numbers from 한국소비자연맹 + field interviews.

## S04 — 개발 동기 (Development Motivation)
- **Section**: 2-1 개발동기
- **Visual**: Horizontal 4-node flow (pipeline arrows), quote callout at bottom
- **Flow**: 인체 DUR 조사 → 진입장벽 (퍼스트디스 독점) → 동물 DUR 공백 발견 → 창업 결심
- **Quote**: "스스로 증상을 말하지 못하는 동물을 위한 DUR 시스템이 전무"
- **Key**: Story arc. Personal discovery journey → mission.

## S05 — 아이템 개요 (Solution Overview)
- **Section**: 1 아이템개요 + 2-2 해결방안
- **Visual**: Central hero glow ("다차원 안전성 검증 엔진") + 4 feature cards in 2×2
- **Cards**: DDI 검증 (indigo) | 용량 자동계산 (emerald) | 장기부담도 (blue) | 불확실성 AI (amber)
- **Stats bar**: 862 약물 · 9,746 규칙 · 5 엔진 · 2종
- **Key**: What we built. Each card maps to a landing page feature color.

## S06 — 3단계 진료 흐름 (3-Stage Workflow)
- **Section**: 3.1 개발방안
- **Visual**: 3 tall glass cards connected by arrows, step number badges
- **Steps**: ① 자동 진료기록 생성 → ② 백그라운드 안전검증 → ③ 개인화 퇴원안내문
- **Callout**: "이상 없으면 흐름 방해 없음. 위험 감지 시에만 개입" (emerald)
- **Key**: Show the workflow is seamless, not disruptive.

## S07 — 제품 시연: DUR 엔진 (Product Demo: DDI)
- **Section**: 3.1 개발방안
- **Visual**: Device mockup frame with recreated DDI illustration inside (3D tilt)
- **Inside**: Drug chips → 5 rule engine badges → flagged results with severity
- **Data**: 멜록시캄+프레드니솔론=GI출혈(Critical), 엔로플록사신+트라마돌=QT연장(Moderate)
- **Key**: Show exactly what the engine does. Real drugs, real rules, real output.

## S08 — 제품 시연: 장기부담도 (Product Demo: Organ Burden)
- **Section**: 3.1 개발방안
- **Visual**: Device mockup with SVG dog anatomy + organ overlays + score cards
- **SVG paths**: Real paths from anatomyConstants.js (brain, heart, liver, kidney, blood)
- **Scores**: 간 72%, 신장 85%, 심장 30%, 뇌 15%, 혈액 55%
- **Key**: Unique visual. No competitor has anything like this.

## S09 — DB 구축 방법론 (Database Pipeline)
- **Section**: 3.1 개발방안
- **Visual**: 5-stage horizontal pipeline + gold callout + stats row
- **Pipeline**: PMC 논문 → 규칙기반 검증 → AI 의미유사도 → Plumb's 교차확인 → 검역본부 연동
- **Gold callout**: "한국어 제품명 ↔ 성분명 자동 연결 = 누보벳만의 데이터 자산"
- **Key**: Data moat. Show the rigor. 725+ drugs, dual verification.

## S10 — 신뢰도 체계 (Trust & Confidence System)
- **Section**: 3.1 개발방안
- **Visual**: Left explanation text + right example card with confidence bar
- **Example card**: Drug check → 87% confidence → journal source IF 4.2 → "판단 보류" amber case
- **Key**: Not black-box AI. Transparent, uncertainty-aware. Vets keep authority.

## S11 — 목표 시장 (Target Market)
- **Section**: 2-3 목표시장
- **Visual**: Left = concentric circles (TAM/SAM/SOM), right = market stat cards
- **Numbers**: SAM 80-120억 | SOM 12-20억 | 10%+ 성장 | 5,600+ 병원
- **Key**: Clear market sizing. Show it's a real, growing market with unmet demand.

## S12 — 국내 경쟁 분석 (Korean Competitor Matrix)
- **Section**: 2-3 + 3.2 경쟁력
- **Visual**: Full-width dark table, 4 players × 5 capabilities, colored dots
- **Players**: 인투씨엔에스, 우리엔, 아이엠디티, 에이아이포펫
- **Columns**: SOAP 차팅 | 약물정보 | DUR 안전검증 | 보호자 소통 | 만성질환관리
- **Key**: DUR column = ALL RED. The gap is undeniable.

## S13 — 글로벌 경쟁 + 진입장벽 (Global Competitors + Barriers)
- **Section**: 3.2 경쟁력
- **Visual**: Top = compact global table, bottom = 3 barrier glass cards
- **Players**: Instinct+Plumb's | VetGeni | VetRec/CoVet
- **3 Barriers**: ① 한국어 약물명 해석불가 ② 한국 EMR 연동없음 ③ SOAP 이미 선점
- **Key**: Structural moat. Not just "we're first" but "they can't follow."

## S14 — 경쟁력 확보방안 (Competitive Advantage)
- **Section**: 3.2 경쟁력
- **Visual**: 4 tall pillar cards side-by-side, accent top borders
- **Pillars**: ① 한국 수의 약물 DB (indigo) ② EMR 이중연동 API+OCR (emerald) ③ 산학 임상검증 (blue) ④ 데이터 수익화 (amber)
- **Key**: 4 reinforcing moats. Each one is hard to replicate alone.

## S15 — 사업화 방안 (Go-to-Market)
- **Section**: 4.1 사업화
- **Visual**: Top = GTM funnel flow, bottom = pricing + revenue model cards
- **Flow**: 대학병원 시범 → KTL인증 → 인허가 → EMR연동 → 시장진출
- **Revenue**: 무료체험1개월 → SaaS구독 + 기술라이선싱 + 데이터라이선싱
- **Key**: Clear path to revenue. Not just tech — business model.

## S16 — 사업 일정 (Timeline)
- **Section**: 4.2 사업추진일정
- **Visual**: Horizontal timeline with 3 milestone nodes + detail cards below
- **Milestones**: 2026.07 임상시험 | 2027.02 인허가신청 | 2027.07 시장진출
- **Sub-items**: KTL, IACUC, 검역본부, EMR베타, 자문위원회
- **Key**: Concrete, dated, actionable. Shows execution readiness.

## S17 — 자금 계획 (Funding Plan)
- **Section**: 4.3 자금소요
- **Visual**: Left = horizontal bar chart (budget breakdown), right = funding source cards
- **Budget**: 총 9,000만원 — 임상/인증 6,000만(67%) | 자문위 1,000만(11%) | 운영 2,000만(22%)
- **Sources**: 초기창업패키지, TIPS, 대학병원커스텀수익, 라이선싱계약금
- **Key**: Lean. Team costs = near zero. Almost all budget → validation.

## S18 — 팀 + 마무리 (Team + Closing)
- **Section**: 5.1 + 5.2
- **Visual**: Top = 3 team member glass cards, bottom = closing statement + indigo orb
- **Team**: 염인 (CMU Design+CS+HCI, 대표) | 김동현 (ML/NLP/RAG, TEED LAB) | 김명학 (경영학)
- **Closing**: "수의사의 인지적 한계를 메워주는 파트너, 말하지 못하는 동물을 위한 안전망"
- **Key**: Credible team + emotional close. Mission-driven.
