// 랜딩 페이지(`/`) 문자열. `/`는 한국어로만 제공합니다 (DESIGN_SYSTEM.md §5.1, §6).
// 헤드라인은 `landing.hero.headline` 한 곳에만 있으므로, 레이아웃을 건드리지 않고 문구만 바꿀 수 있습니다.
// 헤드라인 안의 `\n`은 줄이 바뀌는 자리입니다. 화면에는 띄어쓰기로 보이고, 두 덩어리가 각각 한 줄을
// 차지합니다. 좁은 화면에서는 덩어리 안에서만 균형 있게 줄을 나눕니다.
// 숫자는 여기에 쓰지 않습니다. 화면의 숫자는 모두 heroClaim.json에서 읽어 함수 인자로 받습니다.
const ko = {
  lang: 'ko',

  landing: {
    title: ['nuvovet', '펫보험 청구 데이터'],

    nav: {
      label: '주요 메뉴',
      home: 'nuvovet 홈',
      product: '제품',
      integration: '연동',
      security: '보안',
      dur: 'DUR 데모',
      console: '콘솔 데모 열기',
      pilot: '파일럿 문의',
    },

    hero: {
      headline: '동물병원 영수증을 심사할 수 있는\n청구 데이터로 바꿉니다.',
      lead: '진료 항목을 표준 코드로 정형화하고, 규칙 ID와 근거가 붙은 소견으로 심사합니다.',
      primary: '콘솔 데모 열기',
      secondary: 'API 연동 보기',
      previewLabel: (id) => `청구 심사 화면 ${id}`,
      caption: (claims) => `합성 데이터 ${claims}건 중 1건`,
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
    },

    integration: {
      title: '연동',
      lead: '청구 한 건을 보내면 판정과 근거를 한 번에 받습니다.',
      method: 'POST',
      path: '/api/claims/adjudicate',
      points: [
        { label: '요청', text: '청구 원문과 약관 조건을 JSON으로 보냅니다.' },
        { label: '응답', text: '판정, 소견별 규칙 ID와 금액 영향, 지급 계산을 돌려받습니다.' },
        { label: '호환', text: 'v1 요청 형식을 그대로 받고, 응답에는 필드만 추가됩니다.' },
      ],
      tabs: { request: '요청', response: '응답' },
      link: '전체 API 문서',
    },

    security: {
      title: '보안·데이터',
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

    // Rendered only when CONTACT_EMAIL is non-empty (contact.js).
    pilot: {
      title: '보험사 청구 데이터로 파일럿을 진행하려면 연락하세요.',
      button: '파일럿 문의',
    },

    footer: {
      label: '바닥글 메뉴',
      console: '콘솔 데모',
      dur: 'DUR 사례 연구',
      copyright: '© 2026 nuvovet',
    },
  },
};

export default ko;
