import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import { markPaymentSuccess, markPaymentFailed } from "@/lib/payments/booking";
import { prisma } from "@/lib/db";

/**
 * Paystack webhook receiver.
 *
 * The provider signs the RAW request body with HMAC-SHA512 of the secret key, so
 * the body is read as text and verified before anything is trusted. Money state
 * is only advanced here or after a provider-side verify call — never from
 * client-reported data. Every handler is idempotent.
 */

type ChargePayload = {
  reference?: string;
  amount?: number;
  channel?: string;
  id?: number | string;
  gateway_response?: string;
  status?: string;
};

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");

  if (!signature || expected !== signature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: { event?: string; data?: ChargePayload };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const data = event.data ?? {};
  const reference = String(data.reference ?? "").trim();
  if (!reference) return NextResponse.json({ error: "Missing reference." }, { status: 400 });

  const existing = await prisma.payment.findUnique({ where: { reference } });
  if (!existing) return NextResponse.json({ error: "Unknown payment." }, { status: 404 });
  if (existing.status !== "PENDING") {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  if (event.event === "charge.success") {
    await markPaymentSuccess({
      reference,
      amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : existing.amount,
      providerReference: data.id != null ? String(data.id) : null,
      channel: typeof data.channel === "string" ? data.channel : null,
      raw: data as object,
      webhookVerified: true,
    });
    return NextResponse.json({ ok: true });
  }

  if (event.event === "charge.failed") {
    await markPaymentFailed({ reference, reason: String(data.gateway_response ?? "Charge failed") });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
}
