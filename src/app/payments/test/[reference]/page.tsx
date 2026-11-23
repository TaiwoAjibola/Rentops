import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/data";
import { Logo } from "@/components/brand/logo";
import { paymentDriverEnabled } from "@/lib/payments";
import { simulateFailedPayment, simulateSuccessfulPayment } from "@/server/actions/payment-test";

/**
 * Development payment sandbox.
 *
 * Renders only while RentOps has no licensed Nigerian payment provider
 * configured. It is deliberately and unmistakably labelled: no real money moves,
 * and RentOps never holds customer funds in its own account as escrow — with a
 * live provider the customer pays the provider and partner payouts are made from
 * the settlement ledger after verified check-in.
 */

export default async function PaymentTestPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  if (paymentDriverEnabled()) redirect(`/checkout/${reference}?live=1`);

  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: {
      reservation: { include: { property: true } },
    },
  });

  if (!payment) notFound();
  if (payment.status !== "PENDING") {
    redirect(`/booking/${payment.reservation?.reference ?? payment.reference}/confirmation`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <Callout tone="warning" title="Development payment sandbox">
          RentOps has no live payment provider configured, so this sandbox simulates the
          provider callback. No money is collected and no card is charged. In production,
          payment is collected by a licensed Nigerian payment provider and the partner payout
          is released from the settlement ledger after verified check-in.
        </Callout>

        <Card className="mt-6">
          <CardHeader
            title="Simulate provider response"
            description={`Reference ${payment.reference}`}
            action={<Badge tone="warning">TEST DRIVER</Badge>}
          />
          <CardBody className="space-y-5">
            <dl className="space-y-2 text-[14px]">
              <div className="working flex justify-between gap-4">
                <dt className="text-ink-500">Amount</dt>
                <dd className="font-semibold text-ink-900 tabular-nums">
                  {formatMoney(payment.amount, payment.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Reservation</dt>
                <dd className="font-medium text-ink-900">{payment.reservation?.reference ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Property</dt>
                <dd className="font-medium text-ink-900">{payment.reservation?.property.name ?? "—"}</dd>
              </div>
            </dl>

            <div className="grid gap-3 sm:grid-cols-2">
              <form action={simulateSuccessfulPayment}>
                <input type="hidden" name="reference" value={payment.reference} />
                <Button type="submit" className="w-full">
                  Simulate successful payment
                </Button>
              </form>
              <form action={simulateFailedPayment}>
                <input type="hidden" name="reference" value={payment.reference} />
                <Button type="submit" variant="outline" className="w-full">
                  Simulate failed payment
                </Button>
              </form>
            </div>

            <p className="text-[13px] leading-relaxed text-ink-500">
              A simulated success confirms the booking, posts the customer payment, platform
              commission, processing fee and partner-payable entries to the immutable ledger, and
              triggers the confirmation notification. None of these entries represent RentOps
              revenue except the commission line.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
