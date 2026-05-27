#!/bin/bash
# send-email Edge Function 이메일 테스트 스크립트
#
# 사용 전 설정:
#   export SUPABASE_ANON_KEY="여기에_anon_key_입력"
#
# 실행:
#   chmod +x supabase/test-email.sh
#   ./supabase/test-email.sh

FUNCTION_URL="https://vhnourjddnlslgabrasb.supabase.co/functions/v1/send-email"
ANON_KEY="${SUPABASE_ANON_KEY}"

if [ -z "$ANON_KEY" ]; then
  echo "❌ SUPABASE_ANON_KEY 환경변수를 설정하세요."
  echo "   export SUPABASE_ANON_KEY=\"...\""
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $ANON_KEY"

echo "============================================"
echo " lokalonline.at 이메일 테스트"
echo "============================================"
echo ""

# ── Test 1: 새 주문 알림 (어드민에게) ─────────────────────────────
echo "▶ [1/3] 새 주문 알림 테스트 (→ info@lokalonline.at)"
RESULT=$(curl -s -X POST "$FUNCTION_URL" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new-order",
    "table": "orders",
    "record": {
      "business_name": "Test Café Wien",
      "contact_name": "Max Mustermann",
      "email": "info@lokalonline.at",
      "phone": "+43 123 456789",
      "business_type": "cafe",
      "address": "Mariahilfer Str. 1, 1060 Wien",
      "description": "이것은 이메일 테스트 메시지입니다."
    }
  }')
echo "   결과: $RESULT"
echo ""

# ── Test 2: 클라이언트 → 어드민 메시지 알림 ────────────────────────
echo "▶ [2/3] 고객 메시지 알림 테스트 (→ info@lokalonline.at)"
RESULT=$(curl -s -X POST "$FUNCTION_URL" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new-message",
    "table": "messages",
    "record": {
      "sender_type": "client",
      "sender_name": "Max Mustermann",
      "content": "안녕하세요, 메뉴판 업데이트 요청드립니다. (테스트 메시지)",
      "order_id": null,
      "attachment_url": null
    }
  }')
echo "   결과: $RESULT"
echo ""

# ── Test 3: 어드민 → 고객 메시지 알림 (order_id 필요) ──────────────
# 실제 orders 테이블에 존재하는 order_id로 교체 필요
echo "▶ [3/3] 어드민 → 고객 메시지 알림 테스트"
echo "   ⚠️  실제 order_id 필요 — 아래 명령 실행 전 ORDER_ID 변수 수정 필요"
ORDER_ID="YOUR_ACTUAL_ORDER_ID"

if [ "$ORDER_ID" != "YOUR_ACTUAL_ORDER_ID" ]; then
  RESULT=$(curl -s -X POST "$FUNCTION_URL" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"new-message\",
      \"table\": \"messages\",
      \"record\": {
        \"sender_type\": \"admin\",
        \"sender_name\": \"lokalonline.at\",
        \"content\": \"안녕하세요! 사이트 제작이 완료되었습니다. (테스트 메시지)\",
        \"order_id\": \"$ORDER_ID\",
        \"attachment_url\": null
      }
    }")
  echo "   결과: $RESULT"
else
  echo "   → ORDER_ID를 설정하지 않아 건너뜁니다."
fi

echo ""
echo "============================================"
echo " 완료! 이메일함을 확인하세요."
echo " 결과가 {\"ok\":true} 이면 발송 성공입니다."
echo "============================================"
