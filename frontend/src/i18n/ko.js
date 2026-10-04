// 랜딩 페이지(`/`) 문자열. `/`는 한국어로만 제공합니다 (DESIGN_SYSTEM.md §5.1, §6).
// 헤드라인은 `landing.hero.headline` 한 곳에만 있습니다. 제목 안의 `\n`은 넓은 화면에서 줄이 바뀌는 자리이고, 색을 칠하는 표시는 쓰지 않습니다.
// 이 파일의 문장은 빌드할 때 브랜드 제목 글꼴(마루 부리)의 글자 범위가 됩니다. 제목 글꼴은 여기 있는 고정 문구만 그립니다.
// 제품 이름(nuvovet DUR, nuvovet Claims)은 줄이 나뉘지 않도록 \u00a0(줄바꿈 없는 공백)으로 잇습니다.
// 청구 금액 같은 숫자는 여기에 쓰지 않습니다. 화면의 청구 숫자는 heroClaim.json에서 읽어 함수 인자로 받습니다.
const ko = {
  lang: 'ko',

  landing: {
    title: ['nuvovet', '처방 검토와 펫보험 청구'],

    nav: {
      label: '주요 메뉴',
      home: 'nuvovet 홈',
      menu: '메뉴 열기',
      menuClose: '메뉴 닫기',
      dur: 'DUR',
      claims: 'Claims',
      integration: '연동',
      security: '보안',
      durCta: 'EMR 데모',
      claimsCta: 'Claims 콘솔',
      pilot: '파일럿 문의',
    },

    hero: {
      label: '동물병원 EMR과 펫보험을 잇는 임상 데이터',
      // 두 줄, 한 가지 색. \n은 줄바꿈 자리입니다.
      headline: '처방이 바뀌는 순간,\n근거도 함께 기록됩니다.',
      // \n: 넓은 화면의 줄바꿈 자리 (제품 이름이 줄 끝에 걸리지 않게).
      lead: 'nuvovet\u00a0DUR은 EMR 안에서 처방을 검토하고,\nnuvovet\u00a0Claims는 같은 근거로 펫보험 청구를 심사합니다.',
      primary: 'EMR 데모 열기',
      secondary: 'Claims 콘솔 보기',
      switchLabel: '화면에서 볼 제품',
      pause: '일시정지',
      play: '재생',
      products: {
        dur: {
          line: 'EMR 안에서 처방을 실시간으로 검토합니다',
          audience: '동물병원·수의사',
        },
        claims: {
          line: '진료 영수증을 근거 있는 청구 데이터로 심사합니다',
          audience: '펫보험사·심사자',
        },
      },
      steps: {
        dur: ['처방 입력', '규칙 검토', '아일랜드 알림', '권장 조치', '저장과 기록'],
        claims: ['영수증 수신', '항목 표준화', '규칙 심사', '지급 계산', '심사자 판정'],
      },
      stepsLabel: (product) => `${product} 재연 단계`,
      stageLabel: (product) => `${product} 화면을 재연한 애니메이션`,
      caption: '가상 환자와 합성 청구로 만든 화면입니다. 실제 진료 기록이 아닙니다.',
    },

    index: {
      title: '어디서부터 볼까요',
      rows: [
        {
          key: 'vet',
          who: '수의사·동물병원',
          what: '진료 중에 처방이 검토되는 과정',
          text: '가상 EMR에서 환자 10마리의 처방을 직접 고치고, 아일랜드가 띄우는 경고와 권장 조치를 확인합니다.',
          link: 'EMR 데모 열기',
          href: '/dur#/emr/V1',
        },
        {
          key: 'insurer',
          who: '펫보험사·심사자',
          what: '청구 한 건이 심사되는 과정',
          text: '합성 청구 대기열에서 항목별 표준 코드와 지역\u00a0수가\u00a0백분위, 지급 계산과 그 근거를 봅니다.',
          link: 'Claims 콘솔 열기',
          href: '/insurance',
        },
        {
          key: 'dev',
          who: 'EMR 벤더·개발자',
          what: '우리 시스템에 붙이는 방법',
          text: 'DUR은 스크립트와 CDS Hooks 형식 요청으로, Claims는 청구 JSON 한 건으로 연결합니다.',
          link: 'API 문서 보기',
          href: '/insurance/api',
        },
      ],
    },

    dur: {
      title: 'EMR 위에 떠 있는 검토자.',
      lead: 'nuvovet\u00a0DUR은 EMR 화면을 가리지 않는 작은 아일랜드로 삽니다. 처방이 바뀔 때마다 다시 검토하고, 필요한 순간에만 스스로 펼쳐집니다.',
      behaviours: [
        { term: '필요할 때만 펼칩니다', text: '새 경고가 생기면 요약과 권장 조치를 보여 주고, 잠시 뒤 다시 접힙니다.' },
        { term: '어디든 둘 수 있습니다', text: '끌어서 원하는 자리에 두거나 오른쪽 패널에 고정합니다. 위치는 기억됩니다.' },
        { term: '행마다 결과가 붙습니다', text: '처방 표의 DUR 칸을 누르면 그 경고로 바로 이동합니다.' },
        { term: '저장 전에 한 번 더', text: '금기나 중대 경고가 남아 있으면 저장 전에 확인하고, 예외 사유를 진료기록에 남깁니다.' },
      ],
      photoCaption: '초코 · 러프 콜리 · 4세. MDR1 미검사 상태에서 이버멕틴 고용량이 처방되면 아일랜드가 먼저 알립니다.',
      island: {
        label: '아일랜드의 세 가지 상태',
        states: {
          idle: '평소에는 한 줄로 접힌 채 처방을 지켜봅니다.',
          alert: '새 경고가 생기면 스스로 펼쳐 권장 조치를 제안합니다.',
          resolved: '경고가 해결되면 다시 한 줄로 접힙니다.',
        },
      },
      patients: {
        title: '가상 환자 10마리',
        lead: '환자를 고르면 그 진료 차트가 EMR 데모에서 열립니다.',
        caption: 'EMR 데모의 가상 환자와 진료 차트',
        cols: { patient: '환자', visit: '이 진료에서 볼 것', result: 'DUR 결과', open: '차트' },
        open: '차트 열기',
      },
    },

    claims: {
      title: '영수증 한 장이\n근거 있는 판정이 되기까지.',
      lead: '자유 입력된 진료 항목을 표준 코드로 바꾸고, 보장, 임상, 수가, 무결성 규칙으로 심사합니다. 엔진은 자동으로 거절하지 않고, 심사자에게 근거를 넘깁니다.',
      figure: {
        label: '지급 예정 금액',
        caption: (billed) => `청구 ${billed}에서 자기부담과 연간 한도를 뺀 금액입니다.`,
      },
      photoCaption: '청구서 한 장 뒤에는 늘 한 마리의 환자가 있습니다.',
      cta: 'Claims 콘솔 열기',
    },

    ledger: {
      title: '심사 예시',
      lead: (lines, shown) => `청구 항목 ${lines}개 중 소견 금액이 큰 ${shown}개 항목입니다.`,
      caption: (id) => `${id} 청구 원문, 표준화 결과, 심사 소견`,
      cols: { raw: '청구 원문', std: '표준화', review: '심사' },
      unitPrice: (price, qty) => `단가 ${price} × ${qty}`,
      code: '표준 코드',
      noCode: '코드 없음',
      noFinding: '소견 없음',
      totals: { billed: '청구', reimbursed: '지급 예정', findings: '소견' },
      findingsCount: (n) => `${n}건`,
      sample: (claims) => `합성 데이터 ${claims}건 중 1건`,
    },

    integration: {
      title: '두 제품 모두, 붙이는 일은 짧게.',
      lead: '청구 한 건을 보내면 판정과 근거를 한 번에 받습니다. DUR은 EMR 화면에 스크립트로 올라갑니다.',
      method: 'POST',
      path: '/api/claims/adjudicate',
      durFile: 'nuvovet-dur.js',
      durLead: 'EMR의 처방 변경을 CDS Hooks 형식으로 보내면, 아일랜드와 행 배지가 화면에 붙습니다.',
      points: [
        { label: '요청', text: '청구 원문과 약관 조건을 JSON으로 보냅니다.' },
        { label: '응답', text: '판정, 소견별 규칙 ID와 금액 영향, 지급 계산을 돌려받습니다.' },
        { label: '호환', text: 'v1 요청 형식을 그대로 받고, 응답에는 필드만 추가됩니다.' },
      ],
      tabs: { request: '요청', response: '응답' },
      link: '전체 API 문서',
      durLink: 'EMR 데모에서 보기',
    },

    security: {
      title: '판정은 규칙이,\n결정은 사람이.',
      columns: [
        {
          title: '데이터 처리',
          items: [
            '심사 API는 받은 청구를 저장하지 않고 판정만 돌려줍니다.',
            '동물등록번호는 모든 응답에서 끝 4자리만 남기고 가립니다.',
            '입력 오류 응답에는 제출한 값을 다시 담지 않습니다.',
            '외부 API를 부르는 기능은 영수증 사진 판독뿐이며, 이미지 크기와 호출 횟수를 제한합니다.',
          ],
        },
        {
          title: '판정 통제',
          items: [
            '판정은 규칙 엔진이 내리고, 응답마다 엔진 버전이 붙습니다.',
            '엔진은 자동으로 거절하지 않습니다. 가장 강한 판정인 지급 거절 권고도 심사자에게 넘어갑니다.',
            '모든 소견에 규칙 ID와 금액 영향이 붙어, 판정 이유를 항목 단위로 확인할 수 있습니다.',
          ],
        },
      ],
    },

    closing: {
      title: '두 화면 모두,\n지금 바로 눌러 볼 수 있습니다.',
      lead: '가입도 설치도 필요 없습니다. 모든 데이터는 가상이거나 합성입니다.',
      primary: 'EMR 데모 열기',
      secondary: 'Claims 콘솔 보기',
    },

    // Rendered only when CONTACT_EMAIL is non-empty (contact.js).
    pilot: {
      title: '보험사 청구 데이터로 파일럿을 진행하려면 연락하세요.',
      button: '파일럿 문의',
    },

    footer: {
      label: '바닥글 메뉴',
      dur: 'DUR',
      claims: 'Claims',
      emr: 'EMR 데모',
      study: '사례 연구',
      console: '콘솔',
      api: 'API 문서',
      credits: '사진 출처',
      note: '교육·시연용 프로토타입입니다. 임상 판단을 대신하지 않습니다.',
      copyright: '© 2026 nuvovet',
    },
  },
};

export default ko;
