// ── Stripe 결제 설정 ────────────────────────────────────────────────
// Payment Link URL은 Stripe 대시보드에서 생성 후 여기에 입력하세요.
// 대시보드 > Payment Links > Create link > 구독 상품 선택
//
// 플랜별 상품 권장 구성:
//   Basis monthly:   €19/월 반복 + €99 일회성 (setup fee)
//   Standard monthly: €39/월 반복 + €149 일회성
//   Premium monthly:  €69/월 반복 + €199 일회성
//   (yearly 플랜은 별도 Payment Link 생성)

window.STRIPE_CONFIG = {
  publishableKey: 'pk_live_51Tb7ON2NDCKHpYEq9SrrUJJefxW7VuhcPxVkycrP3xem8Mwd0l6R7TQPbN6dDQUQm7zCHAZGkCqVojhiGWlSox7100GQApJ1GM',

  // Payment Link URLs — Stripe 대시보드에서 생성 후 아래 값을 교체하세요
  links: {
    basis_monthly:    null,  // 예: 'https://buy.stripe.com/xxxx'
    basis_yearly:     null,
    standard_monthly: null,
    standard_yearly:  null,
    premium_monthly:  null,
    premium_yearly:   null
  }
};
