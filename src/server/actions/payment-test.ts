import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { markPaymentSuccess, markPaymentFailed } from "@/lib/payments/booking";
import { isTestDriver } from "@/lib/payments";

/**
 * Development-only settlement simulator.
 *
 * When no licensed payment provider is configured, RentOps uses an explicitly
 * labelled TEST driver so the booking → payment → ledger → settlement pipeline
 * can be exercised end to end. It never claims real money moved, and it is
 * unavailable the moment live credentials are present.
 */

export async function simulateSuccessfulPayment(formData: FormData): Promise<void> {
  if (!isTestDriver()) redirect("/checkout?live=1");

  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) redirect("/checkout?error=missing-reference");

  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { reservation: true },
  });
  if (!payment) redirect("/checkout?error=unknown-payment");

  await markPaymentSuccess({
    reference,
    amount: payment.amount,
    providerReference: `TEST-${reference}`,
    channel: "TEST",
    raw: { testDriver: true, simulatedAt: new Date().toISOString() },
    webhookVerified: true,
  });

  redirect(`/booking/${payment.reservation?.reference ?? payment.reference}/confirmation`);
}

export async function simulateFailedPayment(formData: FormData): Promise<void> {
  if (!isTestDriver()) redirect("/checkout?live=1");

  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) redirect("/checkout?error=missing-reference");

  await markPaymentFailed({ reference, reason: "Simulated failure (development test driver)" });
  redirect(`/payments/test/${reference}?failed=1`);
}
