import { NextResponse } from "next/server";

import { applyVerifiedProviderPaymentEvent } from "@/features/commerce/payment-lifecycle";
import { getPaymentProviderAdapterByCode } from "@/features/commerce/payment-providers";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const adapter = getPaymentProviderAdapterByCode(provider);

  if (!adapter) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const rawBody = await request.text();
  const headers = Object.fromEntries(
    Array.from(request.headers.entries()).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );

  let verified;

  try {
    verified = await adapter.verifyWebhook({ headers, rawBody });
  } catch (error) {
    console.error("COMMERCE_PROVIDER_WEBHOOK_VERIFY_ERROR", {
      error,
      provider: adapter.code,
    });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!verified) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await applyVerifiedProviderPaymentEvent({
    ...verified,
    providerCode: adapter.code,
  });

  if (!result.ok) {
    const status =
      result.reason === "payment_not_found"
        ? 404
        : result.reason === "amount_mismatch" ||
            result.reason === "currency_mismatch" ||
            result.reason === "state_conflict"
          ? 409
          : 400;

    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    idempotent: result.idempotent,
    status: result.status,
  });
}
