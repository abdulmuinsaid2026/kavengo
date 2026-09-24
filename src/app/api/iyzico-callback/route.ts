import { NextRequest, NextResponse } from 'next/server';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.SERVER_URL || 'http://localhost:8080';

function buildRedirectHtml(redirectUrl: string): string {
  const safeJsonUrl = JSON.stringify(redirectUrl);
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body>
<script>
  try {
    var target = ${safeJsonUrl};
    if (window.top !== window.self) {
      window.top.location.href = target;
    } else {
      window.location.href = target;
    }
  } catch(e) {
    window.location.href = ${safeJsonUrl};
  }
</script>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const status = params.get('status') || '';
  const paymentId = params.get('paymentId') || '';
  const conversationData = params.get('conversationData') || '';
  const conversationId = params.get('conversationId') || '';

  let redirectUrl = `${FRONTEND_URL}/checkout?payment=failed&reason=3ds_failed`;

  if (status === 'success' && conversationId) {
    try {
      const confirmUrl = new URL(`${BACKEND_URL}/iyzico/confirm`);
      confirmUrl.searchParams.set('status', status);
      confirmUrl.searchParams.set('paymentId', paymentId);
      confirmUrl.searchParams.set('conversationData', conversationData);
      confirmUrl.searchParams.set('conversationId', conversationId);

      const res = await fetch(confirmUrl.toString(), { method: 'POST' });
      const data = await res.json();

      if (data.status === 'success' && data.orderId) {
        const trackingQuery = data.trackingNumber ? `&trackingNumber=${encodeURIComponent(data.trackingNumber)}` : '';
        redirectUrl = `${FRONTEND_URL}/orders/${data.orderId}?payment=success${trackingQuery}`;
      } else {
        redirectUrl = `${FRONTEND_URL}/checkout?payment=failed&reason=${encodeURIComponent(data.reason || 'confirmation_failed')}`;
      }
    } catch {
      redirectUrl = `${FRONTEND_URL}/checkout?payment=failed&reason=server_error`;
    }
  }

  return new NextResponse(buildRedirectHtml(redirectUrl), {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}
