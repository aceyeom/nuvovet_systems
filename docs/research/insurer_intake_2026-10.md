# What Korean pet insurers actually receive

**As of:** 2026-10-02 · **Owner:** NuvoVet research · **Feeds:** `docs/claims/SCHEMA_V2_SPEC.md`, `backend/claims/data/insurer_profiles.json`, `docs/strategy/pivot_memo_2026-10.md`

**How this was built.** Six research passes covered insurer document lists, statutory forms, automated channels, adjudication practice, the claimant experience and foreign standards. Six independent verifier passes then re-checked them. The proxy blocked page fetches to every Korean insurer, news and government domain, so most facts rest on search-result snippets of the cited page. Statutes were checked against full primary text in the legalize-kr GitHub mirror of law.go.kr (commit dated 2026-10-01). **Where a verifier's primary-law check contradicted a research pass, the verifier wins.** Every such case is listed in §9.

**Evidence grades used below**

| Mark | Meaning |
|---|---|
| **L** | Checked against the primary statute text: legalize-kr mirror of law.go.kr, https://github.com/legalize-kr/legalize-kr (`kr/수의사법/…`, `kr/부가가치세법/…`, `kr/상법/…`, `kr/보험업법/…`, `kr/동물보호법/…`) |
| **S** | A search-result snippet of the cited page. The page itself was not fetched. |
| **S×n** | Several independent outlets agree at snippet level. |
| **2nd** | A blog, aggregator or secondary research note |
| **UNVERIFIED** | No primary or snippet confirmation was found. Do not use externally. |
| *Inference* | Our reasoning, not a source statement |

---

## 0. The answer in ten lines

1. **Claims arrive as owner-uploaded phone photos or PDFs.** They contain an itemised receipt (영수증) and usually a 진료비 세부내역서 (itemised statement). Above insurer-specific amounts, or for surgery and hospitalisation, a statutory **진단서** (diagnosis certificate) or the insurer's own form with **its own disease codes** is added. The full **진료부** (clinical record) is requested only on suspicion (§1, §3).
2. **The 진단서 and 처방전 (prescription) have statutory formats. Receipts do not.** A clinic may refuse a 진단서 or 처방전 only for just cause. It has **no duty to issue the 진료부**, and keeps it for only **1 year**, while the claim window is **3 years** (§2).
3. **Receipts are not standardised.** Some print only a total when food, grooming or a hotel stay is paid together. The same condition is named differently from clinic to clinic, and neutering may be one line or several (§3).
4. **MAFRA's standard codes are voluntary and not yet on receipts.** There are 3,511 disease codes (e.g. `DH10.56`) and 4,930 procedure codes (e.g. `L0101.11`). The roadmap: codes set in 2025, loaded into EMRs in 2026, used to manage clinic records from 2027. Insurance use is an *expected benefit*, not a mandate (§2.7).
5. **Two clinic rails exist, and each is owned by one insurer.** Meritz × IntoVet works by ID card: the clinic files on the owner's behalf. MyBrown × 우리엔 is a QR "live claim" settled at the counter. KIDI's 2019 multi-insurer POS stalled (§4).
6. **Clinic counts conflict and must always be quoted as tiers.** Meritz's own page shows **~1,600 ID-card auto-claim clinics plus ~400 제휴 (partner) clinics**. The press reports **~600–650** partner hospitals (§4).
7. **Adjudication is per-product, and the deadline differs by product.** Hyundai pays in 3 business days, or up to 30 if investigated. Most others decide "without delay" and then pay within 7 days. FSS guidance from 2025-05 (≥30% copay, ≥₩30,000 deductible, 1-year renewal) applies only to new products (§5).
8. **Fraud handling is referral-based.** No prosecuted Korean pet-insurance fraud case was found. Identity in law means RFID registration only, compulsory for dogs and voluntary for cats. Noseprint is an insurer underwriting tool, not a legal registry (§6).
9. **Abroad, the rail is the moat.** Anicom generates claim data at the moment it prints the invoice. FHIR Claim is the only public claim schema, and the FHIR version must be pinned (§7).
10. **Market counts must name their insurer base.** H1-2026's 307,115 policies cover **11 insurers**. The year-end-2025 figure of ~251,800 covers **13**. The two cannot be compared as growth (§9, row C-6).

---

## 1. Document set per insurer

### 1A. Documents and pet identity

Per-insurer thresholds, file limits and fax numbers come only from one research pass's snippets. The insurer domains were blocked, and no second source confirmed them. Treat every row as **versioned reference data to re-check against the live insurer page** before encoding it in `insurer_profiles.json` (`verified: false`).

| Insurer (product) | Medical-expense documents | When more is needed | Pet identity | Source (grade) |
|---|---|---|---|---|
| **Meritz 펫퍼민트** | Pet claim form, credit-info consent, ID copy, bankbook copy, receipt "incl. treatment itemization". A separate Meritz-page snippet lists **진단서 + 진료비계산영수증 + 진료비세부내역서** for medical-expense claims. | 진료기록부 is requested only in "일부 의심 사례" (some suspicious cases) | — | [store.meritzfire.com/pet/compensation.do](https://store.meritzfire.com/pet/compensation.do) (S); [dailyvet 210101](https://www.dailyvet.co.kr/news/industry/210101) (S) |
| **Samsung Fire (애니펫 / 위풍댕댕; direct 착한펫)** | Claim form **with a vet-completed section**: hospital, vet, BRN (business registration no.), disease code from the attached 상병코드표, treatment date, diagnosis and treatment, cost. Plus consent, ID, bankbook, 상세진료내역서, receipt. | — | 2 photos (front, side) if not government-registered | [claim_pet.pdf](https://www.samsungfire.com/download/claim/claim_pet.pdf); [VH.RMMY0639](https://www.samsungfire.com/vh/page/VH.RMMY0639.do); [myanycar](https://www.myanycar.com/m/claim/MP040502_001.html) (S) |
| **DB 펫블리** | Pet claim form dated 2024-10-14: policy no., breed, name, DOB, sex, **coat colour**, incident narrative. Plus consent, ID, bankbook. **Outpatient:** itemised receipt + medical record (2nd). | Inpatient: 진단서. Surgery: 진단서 mandatory. X-ray must show **date and time** (2nd). | Registration-card copy or 2 photos | [idbins.com form 2024-10-14](https://www.idbins.com/pcweb/bizxpress/ct/dc/__etc/펫보험보험금청구서_상세_20241014.pdf) (S); [lifeinfostorage](https://lifeinfostorage.com/entry/DB손해보험-반려동물펫보험-보험금-청구-필요서류-안내) (2nd) |
| **Hyundai 굿앤굿 우리펫 (ex-하이펫)** | Claim form needing policy no. **or** RRN (resident registration no.), plus animal registration no. Consent, account, ID, **진료기록지 + receipt**. | Funeral benefit: death or cremation certificate | Full-body photos, front and side, on every claim | [hi.co.kr form 2022-10](https://www.hi.co.kr/FileActionServlet/preview/1/data/202210/13cfefe783ad9c1c669a6008969b8dec.pdf); [약관 Hi2504](https://direct.hi.co.kr/dhNAS/terms/CM110F_20250401.pdf) (S) |
| **KB 금쪽같은 펫** | **Out-of-pocket under ₩300k:** itemised receipt, 세부내역서, and **either** the full 진료기록부 **or** a 소견서 listing prescriptions and lab results. Also a card slip or 현금영수증 **showing the BRN**. A card slip or card SMS alone, or a 납입확인서, is not accepted. | **₩300k or more "per disease or per accident":** 진단서 or KB-format 진료확인서. **The KB 반려동물보험 상병명코드 is required on any 진단서 or 진료확인서** (e.g. `PD021`, musculoskeletal). Below ₩300k, KB may still ask for a 진단서 when the disease name is unclear. Imaging must show date and time. | Photos: face front, full body side | [CG205020010](https://www.kbinsure.co.kr/CG205020010.ec); [reqdoc_pet.pdf](http://kbinsure.co.kr/images/claim_svc/reqdoc_pet.pdf) (S). "Summed across visits" is *our inference*, not KB wording. |
| **Hanwha 펫투게더 (rider; Carrot merged in)** | 세부내역서, receipt, pet photo. Claim form, consent and ID are waived on web or app. | — | Photo | [yunandmin](https://yunandmin.com/한화손해보험-보험금-청구방법-구비서류-청구서-양식) (2nd); merger [ajunews 2025-06-04](https://www.ajunews.com/view/20250604161748305), [nate 2026-04-15](https://news.nate.com/view/20260415n04776) |
| **Carrot (실비클럽 오렌지 / CAT)** | ID and bankbook copies. The rest is **UNVERIFIED**. | — | — | [daonenjoy](https://study.daonenjoy.com/entry/캐롯-손해보험-보험금-청구-서류-및-방법-총정리) (2nd) |
| **Lotte** | Claim form, bankbook and ID copies, medical record, receipt, **photo of the injured pet** | Surgery: 진단서. Inpatient: admission confirmation. | Pet photo | [letclick ccb205](https://www.letclick.co.kr/web/C/C/B/ccb205.jsp); [lotteins claim](https://www.lotteins.co.kr/web/C/D/C/cdc_claim_0502.jsp) (S) |
| **NH 펫앤미든든 / 다이렉트** | Claim form, detailed consent, ID | — | Registration card **or** the registration no. written on the form; if unregistered, 1 front + 1 side photo | [nhfire claim guide](https://www.nhfire.co.kr/customer/guide/insuranceClaimGuide.nhfire) (S) |
| **KakaoPay Ins. (launched 2026-03-18)** | Own claim form, consent, ID, itemised receipt, 세부내역서. The full list is **UNVERIFIED**. The products are surgery-centred (수술당일형 / 수술입원형), so routine outpatient claims may not apply. | — | — | [nate 2026-03-18](https://m.news.nate.com/view/20260318n34614); [lifefin](https://lifefin.co.kr/카카오페이손해보험-고객센터/) (2nd) |
| **Hana 펫사랑** | Claim form; 사고증명서 = 진단서, 진료비 세부내역서 and receipt **issued by a domestic vet**; ID. A proxy claimant also needs an 인감 or signature certificate. | — | 3 photos (front, side, face) **or** the registration card | [Hana 약관](https://www.hanainsure.co.kr/download/prd?instype=17421&type=agree&spctype=0) (S) |
| **MyBrown** | **Live claim at partner clinics: no documents.** The non-partner list is **UNVERIFIED**. | — | — | [fntimes 2026-07-20](https://www.fntimes.com/html/view.php?ud=2026072014220682869efc5ce4ae_18) (S) |
| **Chubb (pet claim form, 2024-06)** | 진단서 (dates, diagnosis), itemised receipt, medical record | — | — | chubb.com claims-form-pet-insurance-june-2024.pdf (S) |

### 1B. Thresholds, channels, timing

| Insurer | Originals / upload limits | Channels | Payment clause |
|---|---|---|---|
| Meritz | ≤₩1M **per claim** by web, mobile or fax; >₩1M needs originals. 2nd source only; that it applies to pet is UNVERIFIED. | Web/mobile with phone photos. Fax 0505-021-3400 (2nd). Mail. **On-site claim with the 펫퍼민트 ID card at partner clinics** (§4). The line "online claims cover 반려견의 의료비담보 only" (dogs' medical expenses) appears only in model-written search summaries. It is probably legacy copy from the dog-only era; cat status is **UNVERIFIED**. | Partner clinics: paid to the **owner** within 3 business days ([thevaluenews](https://www.thevaluenews.co.kr/news/199166), S). Off-rail: decided "without delay" (지체없이), then paid within 7 days. |
| Samsung | >₩1M needs originals (single source) | Web/mobile [보상>반려동물보험], app upload, fax 05050-162-1005, email sfgeneral@samsungfiresvc.com, registered mail | 위풍댕댕: decided without delay, then paid within 7 days |
| DB | **App** claims only up to ₩5M, and only by the policyholder or insured (single source) | App, call centre 1588-0100, registered mail (2nd) | Decided without delay, then paid within 7 days |
| Hyundai | — | Web/app, fax 0505-988-5959, email 1070@sejongcas.com, mail | **3 business days; up to 30 if investigated, with notice; 50% interim payment** (약관 Hi2504) |
| KB | Originals only for **≥₩50M, death, or claims paid to a delegate**. Online upload **JPG/JPEG/PNG only**. | App/web, email kbpet@kbinsure.co.kr, fax 0505-136-6500, mail, branch | — |
| Lotte | ≥₩3M originals; below that, copies or fax (single source) | Fax 0507-333-9999, mail, call 1588-3344 | Decided without delay, then paid within 7 days |
| NH | Online: images or PDF, **max 30 files** (single source) | Web/app, fax 0505-060-7000, branch | — |
| KakaoPay | — | KakaoTalk channel or KakaoPay app | 3–5 business days to review, payment within 7 (2nd, **UNVERIFIED**) |
| Hana | — | Web, mobile (claim form and consent waived), email hanaclaim@hanafn.com, mail | Decided without delay, then paid within 7 days |
| MyBrown | — | Partner-clinic QR; app | Instant at the counter. "1–3 business days" elsewhere is **UNVERIFIED**; the snippet appears to mix in the human 실손24 system. |

Sources for the 7-day rows: the Meritz, Lotte 마이펫, Samsung 위풍댕댕 2404, Hana 펫사랑, DB and Chubb pet 약관 and forms. All are snippet-level, collected in the adjudication verifier's corpus. The same sources show the **50% interim payment (가지급)** and **late-payment interest** in every product.

### 1C. Rules common to all insurers

| Rule | Detail | Source |
|---|---|---|
| Limitation period | **3 years** (상법 §662). It was 2 years for claims arising before 2015-03-12 (부칙 제12397호). | **L**; [casenote 상법 §662](https://casenote.kr/법령/상법/제662조) |
| Document fees | Meritz says on-site filing and document-issuance fees "vary by clinic and are not covered". The Korea Consumer Agency (KCA) says the same ([소비자정책동향 141호, 2025-02](https://www.kca.go.kr/webzine/resources/doc/)). **By law, only the 처방전 fee is capped, at ₩5,000** (시행규칙 §19①). 진단서 and 증명서 fees are uncapped but must be posted at reception, and the clinic may not charge more than the posted amount (법 §20의2③). Actual 진단서 fee levels are **UNVERIFIED**. | Meritz page (S); **L** |
| Insurer code tables | KB requires its own pet 상병명코드, and Samsung attaches its own 상병코드표. No crosswalk to the MAFRA codes has been published (that absence is **UNVERIFIED**). | KB and Samsung links above (S) |

---

## 2. Statutory document formats

### 2.1 진단서 (diagnosis certificate) — 수의사법 시행규칙 별지 제4호의2

| Item | Content | Grade |
|---|---|---|
| Legal status | Statutory form (시행규칙 §9①). It needs a **yearly serial number**, and the issuer keeps a **부본 (copy) for 3 years** (§9③). A vet who examined the animal may not refuse to issue a 진단서, 검안서, 증명서 or 처방전 without just cause (법 §12③). | **L** |
| Owner block | 성명·주소; 사육 장소 | S (form snippet) |
| 동물의 표시 (animal) | 종류, 품종, 이름, 성별, 연령, **모색 (coat colour)**, 특징 | S |
| Diagnosis block | 병명; **발병 연월일 (onset date)** or 임신 연월일; **진단 연월일 (diagnosis date)**; 예후 소견; 그 밖의 사항 | S |
| Issuer block | 동물병원 명칭·주소 (and phone); 수의사 면허번호·성명; 서명 or 날인 | S |
| Form file | The copy found is marked <개정 2011.1.26> ([flSeq=30431892](https://www.law.go.kr/flDownload.do?flSeq=30431892)). That is an older file; **the current form PDF is flSeq=163594625**, and nobody could open it. **The field list has not been checked against the current form.** | UNVERIFIED vs current form |
| Proposed revision | Would add 주요 증상, 치료 명칭 and a checkbox separating **"임상적 추정" (clinical presumption) from "최종 진단" (final diagnosis)**. 입법예고 on 2023-11-21 per a snippet. **Whether it was enacted is UNVERIFIED.** | [dailyvet 118211](https://www.dailyvet.co.kr/news/policy/118211) (S) |
| Other statutory forms | 폐사진단서 별지 제5호; 출산 제6호; 사산 제7호; 예방접종증명서 제8호; 검안서 제9호; 처방전 제10호; 중대진료 동의서 제11호. The latest 시행규칙 amendment is 제765호 (2026-04-21); the claim that it changed only terminology is UNVERIFIED. | **L** |

### 2.2 처방전 (prescription) — 시행규칙 §11, 별지 제10호 (corrected; see §9 row L1)

| Field group | Required content | Grade |
|---|---|---|
| Validity | 발급일. Valid for **no more than 7 days**. | **L** |
| Animal | 이름 (an owner-assigned name if it has none), 종류, 성별, 연령 (may be estimated), **체중**, 임신 여부. Group (군별) prescriptions give 축사번호, 종류 and head count instead. | **L** |
| Owner | 성명·생년월일·전화번호; 농장명 for farm animals | **L** |
| Issuer | 동물병원 or farm 명칭·전화번호·**사업자등록번호**; the vet's 성명·**면허번호** | **L** |
| Drug, 처방대상 동물용의약품 (§11③5가) | **성분명 (ingredient), 용량 (dose), 용법 (directions), 처방일수 (days, ≤30), 판매 수량 (in package units)**. Product names may be added **alongside** the ingredient name, at least 3 per ingredient (§11⑤). | **L** |
| Drug, other products (§11③5나) | A product name may replace the ingredient name | **L** |
| Form rules | One prescription per animal. Signed or stamped (전자서명 allowed). Copy kept **3 years**. | **L** |
| eVET (수의사처방관리시스템) | Prescriptions for 처방대상 동물용의약품 must be issued through eVET (법 §12의2②, 신설 2019-08-27). A prescription delayed for a 부득이한 사유 must be registered within 3 days after the reason ends. Vets who dispense directly enter 명칭·용법·용량 and the animal's **체중** (시행규칙 §12의2②). The start date of 2020-02-28 fits 시행규칙 §11 (개정 2020.2.28), but the 부칙 itself was not seen. | **L**; date S |
| Human Rx drugs | Since **2026-06-21**, pharmacies must report sales of human prescription drugs to 동물병원 to KPIS, with the **의약품 표준코드** (standard drug code). | [dailyvet 287766](https://www.dailyvet.co.kr/news/policy/287766) (S, **UNVERIFIED** by verifier) |

### 2.3 진료부 (clinical record) — 시행규칙 §13

| Item | Content | Grade |
|---|---|---|
| Required entries | 가 품종·성별·특징·연령 · 나 진료 연월일 · 다 owner 성명·주소 · 라 **병명·주요 증상** · 마 **치료방법 (처방과 처치)** · 바 마약/향정신성의약품 품명·수량 · 사 동물등록번호 (registered animals only) | **L** |
| Not on the 진료부 | **체중** (weight; required only on the 처방전 and in eVET direct-dispensing entries), the animal's name (특징 is used instead), and **fees** | **L** |
| Retention | **1 year.** Human 진료기록부 are kept 10 years (의료법 시행규칙 §15). | **L** |
| Electronic records | Allowed as an electronic document with a 전자서명법 signature | [dailyvet 76637](https://www.dailyvet.co.kr/news/practice/76637) (S) |
| 검안부 (post-mortem) | 폐사/살처분 연월일·원인·장소, 사체 상태, 해부 주요 소견 | **L** |
| Duty to issue | **None.** 법 §12③ lists only 진단서, 검안서, 증명서 and 처방전. §13 requires only that the record be kept. The KVMA tells clinics to give a **진단서 plus an itemised receipt** instead and to be cautious about disclosing drug details. | **L**; [dailyvet 136171](https://www.dailyvet.co.kr/news/association/136171) (S) |
| VAT link | Under 부가가치세법 시행령 §117⑥, the 진료부 may replace the VAT 매출대장 (sales ledger) if it records the ledger fields | **L** |
| **Gap that matters** | Claims can be filed for 3 years, but the clinic need keep the record only 1 year. **A claim filed more than 1 year after treatment may find the record already destroyed.** | **L** (both sides) |

**Records-access bill (not law).** The 농해수위 (agriculture committee) passed a 대안 on **2026-09-02**, folding together 10 수의사법 bills (법안소위 2026-08-25).

- **Purpose:** owners may view or copy records for **"분쟁 해결 또는 권리구제"**, listed as 분쟁조정·소송 **등**. The list is non-exhaustive, but commentators read it as excluding insurance claims. The July committee review had floated insurance claims, but the passed text did not adopt them.
- **Penalty:** refusal without just cause carries a **과태료 of up to ₩1M**.
- **Procedure and timing:** set by 대통령령 (presidential decree); takes effect **1 year after promulgation**.
- **Status:** still needs 법사위 (the Legislation and Judiciary Committee) and a 본회의 (plenary) vote. The current 수의사법 (Act 21623, promulgated 2026-05-12, in force 2026-11-13) has **no access right** (**L**).
- **Sources:** [hankyung 2026-09-02](https://www.hankyung.com/article/202609029891i); [sedaily 2026-09-02](https://www.sedaily.com/article/20086409); [seoul.co.kr 2026-09-23](https://www.seoul.co.kr/news/society/2026/09/23/20260923500082); [newspet 9247](https://www.newspet.co.kr/news/articleView.html?idxno=9247) (S×4).
- **Conclusion:** this is **not a claims path**.

### 2.4 중대진료 (major procedure) consent and cost estimate (corrected; see §9 rows C-4 / A1, L5)

| Item | Content | Grade |
|---|---|---|
| Scope | Surgery on internal organs, bones or joints, or a transfusion, **under general anaesthesia** (시행규칙 §13의2①) | **L** |
| Written consent (법 §13의2②) | Covers the **진단명**; the necessity, method and content of the procedure; typical complications or side effects; and what the owner must do. Explained orally; consent is signed on **별지 제11호**, which the vet keeps **1 year**. | **L** |
| In force | **2022-07-05.** Act 18691 was promulgated 2022-01-04 and took effect 6 months later; §13의2 is not among its exceptions. Seoul Shinmun (2022-07-05) ran "오늘부터 보호자 서면 동의해야 수술" (from today, surgery needs the owner's written consent). | **L**; [korea.kr 2022-07-04](https://www.korea.kr/news/policyNewsView.do?newsId=148903126) (S) |
| Cost estimate | A **separate duty** (법 §19) on the clinic's 개설자 (operator), **in force 2023-01-05**. It is given **orally** (시행규칙 §18의2) and may be revised after the procedure. **It is not one of the written consent items.** | **L** |
| 2024-01-05 | This is **not** a consent date. It is when fee posting extended to single-vet clinics (부칙 §3) and when §20의3 (code standardisation) took effect. | **L** |
| Fines | ₩300k–900k | [korea.kr 2022-07-04](https://www.korea.kr/news/policyNewsView.do?newsId=148903126) (S) |
| Use in claims | The consent form shows that a diagnosis was stated before surgery. **It does not carry a cost figure.** | *Inference from L* |

### 2.5 Receipts: no statutory format

- **Human medicine has a fixed form.** It uses the 진료비 계산서·영수증 (요양급여의 기준에 관한 규칙 별지 제6/7호) plus a 세부산정내역, whose format is set by 보건복지부 고시 2018-21 and which clinics must provide on request. In 2024 the human form gained a separate 제증명수수료 (certificate fee) line. Sources: [law.go.kr form](https://www.law.go.kr/LSW/flDownload.do?gubun=&flSeq=150355767&bylClsCd=110202); [physician.or.kr](https://physician.or.kr/kpaSeoul/plaza/index.php?Action=View&Gubun=pds&Idx=2986) (S).
- **No equivalent exists for 동물병원.** The 수의사법 시행규칙 prescribes 진단서, 폐사진단서, 처방전 and others, but **no 영수증 and no 세부내역서** (**L**). Reporting confirms receipts are not standardised ([fnnews 2026-09-07](https://www.fnnews.com/news/202609071818114472), S×3).
- **What owners are told to check:** 단가 (unit price), 수량 (quantity), whether VAT applies, whether a 진단명 is written, and whether a 세부내역서 was issued ([toss](https://toss.im/tossfeed/article/tinyquestions-animal-2), 2nd).
- **IntoVet and 우리엔 printed layouts** (column headers): **UNVERIFIED.** No real 세부내역서 has been collected yet (§10).

### 2.6 VAT exemption and its effects (corrected; see §9 rows L2, L3, A7)

| Item | Content | Grade |
|---|---|---|
| Legal basis | 부가가치세법 시행령 §35(5) exempts animal care for livestock, aquatic animals, **장애인 보조견** (assistance dogs), **animals kept by 기초생활수급자** (basic-livelihood recipients), and services on a **positive-list 고시**. The 고시 is issued by MAFRA or MOF in consultation with 재정경제부. Anything not on the list stays taxable. | **L** |
| Scope of the 고시 | Widened from prevention-only to treatment on 2023-10-01 (**102종**). Expanded to **112종** from 2026-01-01 (adding 구취, 변비, 식욕부진, 치주질환, 치아파절, 잔존유치…). MAFRA estimates >90% of fees are now exempt. **The counts were not checked against the 고시 text.** | [korea.kr 2023-09-27](https://www.korea.kr/news/policyNewsView.do?newsId=148920901); [nate 2026-01-16](https://m.news.nate.com/view/20260116n28572) (S) |
| Effect 1: diagnosis decides tax | The same line (e.g. IV fluids) can be taxable or exempt depending on the diagnosis. In practice clinics treat most care as exempt and report clearly taxable sales: grooming, bathing, boarding, goods, cosmetic procedures. | [dailyvet 253535](https://www.dailyvet.co.kr/news/policy/253535) (S) |
| Effect 2: a coded record exists | Clinics file the **동물 진료용역 매출명세서 (부가가치세법 시행규칙 별지 제30호서식, §62⑪)** with the VAT return, or with the 사업장현황신고 if fully exempt (시행령 §90⑨). Fields: 공급일자, 동물 종류, service name, 면세사유, 공급대가. | Form number **L**; fields S ([wehago](https://wehagohelp.zendesk.com/hc/ko/articles/7468596286617)) |
| Effect 3: ledger | Clinics keep a 동물 진료용역 **매출대장 (별지 제47호, 시행령 §117⑤)**. The 진료부 may replace it (⑥). | **L** |
| Effect 4: cash receipts | Cash payments of ₩100k or more require a 현금영수증 | [dailygaewon 11203](https://www.dailygaewon.com/news/articleView.html?idxno=11203) (S) |
| Blood products | Animal blood supply exempt since 2025-01-01 | [korea.kr](https://www.korea.kr/news/policyFocusView.do?newsId=148939306) (S) |
| What it means for us | `tax_status` on a line is a **weak** signal of non-medical spending, never proof | *Inference from L* |

### 2.7 MAFRA 「동물 진료의 권장 표준」 codes (corrected; see §9 rows C-3, F5)

| Item | Content | Grade |
|---|---|---|
| Notice | 고시 **2025-44**, issued 2025-04-25 (press release 2025-04-24). **3,511 disease names and 4,930 procedure names** (8,441 codes); one snippet's 4,903 is a typo. It also adds 40 standard care pathways (100 in total). | S×5: [korea.kr 156685970](https://www.korea.kr/briefing/pressReleaseView.do?newsId=156685970); [dailyvet 240836](https://www.dailyvet.co.kr/news/policy/240836); [nongmin](https://www.nongmin.com/article/20250424500071); [daum](https://v.daum.net/v/20250425091525462) |
| Legal basis | 수의사법 §20의3: MAFRA "표준화된 분류체계를 작성하여 고시하여야 한다" (must prepare and publish the classification). **No provision requires vets to use it** on records or receipts. Every source calls it "권장 사항일 뿐 법적 구속력 없음" (recommended only, not binding). | **L** + S×5 |
| Disease code | **Species letter + disease core + "." + cause digits.** 10 species letters: **A 가금, B 소, C 고양이, D 개, G 염소, H 말, P 돼지, R 토끼, S 양, X 기타**. Hierarchy of 22 대분류 / 234 중분류 / 1,600 소분류. Example **`DH10.56`** = D (dog) + H10 (conjunctivitis) + 5 (inflammatory) + 6 (viral). | S×5 |
| "Built on KCD" | One research pass said the codes reuse Korea's ICD-10 adaptation (KCD) wherever the condition is the same. A verifier found **no snippet support**. That H10 matches ICD-10 H10 is *our inference*. | **UNVERIFIED** |
| Procedure code | 2-character category + 3-digit number, then a qualifier that encodes drug or method. **`L0101`** = 정맥마취 (IV anaesthesia); **`L0101.11`** = propofol alone; **`L0101.24`** = ketamine + xylazine. | S×5 |
| Roadmap | **2025** establish the codes → **2026** load them into EMRs (전자차트 탑재) → **from 2027** manage clinic medical records with them (3rd Animal Welfare Plan). **Use in insurance product design and claim review is an expected benefit, not a scheduled mandate.** No evidence was found of any EMR loading the codes by 2026-09. | S×3 |
| Table download | The law.go.kr 행정규칙 page offers the 별표 (incl. 별표2 「표준화된 동물의 질병명 분류」) as HWP, PDF or XLS. It was blocked by the proxy, so **someone must download it by hand**. | [admRulSeq=2100000249744](https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000249744) |

### 2.8 Fee posting and disclosure (corrected; see §9 row L4 / D9)

- **What must be posted** (시행규칙 §18의3①; **L**):
  - 초진·재진 진찰료, 상담료, 입원비;
  - **six** vaccines: 개 종합, 고양이 종합, 광견병, 켄넬코프, 개 코로나바이러스, 인플루엔자 (the last two from 2025-01-01, 부칙 제647호);
  - CBC with its reading fee, X-ray with its reading fee;
  - further items MAFRA designates by 고시.
- **Where:** since 2025-07-01 (제725호), fees must be posted **in the clinic and on its homepage** if it has one.
- **What is published today:** only aggregated statistics (national, regional and 시군구 min / max / mean / median; §20).
- **What is proposed:** a 2026-08 입법예고 would add **per-clinic online disclosure of about 20 items** ([segye 2026-08-31](https://www.segye.com/newsView/20260831515886); [insight](https://www.insight.co.kr/news/568782), S). Its final timing is **UNVERIFIED**.
- **Survey baseline:** MAFRA's 2025 survey of 3,950 clinics found a mean first-visit fee of **₩10,520**, ranging from ₩1,000 to ₩61,000 ([mafra.go.kr](https://www.mafra.go.kr/bbs/home/792/592824/download.do), 2025-12-22).

---

## 3. What arrives in practice

| Pattern | What it looks like | Source (grade) | How schema v2 handles it |
|---|---|---|---|
| **Phone photos, not originals** | Meritz accepts "휴대폰으로 촬영한 서류" (documents photographed on a phone). KB accepts JPG/PNG only. NH takes at most 30 files. Originals are needed only above a threshold. | Meritz, KB, NH pages (S) | `Document.source = photo\|pdf\|emr\|manual`; per-insurer file rules in the insurer profile |
| **Total-only receipts** | When food, grooming or a hotel stay is paid together with treatment, some clinics print **only the total** | [fnnews 2026-09-07](https://www.fnnews.com/news/202609071818114472) (S×3) | Pend `RECEIPT_NOT_ITEMIZED`; doc type `RECEIPT_TOTAL_ONLY` |
| **Mixed baskets** | Medical and non-medical items on one receipt | fnnews (S); [toss](https://toss.im/tossfeed/article/tinyquestions-animal-2) (2nd) | Pend `MIXED_BASKET_UNSPLIT`; non-medical lines ineligible |
| **Bundling** | Neutering billed as one line, or split into anaesthesia, tests and surgery. Some clinics package 진찰료, 처치료 and 약제비 together. | fnnews (S); [leeandpol](https://leeandpol.com/ko/how-much-does-a-vet-visit-cost/) (2nd) | `LineItem.is_bundle` |
| **Inconsistent diagnosis wording** | The same condition appears as "위장염" (gastroenteritis) at one clinic and "복통·구토·설사" (abdominal pain, vomiting, diarrhoea) at another | fnnews (S×3) | Diagnosis object with `text_raw` + `codes[]`; symptom-level codes map to candidates rather than being rejected |
| **Clinic-specific item names** | The EMR pattern is `<category>-<item>(<modifier>)`, e.g. `검사-X-ray(경상)`, `입원-소형견(1일)`, `의료폐기물`, with only 5 treatment categories (진찰, 검사, 처치, 수액/수혈, 의료폐기물) | Internal: `backend/scripts/docs/EMR_Field_Analysis.md` (from real EMR screenshots) | `LineItem.category_raw`; the matcher uses the prefix as a category hint |
| **No diagnosis on the receipt** | Receipts list items with quantity, unit price and amount, often with no diagnosis | toss (2nd) | Pend `MISSING_DX`; ask the clinic for a 진단서 |
| **Insurer code missing** | KB rejects a 진단서 or 진료확인서 that lacks the KB code | KB (S) | Pend `NEED_DX_CERT` with the insurer-code requirement |
| **Imaging without a timestamp** | KB and DB require the date and time on X-rays | KB (S); DB (2nd) | Pend `IMAGING_NO_TIMESTAMP`; `Document.captured_at` |
| **Card slip without BRN** | KB rejects a card slip or SMS alone | KB (S) | `Document.issuer_brn` |
| **Batch backfill** | "아침부터 동물병원 두군데 다니면서 진단서랑 영수증 서류 떼기. 2년치 보험료 청구완" — an owner spent a morning at two clinics collecting 진단서 and receipts to claim two years at once | [threads](https://www.threads.com/@redringp/post/DQ8DISGj0uD) (post date UNVERIFIED) | Multi-visit claims; check the 3-year limit per visit |
| **Small claims never filed** | "매번 서류를 떼고 청구하는 과정이 번거로워 … '미청구' 사례가 빈번" — getting documents each time is such a hassle that many claims go unfiled | [insweek 72399](https://www.insweek.co.kr/news/articleView.html?idxno=72399) (S) | Clinic pre-check produces a claim-ready packet |
| **Return trips to the clinic** | When details can't be confirmed, the insurer asks for more and the owner goes back to the hospital | fnnews; KCA 141호 (2025-02) (S) | `pend_reasons[].actor = owner\|clinic\|insurer` |
| **Partner clinics refusing at the desk** | Owners saw "현장 자동청구" (on-site auto-claim) listed, asked for it, and were refused. Some clinics were listed as partners without wanting to be. | [dailyvet 122981](https://www.dailyvet.co.kr/news/practice/companion-animal/122981) (S, ~2019–20) | `Clinic.participation_status` needs an explicit opt-in |
| **Claim mix** | Dermatitis 10.7%, otitis externa 10.2%, enteritis 5.5% of **MyBrown's** claims. The ~₩150k-per-visit figure comes from a MyBrown **survey** of 300 women aged 30–49 in the Seoul area, not from claims. | [dailyvet 285368](https://www.dailyvet.co.kr/news/industry/285368) (S) | Synthetic data weights |
| **Do real receipts carry any codes?** | — | **UNVERIFIED** | Collect 20–30 redacted 세부내역서 per major EMR (§10) |

---

## 4. Automated channels

| Channel | How a claim moves | Payee and timing | Data sent | Clinic count (all figures, they conflict) | Sources |
|---|---|---|---|---|---|
| **Meritz 펫퍼민트 × IntoVet (인투씨엔에스)**, since 2018-10 | The owner shows the 펫퍼민트 ID card at reception. The claim is filed (접수) when the bill is paid. MyBrown describes this model as **"접수 대행"**: the clinic files for the owner and settlement follows. | **Owner's** bank account, within 3 business days | Meritz: the function "is fully built, but because the 수의사법 imposes no duty to copy or transmit the 진료내역서 (전자차트), each vet must consent". The **field list is UNVERIFIED.** | **Two tiers on the Meritz page:** **~1,600 "자동청구" (ID-card auto-claim) clinics** and **~400 "제휴" (partner) clinics** at no extra cost (S, 2024). **Press counts of partner hospitals:** ~600 ([thevaluenews](https://www.thevaluenews.co.kr/news/199166), n.d.); ~617 (snippet, probably fntimes, 2025-06); **~650 협력병원** ([hankyung 2026-03-18](https://www.hankyung.com/article/2026031889261)). **Always quote as tiers.** | [store.meritzfire.com](https://store.meritzfire.com/pet/compensation.do); [newspim 2024-03-22](https://www.newspim.com/news/view/20240322000076); [v.daum 2025-10-16](https://v.daum.net/v/20251016105704940) (S) |
| ↳ EMR terms | IntoVet GE and IntoVet Cloud integrate the auto-claim. Clinics that newly sign up get **₩100k in points**. IntoVet runs in more than 2,000 clinics. | — | — | — | [dailyvet 277961](https://www.dailyvet.co.kr/news/industry/277961); [dailyvet 274207](https://www.dailyvet.co.kr/news/industry/274207) (S) |
| ↳ 2019 consent controversy | An EMR vendor switched on-site claims on for all clinics. The Seoul vet association protested that chart records were being sent to the insurer, and the vendor apologised ("opt-in, like SMS auto-send"). The vendor's identity is **UNVERIFIED**; IntoCNS is likely. | — | Vendor said only "청구 서류" (claim documents) were sent | — | [dailyvet 122981](https://www.dailyvet.co.kr/news/practice/companion-animal/122981) (S) |
| ↳ Meritz–KAHA MOU, 2024-04-12 | Meritz and the Korean Animal Hospital Association (KAHA) **agreed to work on simplifying claim documents**. Meritz **announced a plan** to revise the 약관 clause that names the 진료기록부. **No evidence the revision happened**, and Meritz still asks for records "in some suspicious cases". A separate MOU with 서울시수의사회 also exists. | — | — | — | [ajunews 2024-04-15](https://www.ajunews.com/view/20240415155127478); [dailyvet 210101](https://www.dailyvet.co.kr/news/industry/210101), [210327](https://www.dailyvet.co.kr/news/industry/210327); [ajunews 2024-04-17](https://www.ajunews.com/view/20240417175939385) (S) |
| **MyBrown 라이브청구 × 우리엔 EMR**, since ~2025-10 | The owner shows an app QR at a partner clinic. Review and payment happen right after treatment; the owner pays only their share (e.g. on ₩1M surgery, ₩700k is deducted and the owner pays ₩300k). **No documents.** 우리엔 EMR clinics register as partners through "a simple procedure". | The insurer's share goes to the **clinic the next day**. This was a pre-launch plan; actual timing is **UNVERIFIED**. | **UNVERIFIED.** Instant adjudication implies structured lines and a diagnosis from the chart (*inference*). | ~200 (~2025-12, [dailyvet 267461](https://www.dailyvet.co.kr/news/industry/267461)); **260** (2026-03-17); **500+** (2026-07-20; Seoul 27%, Gyeonggi/Incheon 36%); **600+** ([thevc](https://thevc.kr/mybrown), n.d.) | [nate 2026-02-18](https://m.news.nate.com/view/20260218n04763); [nate 2026-03-17](https://m.news.nate.com/view/20260317n27758); [fntimes 2026-07-20](https://www.fntimes.com/html/view.php?ud=2026072014220682869efc5ce4ae_18) (S) |
| ↳ Share settled live | **23%** (2025-10), **26%** (2025-11), **27%** (2025-12), **~25%** (2026-07). These are company PR figures for one small insurer, and they fell slightly while the partner count roughly doubled. | — | — | — | Same (S) |
| ↳ Incentive | Next year's premium drops a further 2% if live-claim use at partner clinics is at least 50%. The outlet behind this snippet could not be identified. | — | — | — | **UNVERIFIED** |
| ↳ Ownership | 우리엔 is a shareholder alongside Samsung Fire/Life and GC Vet; KDB joined in 2025-12 | — | — | — | [bloter 649731](https://www.bloter.net/news/articleView.html?idxno=649731) (S) |
| **KIDI (보험개발원) POS**, 2019 | The clinic checks enrolment, treats, then files immediately. Contracts were signed 2019-01 with **Hanwha, Lotte, Hyundai, KB, DB** (not Meritz or Samsung). Development started 2019-04; transmission was done ~2019-06; a pilot ran in July; a web page for all clinics was planned from 2019-08. | — | Standard data set **UNVERIFIED** (no MAFRA codes existed then) | — | [paxetv 74554](https://www.paxetv.com/news/articleView.html?idxno=74554); [asiae 2019-06-07](https://view.asiae.co.kr/article/2019060707034694934); [seoul.co.kr 2019-01-23](https://www.seoul.co.kr/news/economy/2019/01/23/20190123800073) (S) |
| ↳ Why it stalled | KIRI says an EMR link that lets insurers request records exists technically, **yet claims still run on paper receipts sent by owners**. Vets resist exposing treatment and fee appropriateness to outside judgement. KIRI (2026-06-15) says real-time payment cannot spread without standard codes or insurer–hospital partnerships. | — | — | — | [KIRI 584539](https://www.kiri.or.kr/report/downloadFile.do?docId=584539) (undated); [inews24 1976243](http://inews24.com/view/1976243) (S) |
| **Government plan, 2023-10-16** (FSC / MAFRA) | Mandatory issuance of 진료내역 and fee evidence was to be **"검토·추진"** (reviewed and pursued); one-click clinic-to-insurer transmission was planned "from H1 2024". An MOU followed on 2023-11-17 (or 11-19 per another snippet). **Never enacted.** Status as of 2026-09: "청구 시스템은 제자리걸음" (the claims system is stalled). | — | — | — | [mt 2023-10-16](https://www.mt.co.kr/finance/2023/10/16/2023101610394376457); [dailyvet 194563](https://www.dailyvet.co.kr/news/policy/194563); [nongmin 2023-11-17](https://www.nongmin.com/article/20231117500468); [fnnews 2026-09-07](https://www.fnnews.com/news/202609071818114472) (S×3) |
| Insurer apps (Samsung, KB, Hanwha, NH, DB, Hana, KakaoPay) | Owner-initiated upload of photos or PDFs | — | Images | — | §1 |
| K-VET 동물병원영수증 분석기 | A consumer app: AI sorts receipt items into 진료 / 검사 / 처치 / 약품 and compares them with the 20 publicly surveyed fee items. **Not a claim channel.** | — | — | — | [k-vet.co.kr](https://k-vet.co.kr/) (S, ~2026-01) |
| Fitpet (핏펫) | Supplied "actual clinic claim data" for KakaoPay's product design. What it collects is **UNVERIFIED**. | — | — | — | [mt 2026-03-18](https://www.mt.co.kr/finance/2026/03/18/2026031809082746716) (S) |

**Human analogue: 실손24, the legal template for a pet rail.** All of the following is **L** (보험업법) unless marked otherwise.

- **Law:** 보험업법 §102의6 and §102의7, Law 19780, promulgated 2023-10-24.
- **Phase 1 (2024-10-25):** every 요양기관 except 의원급 clinics and pharmacies. That is wider than "30+ bed hospitals"; it also covers 치과병원, 한방병원 and 보건소.
- **Phase 2 (2025-10-25):** 의원급 clinics and pharmacies.
- **Data handling:** the transmitting body may not use or retain the data beyond transmission (§102의7⑤).
- **Cost:** insurers bear the system cost (§102의7③).
- **Documents:** the statute names 진료비 계산서·영수증, 세부산정내역 and other FSC-notified documents. Whether 처방전 is included, and KIDI's designation as the transmission agent, sit in the decree or FSC notice: **UNVERIFIED**.
- **The difference for pets:** human receipts have a statutory form and pet receipts do not.
- **No pet equivalent** (a 실손24-style bill under 보험업법 or 수의사법) was found. That absence is UNVERIFIED.

---

## 5. Adjudication practice

### 5.1 How the 약관 are structured (snippet level; no 약관 was read in full)

| Product | Limits | Waiting periods and exclusions | Source |
|---|---|---|---|
| Meritz 펫퍼민트 | Basic cover includes 슬개골 (kneecap), dental (scaling, extraction), skin, 서혜부탈장 (inguinal hernia) and MRI/CT, with no cap on visit count. Before the 2025 reform: annual cap ₩7M at 50% or ₩10M at 70–80%. | — | [hankyung 2026-03-18](https://www.hankyung.com/article/2026031889261); [insjournal 24844](https://www.insjournal.co.kr/news/articleView.html?idxno=24844) (S) |
| KB 금쪽같은 펫 | Coverage ≤70%; ₩150k a day, or ₩2M with surgery; ₩10M a year | **Patellar luxation and hip disease excluded for 1 year** from the start date. Pets with a patella history can join under a musculoskeletal **부담보** (exclusion rider). | [kbinsure CG313010001](https://www.kbinsure.co.kr/CG313010001.ec); [ZDNet 2023-09-06](https://zdnet.co.kr/view/?no=20230906092541) (S) |
| Hanwha 펫투게더 (rider) | ₩300k a day, 20 days a year (inpatient or outpatient); surgery ₩3M, twice a year; funeral and liability benefits | Entry age 0–10 | [etoday 2023-04](https://www.etoday.co.kr/news/view/2236949) (S) |
| Samsung 착한펫 / 위풍댕댕 | Skin disease and 슬관절 (knee-joint) surgery are separate riders | Terms version 2601.6 | [myanycar](https://www.myanycar.com/m/claim/MP040502_001.html); [long_pet.pdf](https://samsungfiredirect.co.kr/CR_MyAnycarWeb/mall/pdf/long_pet.pdf) (S) |
| DB 펫블리 | Before the reform: annual cap ₩15M at 50% or ₩20M at 70–90% | — | insjournal (S) |
| Carrot 실비클럽 | ₩500k a year, ₩10k deductible, no daily cap, "all diseases" | — | [etoday 2024-05](https://www.etoday.co.kr/news/view/2362712) (S) |

- **General exclusions:** 고의·중과실 (intentional acts or gross negligence) and natural disasters ([Hyundai 하이펫 약관 2023-07-31](https://direct.hi.co.kr/dhNAS/terms/CM7663_20230731.pdf), S).
- **Routine-care exclusion set:** vaccines, heartworm and parasite prevention, neutering, scaling, extraction (including baby teeth), nails, ears, anal glands, grooming, antibody tests, check-ups, consultations ([KNIA](https://www.knia.or.kr/consumer/pet/pet_insurance01), S). How each product applies it is **UNVERIFIED**.
- **Per-product settings, not global rules:** Meritz covers hernia and extraction in its basic plan, so "congenital" and "dental" vary by product. A 30-day illness waiting period is the market norm, but no snippet confirms it (**UNVERIFIED**).

### 5.2 The FSS's May 2025 product guidance

- **The rules** (S×5: [insweek 67359](https://www.insweek.co.kr/news/articleView.html?idxno=67359), [edaily 2025-04-06](https://edaily.co.kr/News/Read?mediaCodeNo=257&newsId=01859766642133496), [newdaily 2025-05-07](https://biz.newdaily.co.kr/site/data/html/2025/05/07/2025050700181.html), [dailyvet 242198](https://www.dailyvet.co.kr/news/industry/242198)): for products sold **from 2025-05-01**:
  - re-enrolment every **1 year** (previously 3 or 5);
  - coverage **≤70%** (so the owner pays **≥30%**);
  - a minimum self-pay of **₩30,000**, which cannot be waived.
- **Status:** this is FSS guidance (권고), **not statute**. Pre-2025 in-force policies (up to 90% coverage, lower deductibles) still exist.
- **Open details:** how 30% and ₩30k combine (sequential or the larger of the two) and whether the minimum applies per day, visit or claim are **UNVERIFIED**.
- **Pressure to relax:** insurers asked for 5-year renewal to return in 2025-09 ([herald](https://biz.heraldcorp.com/article/10569204); [daum 2025-09-05](https://v.daum.net/v/20250905111751057)). No relaxation was found in 2026.

### 5.3 Why claims are rejected or reduced

No FSS complaint breakdown for pet insurance was found. The KCA data cover vet malpractice: 128 피해구제 (damage-relief) applications from 2021 to 2026-06. Of the 121 closed cases, 26.4% (32) were resolved, and 75% alleged treatment negligence ([hankyung 2026-09-09](https://www.hankyung.com/article/202609093293i), S). The list below is therefore synthesised from 약관 and from claimant and industry reports.

1. The illness began inside a waiting period.
2. Pre-existing condition or non-disclosure; 부담보 riders exclude whole body systems.
3. Excluded category: routine care, document fees, goods.
4. Receipt not itemised, or a mixed basket.
5. Vague or inconsistent diagnosis.
6. The treatment purpose isn't shown. Example: scaling counts as routine care, periodontal treatment is covered ([pet-bohum](https://pet-bohum.com/blog/pet-coverage-dental-treatment/), 2nd).
7. Limits reached: daily, per-surgery, yearly counts, annual amount.
8. Copay and deductible, which owners experience as 삭감 (cuts) ([khan 2025-07-30](https://www.khan.co.kr/article/202507300600091), S).
9. Pet identity not established. Only about 1.2% of cats are registered ([petnotekorea](https://petnotekorea.com/cat-registration-system-2026-complete-guide/), 2nd).
10. Missing insurer disease code or originals.
11. Time-barred: more than 3 years since the loss.

### 5.4 Loss adjustment (손해사정)

- **Legal framework: 보험업법 §185 (L).** Insurers named by decree must adjust losses themselves or appoint 손해사정사 or 손해사정업자. The **2024-02-06 amendments** add four duties:
  - the policyholder may appoint their own adjuster, and the insurer must consent if FSC criteria are met;
  - in-house adjusters' evaluations **must not use metrics that reward cutting claims**;
  - the **손해사정서 must be given to the claimant** without delay;
  - outsourcing to a subsidiary above a set ratio must be reported to the board and disclosed.
- **Process:** claim → payment review → adjuster investigation if needed → result notice → payment ([KakaoPay blog](https://kakaopayinscorp.co.kr/blog), S).
- **Hyundai's intake** email sits on sejongcas.com, which suggests an affiliated adjusting firm (*inference*).
- **What adjusters check:**
  - diagnosis or code;
  - vet licence number;
  - BRN;
  - imaging timestamp;
  - BRN on the card slip.
- **Outside medical review (의료자문)** for pet claims: no evidence (**UNVERIFIED**).

### 5.5 Fifteen adjuster rules that can be encoded (corrected)

| # | Rule | Outcome | Basis |
|---|---|---|---|
| 1 | Treatment or onset date outside the policy period | deny_recommended | 약관 |
| 2 | Onset < start date + illness waiting period (product parameter; accidents exempt if the injury is documented) | deny_recommended | 약관 (30 days is UNVERIFIED as a norm) |
| 3 | Onset < start date + group waiting period (e.g. patella/hip 365 days at KB) | deny_recommended | KB (S) |
| 4 | Diagnosis falls in a 부담보 body system, or predates the start; chronic-marker drugs on an early claim | deny_recommended / SIU referral | 약관 (S) |
| 5 | Routine care, grooming, behaviour, document fees, goods | Line ineligible | KNIA (S); Meritz (S) |
| 6 | Rider gating (skin, patella, dental, liability, funeral); scaling without a periodontal diagnosis counts as routine | Line ineligible | Samsung, KB (S) |
| 7 | Total-only receipt or unsplit mixed basket | **pend**, never deny | fnnews (S) |
| 8 | No diagnosis, an unmappable diagnosis, or the insurer's own code missing above its threshold | **pend** | KB (S) |
| 9 | Document thresholds: 진단서 above the insurer threshold (KB ₩300k per disease or accident); originals above insurer limits; surgery needs a 진단서 | **pend** | §1 (single-source figures) |
| 10 | Pick the regime first (legacy or FSS-2025-05), then apply that product's deductible basis and calculation order. **Do not hard-cap coverage at 70%.** | Payable | FSS guidance (S×5) |
| 11 | Daily, per-event, yearly-count and annual-amount limits, used up in date order | Payable | 약관 (S) |
| 12 | Identity: registration no. (RFID-based; dogs compulsory, cats voluntary), species, breed, sex, coat colour, age. Without a number, require photos. **Never assume a biometric registry.** | pend / SIU | 동물보호법 시행령 §4, §10 (**L**) |
| 13 | Duplicates: same pet, date and items. Several insurers share a loss under the **약관 비례보상 clause**; 상법 §672 is written for property value and does not decide medical-expense splits. | deny_recommended / SIU | **L** (§672 wording) |
| 14 | More than 3 years since the loss → time-barred. Run the **per-product** payment clock (Hyundai 3/30 business days; most others 7 days after a decision made without delay) and the 50% interim-payment trigger. **Info flag:** service more than 1 year ago means the 진료부 may already be destroyed. | deny_recommended / timers | 상법 §662, 시행규칙 §13 (**L**) |
| 15 | **SIU referral, never auto-denial.** Triggers: chronic signs just after the waiting period; prices far above benchmark; identity mismatch; claim-frequency spikes; identical claims across one owner's pets. **Ask for the full 진료부 only when one fires.** | review | Meritz practice (S); KVMA (S); 보험업법 §185 (L) |

---

## 6. Fraud and moral-hazard patterns

**Documented in Korea**

| Pattern | Evidence |
|---|---|
| Animal swaps and age misstatement: claiming for an uninsured look-alike pet | [asiae 2024-05-10](https://view.asiae.co.kr/article/2024051010364518611) (S) |
| Moral hazard from owners and clinics: the 2007-era pet products ran loss ratios above 100% and insurers withdrew | [KIRI 2017-08-21](http://www.kiri.or.kr/pdf/전문자료/KIRI_20170818_102651.pdf) (S) |
| Over-treatment and wide fee variation: the FSS's stated reason for the 2025 guidance | §5.2 (S×5) |
| No prosecuted Korean pet-insurance fraud case found; press describes insurers as "defenceless" | [econovill 369027](https://www.econovill.com/news/articleView.html?idxno=369027) (date UNVERIFIED) |

**Identity controls in law (L)**

- 동물보호법 시행령 §10③ and 별표1 (in force 2026-04-23): registration means a registration number plus an **RFID device** (무선식별장치).
- **Biometrics (비문 noseprint, 홍채 iris) appear nowhere in the Act, decree or rule.** The 2023-10-16 plan to allow them ([etnews](https://www.etnews.com/20231016000249)) remains a plan. Samsung and DB use noseprints only for their own underwriting (S).
- Registration is compulsory only for dogs aged 2 months or more (시행령 §4). A bill to require cat registration was introduced on 2026-06-24 ([nongmin](https://www.nongmin.com/article/20260625500213), S).
- The "15 digits starting 410" format is in 별표1, which was not readable: **UNVERIFIED**. One internal EMR example shows 14 digits.

**Seen abroad, not documented in Korea (UNVERIFIED for Korea).** Each is still a sensible SIU trigger:

- delaying the first vet visit until the waiting period ends;
- splitting one episode across several days to stay under daily caps;
- billing routine care as a covered diagnosis (upcoding);
- inflated quantities;
- duplicate claims across insurers or across pets.

---

## 7. Foreign standards and what we copy

| Standard / system | What is established | Caveats | What NuvoVet copies |
|---|---|---|---|
| **VetXML / VetEnvoy (UK)** | Consortium since 2006. Endorsed schemas for eClaims, microchip, lab and benchmarking, plus a 2016 "clinical evidence" extraction schema (21 fields, 100% extraction accuracy) ([Jones-Diette 2016](https://doi.org/10.1186/s12917-016-0861-y), PubMed). Message conventions from production code ([asm3 vetenvoy.py](https://github.com/sheltermanager/asm3/blob/master/src/asm3/publishers/vetenvoy.py)): a `version` attribute (1.32) plus XSD; an `Identification{PracticeID, PinNo, Source}` block; a conversation id routed by `RecipientId`; separate test and production endpoints; coded pairs `Breed{FreeText, Code}`; consent flags `ThirdPartyDisclosure` and `Authorisation`. | The clinical-evidence schema **deliberately excludes all billing**. The eClaims XSD field list is partner-gated (**UNVERIFIED**). In asm3, `Breed.Code` is sent empty and the consent flags are hard-coded true. "Since 2008, free, >75% of UK practices" is self-claimed (2nd). The reported transition to Allianz's "Petios", with non-Allianz insurers losing access, comes from **one trade-press article seen second-hand** ([Dave-MK note](https://github.com/Dave-MK/vet-app/blob/main/docs/discovery/research/systems-landscape-findings.md)). | Raw-plus-coded pairs; a versioned schema; consent in the envelope; test/prod separation. The single-insurer-capture story is quoted as *reported*, not established. |
| **VeNom** | Integer codes (e.g. `22080`), listed by ICAR as `org.venomcoding` ([ICAR](https://github.com/adewg/ICAR/blob/master/well-known/icarDiagnosisIdentifierType.md)). Subsets: Diagnosis, Presenting complaint, Procedure, Diagnostic test, Radiology, Reason for visit, breeds, and others including 13 "Modelling" ([Subsets.cs](https://github.com/RoyalVeterinaryCollege/VetCompassClient/blob/master/clr/VetCompassClient.net45/Subsets.cs)). The RVC coding service: 96% of sessions end with a code chosen, median 3 s (2020-06-24, [README](https://github.com/RoyalVeterinaryCollege/VetCompassClient)). **Korean precedent:** 103 primary-care clinics, 2016–2024, 28,812 dogs and 113,153 encounters were mapped to VeNom ([Front Vet Sci 2026](https://doi.org/10.3389/fvets.2026.1925257)). Korean EMRs **did** record neuter status (81.3% neutered; <2% of patients excluded for missing signalment). Median follow-up was 0 years. | Licence terms **UNVERIFIED**. Point-of-care coding is weak: 6% of visits had any diagnostic code and 1% a VeNom code ([Jones-Diette 2016](https://doi.org/10.1186/s12917-016-0861-y)). The often-quoted EPR completeness of 64.4% of problems and 58.3% of actions comes from only **36 consultations by 2 vets** ([Prev Vet Med 2016](https://doi.org/10.1016/j.prevetmed.2016.11.014)). | A MAFRA↔VeNom crosswalk later, after a licence check. Auto-code from text; never ask clinicians to code. |
| **Anicom 窓口精算 (Japan)** | FY2023 有価証券報告書: **~4M claims a year, ~85% settled at the counter, ~6,800 対応病院 (>50% of clinics)**, LINE claims since 2017-05 ([EDINET mirror](https://github.com/yuukimiyo/stdata-jp/blob/main/8/87150/2023/DescriptionOfBusiness)). There were 6,417 clinics at 2019-03. **Claim data (レセプト) is generated at the moment the clinic prints the customer's 診療明細書.** The system history runs アニレセF (with Fujitsu, FY ended 2014-03) → アニレセクラウド (2018-01). The claims DB holds species, breed, sex, age, inception date and a **two-level diagnosis** entered from a list or as free text. **No neuter status.** ([Front Vet Sci 2026](https://doi.org/10.3389/fvets.2026.1764413)). One in eight staff are vets (113). | "No counter settlement in the first month" is **not supported** by either filing. The real gate is **product-level**: どうぶつ健保ぷち is marked ×. Limits are **plan-specific**: 50% plan ¥10k/day and ¥100k/surgery; 70% plan ¥14k and ¥140k; べいびぃ ¥20k and ¥200k; **すまいるべいびぃ caps are monthly**. The pivot memo's 7,057 clinics / ~88% / 4.5M+ are newer figures not re-verified here. | Generate the claim at the invoice; a two-level diagnosis; per-plan limits with a `limit_period`; a product-level eligibility flag for clinic-direct claims. |
| **HL7 FHIR Claim** | The only public, field-level claim schema. **R5 (5.0.0):** `patient`, `insurance{coverage, focal, preAuthRef}`, `diagnosis{sequence, diagnosis, type}`, `procedure`, `accident{date, type, location}`, `event`, `supportingInfo`, `total`, `patientPaid`; `item{sequence, diagnosisSequence, procedureSequence, informationSequence, productOrService, modifier, serviced[x], quantity, unitPrice, factor, tax, net, bodySite{site, subSite}, traceNumber, detail…}`. The `patient-animal` extension (species, breed, genderStatus) is active. ([HL7/fhir](https://github.com/HL7/fhir/blob/master/source/claim/structuredefinition-Claim.xml); [extension](https://github.com/HL7/fhir-extensions/blob/master/input/definitions/Patient/StructureDefinition-patient-animal.xml)) | **Pin a version.** `master` (the v6.0.0 build) renamed `Claim.patient` to `Claim.subject`. **R4B**, the most deployed, has no `event`, `patientPaid` or `traceNumber`, and its `bodySite` is a single CodeableConcept. | Line ↔ diagnosis links (`item.diagnosisSequence` → our `diagnosis_refs`); `tax` and `net` per line; `accident`; ClaimResponse-style per-line adjudication |
| **Agria (Sweden)** | Diagnoses coded to the Swedish clinic association's hierarchical registry; a clerk registers claims. Several receipts submitted together become **separate claims on the same date**. Deductible runs over a **rolling 125-day window**. No neuter status. The bilateral cruciate code was rarely used, the code can't distinguish cranial from caudal rupture, and vague codes undercount. 12-month cruciate waiting period for dogs insured after 4 months of age. ([Sci Rep 2021](https://doi.org/10.1038/s41598-021-88876-3)) | — | `dedupe_key` per invoice; laterality and grade fields; deductible basis as a parameter |
| **VetCompass (UK)** | Completeness: neuter 46.4%, insurance 58.0%, adult bodyweight 59.4%. Patellar luxation grade and direction not captured; the limb was recovered from free-text notes in 96.1% of incident cases ([CGE 2016](https://doi.org/10.1186/s40575-016-0034-0)) | — | Extract laterality and grade from free text |
| **Trupanion Express (US)** | "Designed to facilitate the direct payment of invoices to veterinary practices" (10-K filed 2016-02-17, [text mirror](https://github.com/sophia-jihye/Incorporation_of_Company-Related_Factual_Knowledge_into_Pre-trained_Language_Models)) | Fields and footprint **UNVERIFIED** | — |
| **NAPHIA / AAHA / AVMA** | No model claim form or claim-data standard found | **UNVERIFIED** | — |
| **OVF (Poland, 2026)** | Open format with `code{system, value, display}` and `cost{amount, currency}`; no claim resource ([vetformat/ovf](https://github.com/vetformat/ovf)) | Calls VetXML "poorly documented, effectively abandoned" | — |

---

## 8. What NuvoVet claims schema v2 adopts

The binding spec is `docs/claims/SCHEMA_V2_SPEC.md`. This table traces each v2 element to the finding that motivated it.

| Finding (section) | v2 element | Notes |
|---|---|---|
| Insurers receive typed document bundles (§1) | `Claim.documents[]` with `doc_type` ∈ RECEIPT_ITEMIZED, RECEIPT_TOTAL_ONLY, DETAIL_STATEMENT, DX_CERT_STATUTORY, INSURER_TX_CONFIRMATION, OPINION_WITH_RX, MEDICAL_RECORD, LAB_RESULT, IMAGING, PAYMENT_SLIP, CASH_RECEIPT, PET_PHOTO_*, REGISTRATION_CERT, SURGERY_CONSENT, PRESCRIPTION, CLAIM_FORM, CONSENT_FORM, ID_COPY, BANK_PROOF | `source`, `issuer_brn`, `vet_license_no`, `serial_no` (§9③), `has_seal`, `captured_at` (KB/DB imaging), `insurer_form_code` |
| Statutory 진단서 fields (§2.1) | `Diagnosis{text_raw, codes[], certainty, onset_date, diagnosis_date, is_accident, source_doc}` | Waiting periods key on `onset_date`. `certainty` anticipates the proposed presumptive/final checkbox, whose enactment is UNVERIFIED. |
| MAFRA codes are voluntary; insurers use their own (§2.7, §1C) | `codes[{system: NVD\|MAFRA\|KB_PET\|SAMSUNG_PET, code, version}]`; `mafra_standard_ref{species_prefix, code, version}` | Raw text is always kept beside codes (VetXML/FHIR pattern) |
| No receipt standard; total-only receipts, mixed baskets, bundles (§2.5, §3) | `Claim.invoice_total`; `LineItem.category_raw`, `tax_status`, `service_date`, `diagnosis_refs`, `is_bundle`; pend `RECEIPT_NOT_ITEMIZED`, `MIXED_BASKET_UNSPLIT` | Only discount lines (ADM-004) may be negative |
| VAT is a positive list (§2.6) | `tax_status: exempt\|taxable\|unknown` | Weak signal only |
| Channels differ (§4) | `Claim.intake_channel` ∈ owner_upload, insurer_app, fax_email, emr_autoclaim, live_counter, nuvovet_precheck | — |
| Clinic opt-in controversy (§4) | `Clinic.participation_status: none\|precheck\|direct`; `brn`; `emr_vendor` | Never list a clinic as claim-capable without an opt-in |
| Pet identity in law (§6) | `Patient.registration_no` (masked to the last 4 digits in every response), `coat_color`, `birth_date`; photos via documents | No biometric assumption |
| FSS-2025 vs legacy terms; per-product structures (§5) | `Policy.regime`, `copay_ratio`, `deductible{amount, basis}` (default ₩30,000 per visit), `waiting_periods{illness, accident, groups}`, `riders[]`, `limits{}`, `exclusion_riders[]` | v1 fields still accepted; coverage **not** hard-capped at 0.7 |
| Per-insurer document rules (§1) | `insurer_profiles.json` (versioned, `source_url`, `as_of`, `verified: false`) → `required_documents[]` | KB "summed per condition" flagged as an inference |
| Pend is the commonest real outcome (§3) | Decisions `auto_approve \| pend \| review \| deny_recommended`; `pend_reasons[]{code, actor, detail_ko}` | Never auto-deny |
| 진료부 on suspicion only; 1-year retention (§2.3) | `siu_flags[]`; `record_request_rule_id`; info flag `MEDICAL_RECORD_MAY_BE_UNAVAILABLE` | Matches KVMA and Meritz practice |
| 보험업법 §185 duties (§5.4) | Per-line `line_decisions[]{reason_code, benefit_type, eligible_amount}` and plain-Korean explanations | Supports giving the claimant a 손해사정서 |

**Not adopted, or deferred**

- **FHIR mapping** waits until a FHIR version is chosen (R4B or R5).
- **VeNom crosswalk** waits for a licence check.
- **MAFRA table ingestion** waits for a manual download.
- **Biometric identity** is not assumed.
- **Consent form as a source of the expected cost** is not used, because the cost estimate is oral.
- **Per-insurer thresholds** stay as unverified configuration until each insurer page is re-read.

---

## 9. Corrections applied

Each row shows where a research pass was wrong or over-stated and what this document now says. The ID prefix tells you which verifier made the correction: **D** docs-by-insurer, **L** legal-forms, **F** auto-claim flows, **A** adjudication practice, **E** claimant experience, **X** foreign standards. **C-** rows are cross-cutting. Statutory corrections rest on primary text (legalize-kr mirror of law.go.kr).

| ID | What the research said | What is correct (applied above) | Basis |
|---|---|---|---|
| C-1 / D1 / E2 | Meritz "agreed with KAHA to drop the medical record from its 약관" | MOU 2024-04-12: an agreement to **work on simplifying** documents and a **plan** to revise the 약관 clause naming the 진료기록부. No evidence it happened; Meritz still asks for records in suspicious cases. | dailyvet 210101 headline "약관 청구 서류 간소화 작업 착수"; ajunews |
| C-2 / F3 / D2 | Meritz rail = "~1,600 auto-claim clinics" (pivot memo) **or** "1,600 is probably overstated" (research) | Meritz's page shows **two tiers: ~1,600 ID-card 자동청구 clinics + ~400 제휴 clinics**. Press partner counts: ~600, ~617, ~650. Report all as tiers; "overstated" was speculation and is dropped. | Meritz page snippet; thevaluenews; hankyung |
| D2 / E6 | Meritz medical-expense claim = receipt only, online for any pet | A Meritz page also lists **진단서 + 진료비계산영수증 + 진료비세부내역서**. "Dog medical-expense only" online filing comes from model-written summaries and is probably legacy copy. | Verifier corpus items 266, 315, 353, 454 |
| F2 | Meritz is "still the only insurer-run auto-claim" | Meritz is the only **접수-대행** (clinic files for owner) model. **MyBrown, a licensed insurer, has run at-counter live claims since ~2025-10.** | Dated 2024 source vs MyBrown coverage |
| C-3 / E1 | MAFRA codes "will be used for insurance from 2027" | Roadmap: **2025 codes → 2026 EMR load → from 2027 clinic record management**. Insurance use is an expected benefit, **not mandated**. | 3rd Animal Welfare Plan snippets; 수의사법 §20의3 (L) |
| F5 / D8 | Species prefixes "D/C"; codes "based on KCD" | **10** species letters (A, B, C, D, G, H, P, R, S, X). KCD basis **unsupported**. Legal basis is 수의사법 §20의3, which binds the ministry, not vets. 고시 2025-44. | S×5; L |
| C-4 / A1 | Surgical consent "since 2023-01-05; cost estimate in the consent since 2024-01-05" | Written consent since **2022-07-05**. Cost estimate since **2023-01-05**, under a separate article (§19), given **orally** (시행규칙 §18의2), **not part of the form**. Form kept 1 year. 2024-01-05 is the fee-posting extension. | Act 18691 부칙; 법 §13의2, §19; 시행규칙 §13의2, §18의2 (L) |
| L5 | "The consent form carries the expected cost" → usable as pre-approval evidence | Dropped. Use the consent only as evidence that a diagnosis was stated before surgery. | L |
| L1 | 처방전 drug "may be written as a product name instead of the ingredient"; 용법·용량 columns UNVERIFIED | For 처방대상 drugs: **성분명, 용량, 용법, 처방일수 (≤30), 판매수량** are mandatory; product names are added **alongside** (≥3 per ingredient). Substitution is allowed only for non-처방대상 drugs. | 시행규칙 §11③5가·나, ⑤ (L) |
| D5 / C-5 | Missing: 진료부 retention | **진료부 kept 1 year** (시행규칙 §13) vs a 3-year claim window (상법 §662) vs a 3-year 진단서 copy (§9③). Added as an info flag. | L |
| L6 / D6 | Weight "only on the 처방전"; "could not confirm vet fees" | Weight also appears in eVET direct-dispensing entries (§12의2②2). Fee law: **처방전 capped at ₩5,000** (§19①); 진단서 uncapped but posted, and the clinic may not exceed the posted amount (법 §20의2③). | L |
| D7 | 진단서 form at flSeq=30431892 | That is an older file; the current form is **flSeq=163594625**. The field list remains unverified against it. | law.go.kr link check |
| L2 | 동물진료용역 매출명세서 = 부가가치세법 시행규칙 별지 **제21호의2** | **별지 제30호서식** (시행규칙 §62⑪; required by 시행령 §90⑨). Also the **매출대장, 별지 제47호** (시행령 §117⑤), which the 진료부 may replace (⑥). | L |
| L3 | VAT exemption only for livestock, aquatic animals and 고시 services | Also **장애인 보조견** and **animals of 기초생활수급자**. The 고시 is issued by MAFRA or MOF with 재정경제부. | 시행령 §35(5) (L) |
| A7 | "Most care is VAT-free; a taxable line ⇒ non-medical" | The exemption is a **positive list**. Unlisted treatment stays taxable, so `tax_status` is a weak signal. 102→112 remains unverified. | L |
| L4 / D9 | Fee posting: "11 items, 5 vaccines"; per-clinic disclosure scheduled | **Six** vaccines (개 코로나 and 인플루엔자 from 2025-01-01), plus CBC and X-ray with reading fees, plus 고시 items. Posted in the clinic **and on the homepage** since 2025-07-01. Current publication is **aggregated**; per-clinic disclosure is only a 2026-08 draft. | 시행규칙 §18의3, §20; 부칙 제647호, 제725호 (L) |
| A2 | "Noseprint or iris registration is now allowed" | Not in law: **RFID only** (시행령 §10, 별표1). Biometrics are insurer underwriting tools. Dogs ≥2 months compulsory; cats voluntary. | 동물보호법 시행령 §4, §10 (L) |
| A3 | Payment within 3 / 30 business days market-wide | **Per product.** Hyundai: 3 or 30 business days. Meritz, Lotte, Samsung 위풍댕댕, Hana, DB, Chubb: decided without delay, then paid within 7 days. 50% interim payment and late interest are common to all. | 약관 snippets; 상법 §662 (L) |
| A4 | Outsourced adjusting, "보험업법 §185 (UNVERIFIED)" | Confirmed, plus the 2024-02-06 duties: claimant gets the 손해사정서; policyholder may appoint an adjuster; no claim-cutting KPIs; subsidiary-outsourcing disclosure. | L |
| A8 | Multiple insurers share under 상법 §672 | §672 is written for 보험가액 (property value). For medical-expense cover, the 약관 **비례보상** clause decides. | L |
| A9 / F4 | FSS 2025 rules: coverage capped at 0.7; deductible per visit | FSS **guidance** for products sold from 2025-05-01; legacy policies keep 80–90%. Model `regime`, `copay_ratio ≥ 0.3`, `deductible ≥ ₩30,000`, and keep everything configurable. The combination formula is open. | S×5 |
| A10 | "Engine default contradicts 2025 rules" | Partly. Only `claims/models.py` defaulted to ₩10,000; the router and synthetic generator already used ₩30,000, and the engine flags terms below ₩30k or above 70%. | Repo check |
| **C-6** / A6 / D10 | "251,822 (2025) → 307,115 (H1 2026)" read as growth | **Different insurer bases.** 307,115 (H1 2026, **11 insurers**) vs 249,484 for the same 11 at year-end 2025 and 204,661 at H1 2025 (+50.1%). Year-end 2025 for **13 insurers**: 251,822–251,961 in force, 129,714–129,855 new. 2025 premium = 128,748,783천원 ≈ **₩128.7bn** (outlets print 1,287–1,291억). H1 2026 premium for the 11: ₩82.3bn vs ₩58.4bn. MyBrown (소액단기보험사) may not be in either count. | fnnews 2026-09-07; nate 2026-04-21 (S) |
| D4 / E3 / F (bill) | Records bill "covers only disputes and litigation"; fine UNVERIFIED | Purpose: "분쟁 해결 또는 권리구제" (분쟁조정·소송 **등**, non-exhaustive). **과태료 ≤₩1M**. Insurance claims likely excluded (the committee review floated them; the passed text did not adopt them). Still not law. | S×4; current Act (L) |
| D3 | KB: "summed across visits"; documents only above ₩300k | "Per disease or per accident" is KB's wording; **"summed across visits" is our inference**. Below ₩300k KB may still ask for a 진단서; the KB code is required on **any** 진단서 or 진료확인서; originals only for ≥₩50M, death or delegate. | KB snippets (single search set) |
| E4 | KCA: "128 cases, 26.4% resolved" | 128 피해구제 applications. **26.4% is 32 of the 121 closed cases.** These are vet-treatment disputes, not insurance disputes. | hankyung 2026-09-09 (S) |
| E8 | "Claims average ~₩150k per visit" | The ₩150k is from a MyBrown **survey** of 300 women aged 30–49 in the Seoul area. The 10.7 / 10.2 / 5.5% claim shares are MyBrown's own claims data. | dailyvet 285368 (S) |
| D11 | KakaoPay as a general pet-claims channel | The product is **surgery-centred** (수술당일형 / 수술입원형), launched 2026-03-18 | nate (S) |
| D11 | MyBrown live-claim share rising | It fell from 27% (2025-12) to 25% (2026-07) while partners grew from 260 to 500+. Company PR figures. | nate; fntimes (S) |
| F1 | 실손24 details all UNVERIFIED | Statute confirms Law 19780 (2023-10-24); phase 1 on 2024-10-25 (all 요양기관 except 의원급 and 약국); phase 2 on 2025-10-25; no data retention; insurers bear cost. 처방전 and KIDI as agent remain unverified. | 보험업법 §102의6·7, 부칙 (L) |
| D11 / F8 | 2023 plan "mandated issuance" | It said issuance would be pursued after review ("검토·추진"). Never enacted. The MOU date is 2023-11-17 or 11-19. | S×3 |
| X1 | Anicom: no counter settlement in the first month | **Unsupported.** The gate is product-level (ぷち ×). | FY2023 and FY2019 filings |
| X2 | Anicom limits annual: ¥10k/day, 20 days, 2 surgeries | Correct only for the 50% ふぁみりぃ plan. Limits vary by plan, and すまいるべいびぃ caps are **monthly**. | FY2023 filing notes 1–6 |
| X3 | FHIR Claim field list "from master" | The list matches **R5**. Master (v6.0.0) uses `subject`. R4B lacks `event`, `patientPaid` and `traceNumber`. Pin a version. | HL7 source at each tag |
| X4 | Neuter status unreliable | Korean EMRs carry it (81.3% neutered, <2% missing). Keep it optional, but don't call it unreliable for Korean clinic-sourced data. | Front Vet Sci 2026 |
| X5 | VeNom adoption: "vets mostly picked consultation"; 64.4% / 58.3% | Stronger statistic: 6% of visits had any code, 1% VeNom. 64.4% / 58.3% come from n=36 consultations by 2 vets. The VetXML clinical-evidence schema excludes billing. | PubMed full texts |
| X6 | Anicom history cited as the "FY2017" filing | It is the filing for the year ended March 2019 (6,417 clinics). Fujitsu partnership dates from the year ended March 2014. | Filing text |
| X7 | VetEnvoy coded breeds flow | In asm3, `Breed.Code` is empty and consent flags are hard-coded. The pair is a shape to copy, not evidence of coded data flowing. | asm3 source |
| X8 | VetEnvoy → Petios cut-off as fact | Secondary, single trade-press article; quoted as *reported*. | Dave-MK note |
| E7 | Implication: add `copay_min_krw` | Add an explicit **combination rule** (sequential vs max) and a pre/post-2025-05 flag, not just a minimum. | Repo + S |
| L8 | Human 진료기록부 retention "UNVERIFIED" | Confirmed: **10 years** (의료법 시행규칙 §15). | L |

---

## 10. Still unverified: re-check before external use or hard-coding

- **Every per-insurer threshold and file limit:**
  - Samsung and Meritz ₩1M;
  - Lotte ₩3M;
  - DB app ₩5M;
  - KB ₩50M originals, JPG/PNG only, ₩300k trigger;
  - NH 30 files;
  - fax numbers and email addresses.
- **Other insurer facts:**
  - Meritz's online "dog-only" scope;
  - the KakaoPay document list and timing;
  - the Carrot document list.
- **MAFRA:**
  - the 3,511 / 4,930 counts against the 고시 itself;
  - EMR adoption status in IntoVet, 우리엔 and PlusVet;
  - the code table itself (manual download needed).
- **Statutory forms:**
  - the 진단서 field list against the current form (flSeq=163594625);
  - whether the presumptive/final revision was enacted.
- **VAT:** the 102 and 112 exemption counts against the 고시.
- **Records bill:** final text and plenary status.
- **Other regulatory items:** KPIS reporting since 2026-06-21; the per-clinic fee disclosure timing.
- **Channels:**
  - the field lists that Meritz and MyBrown transmit;
  - MyBrown's next-day settlement in practice;
  - the 2% incentive;
  - KIDI's role in 실손24.
- **Market practice:**
  - FSS complaint statistics;
  - loss ratios;
  - typical 진단서 fees;
  - the 30-day illness waiting-period norm.
- **Practical next step, which settles most receipt questions:** collect **20–30 real, redacted 진료비 세부내역서** per major EMR (IntoVet, 우리엔, 이프렌즈, PlusVet) through design-partner clinics.
