// 랜딩 페이지(`/`) 문자열. `/`는 한국어로만 제공합니다 (DESIGN_SYSTEM.md §5.1, §6).
// 헤드라인은 `landing.hero.headline` 한 곳에만 있으므로, 레이아웃을 건드리지 않고 문구만 바꿀 수 있습니다.
// 헤드라인 안의 `\n`은 줄이 바뀌는 자리이고, [[ ]]·{{ }}로 감싼 말은 각각 DUR·Claims 색으로 칠합니다.
// 청구 금액 같은 숫자는 여기에 쓰지 않습니다. 화면의 청구 숫자는 heroClaim.json에서 읽어 함수 인자로 받습니다.
const ko = {
  lang: 'ko',

  landing: {
    title: ['nuvovet', '처방 검토와 펫보험 청구'],

    nav: {
      label: '주요 메뉴',
      home: 'nuvovet 홈',
      menu: '메뉴 열기',
      dur: 'DUR',
      claims: 'Claims',
      how: '둘러보기',
      integration: '연동',
      security: '보안',
      durCta: 'DUR 데모',
      claimsCta: 'Claims 콘솔',
      pilot: '파일럿 문의',
    },

    hero: {
      eyebrow: '동물병원 EMR과 펫보험을 잇는 임상 데이터 레이어',
      // [[ ]] 안은 DUR 색(청록), {{ }} 안은 Claims 색(코발트)으로 칠합니다. \n은 줄바꿈 자리입니다.
      headline: '[[처방 검토]]부터 {{보험 청구}}까지,\n근거가 남는 동물병원 데이터.',
      lead: 'nuvovet DUR은 EMR 안에서 처방을 실시간으로 검토하고, nuvovet Claims는 진료 영수증을 표준 코드와 근거가 붙은 청구 데이터로 심사합니다.',
      switchLabel: '화면에서 볼 제품',
      watching: '재생 중',
      watch: '화면에서 보기',
      pause: '자동 재생 멈춤',
      play: '자동 재생',
      products: {
        dur: {
          audience: '동물병원·수의사',
          line: 'EMR 안에서 처방을 실시간으로 검토합니다',
          cta: 'EMR 데모 열기',
        },
        claims: {
          audience: '펫보험사·심사자',
          line: '진료 영수증을 근거 있는 청구 데이터로 심사합니다',
          cta: 'Claims 콘솔 열기',
        },
      },
      steps: {
        dur: ['처방 입력', '규칙 실시간 검토', '아일랜드 알림', '권장 조치', '저장과 기록'],
        claims: ['영수증 수신', '항목 표준화', '규칙 심사', '지급 계산', '심사자 판정'],
      },
      stageLabel: (product) => `${product} 화면을 재연한 애니메이션`,
      caption: '가상 환자와 합성 청구로 만든 화면입니다. 실제 진료 기록이 아닙니다.',
    },

    chooser: {
      eyebrow: '어디서부터 볼까요',
      title: '역할에 맞는 데모로 바로 들어가세요.',
      roles: [
        {
          key: 'vet',
          product: 'dur',
          who: '수의사·동물병원',
          title: '진료 중 처방이 어떻게 검토되는지',
          points: ['가상 EMR에서 환자 10마리의 처방을 직접 고쳐 봅니다', 'DUR 아일랜드가 경고를 띄우고 권장 조치를 제안합니다', '저장 전 확인 창과 예외 사유 기록까지 이어집니다'],
          cta: 'EMR 데모 열기',
          href: '/dur#/emr/V1',
        },
        {
          key: 'insurer',
          product: 'claims',
          who: '펫보험사·심사자',
          title: '청구 한 건이 어떻게 심사되는지',
          points: ['합성 청구 대기열에서 판정과 근거를 확인합니다', '항목별 표준 코드, 지역 수가 백분위, 지급 계산을 봅니다', '병원 단위 가격 패턴과 이상 신호를 추적합니다'],
          cta: 'Claims 콘솔 열기',
          href: '/insurance',
        },
        {
          key: 'dev',
          product: null,
          who: 'EMR 벤더·개발자',
          title: '우리 시스템에 어떻게 붙이는지',
          points: ['DUR은 스크립트 한 줄과 CDS Hooks 형식 요청으로 붙습니다', 'Claims는 청구 JSON 한 건을 보내고 판정을 받습니다', '요청과 응답 예시를 그대로 복사해 시험합니다'],
          cta: 'API 문서 보기',
          href: '/insurance/api',
        },
      ],
    },

    dur: {
      eyebrow: '동물병원용',
      title: 'EMR 위에 떠 있는 검토자.',
      lead: 'DUR은 EMR 화면을 가리지 않는 작은 아일랜드로 삽니다. 처방이 바뀔 때마다 다시 검토하고, 필요한 순간에만 스스로 펼쳐집니다.',
      features: [
        { title: '필요할 때만 펼쳐집니다', text: '새 경고가 생기면 아일랜드가 열려 요약과 권장 조치를 보여 주고, 잠시 뒤 다시 접힙니다.' },
        { title: '어디든 옮길 수 있습니다', text: '끌어서 원하는 자리에 두거나, 오른쪽 패널에 고정합니다. 위치는 기억됩니다.' },
        { title: '행마다 결과가 붙습니다', text: '처방 표의 DUR 칸 배지를 누르면 해당 경고 카드로 바로 이동합니다.' },
        { title: '저장 전에 한 번 더', text: '금기·중대 경고가 남으면 저장 전에 확인 창이 뜨고, 예외 사유가 진료기록에 남습니다.' },
      ],
      playground: {
        label: '아일랜드 상태 미리보기',
        states: { idle: '대기', checking: '검토 중', alert: '경고', resolved: '해결', open: '펼침' },
      },
      patients: {
        title: '가상 환자 10마리',
        lead: '환자를 고르면 그 진료 차트가 EMR 데모에서 열립니다.',
      },
      cta: 'EMR 데모에서 직접 해 보기',
    },

    claims: {
      eyebrow: '펫보험사용',
      title: '영수증 한 장이 근거 있는 판정이 되기까지.',
      lead: '자유 입력된 진료 항목을 표준 코드로 바꾸고, 보장·임상·수가·무결성 규칙으로 심사합니다. 엔진은 자동으로 거절하지 않고 심사자에게 근거를 넘깁니다.',
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
      eyebrow: '연동',
      title: '두 제품 모두, 붙이는 일은 짧게.',
      lead: '청구 한 건을 보내면 판정과 근거를 한 번에 받습니다. DUR은 EMR 화면에 스크립트로 올라갑니다.',
      method: 'POST',
      path: '/api/claims/adjudicate',
      durTitle: 'nuvovet DUR SDK',
      durLead: 'EMR의 처방 변경을 CDS Hooks 형식으로 보내면, 아일랜드와 행 배지가 화면에 붙습니다.',
      points: [
        { label: '요청', text: '청구 원문과 약관 조건을 JSON으로 보냅니다.' },
        { label: '응답', text: '판정, 소견별 규칙 ID와 금액 영향, 지급 계산을 돌려받습니다.' },
        { label: '호환', text: 'v1 요청 형식을 그대로 받고, 응답에는 필드만 추가됩니다.' },
      ],
      tabs: { request: '요청', response: '응답' },
      link: '전체 API 문서',
    },

    security: {
      eyebrow: '보안·데이터',
      title: '판정은 규칙이, 결정은 사람이.',
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

    band: {
      title: '두 화면 모두, 지금 바로 눌러 볼 수 있습니다.',
      lead: '가입도 설치도 필요 없습니다. 모든 데이터는 가상이거나 합성입니다.',
    },

    // Rendered only when CONTACT_EMAIL is non-empty (contact.js).
    pilot: {
      title: '보험사 청구 데이터로 파일럿을 진행하려면 연락하세요.',
      button: '파일럿 문의',
    },

    footer: {
      label: '바닥글 메뉴',
      products: '제품',
      demos: '데모',
      console: 'Claims 콘솔',
      emr: 'EMR 데모',
      dur: 'DUR 사례 연구',
      api: 'API 문서',
      note: '교육·시연용 프로토타입입니다. 임상 판단을 대신하지 않습니다.',
      copyright: '© 2026 nuvovet',
    },
  },
};

export default ko;
