import { prisma } from "@/lib/db";

/**
 * Financial ledger.
 *
 * The ledger is intentionally INDEPENDENT of reservation status: it records every
 * money movement as an immutable entry. Reporting derives RentOps revenue from
 * PLATFORM_COMMISSION / SERVICE_FEE entries only — the gross customer payment is
 * money held in settlement for the partner and is never booked as RentOps
 * revenue.
 */

export type LedgerInput = {
  type:
    | "CUSTOMER_PAYMENT"
    | "PARTNER_PAYABLE"
    | "PLATFORM_COMMISSION"
    | "PROCESSING_FEE"
    | "SERVICE_FEE"
    | "PARTNER_PAYOUT"
    | "REFUND"
    | "CHARGEBACK"
    | "ADJUSTMENT";
  direction: "INFLOW" | "OUTFLOW";
  amount: number;
  currency?: string;
  description?: string;
  reservationId?: string | null;
  paymentId?: string | null;
  settlementId?: string | null;
  partnerId?: string | null;
  externalRef?: string | null;
  createdById?: string | null;
  metadata?: object | null;
};

export async function postLedgerEntry(input: LedgerInput) {
  return prisma.ledgerEntry.create({
    data: {
      type: input.type,
      direction: input.direction,
      amount: input.amount,
      currency: input.currency ?? "NGN",
      description: input.description ?? null,
      reservationId: input.reservationId ?? null,
      paymentId: input.paymentId ?? null,
      settlementId: input.settlementId ?? null,
      partnerId: input.partnerId ?? null,
      externalRef: input.externalRef ?? null,
      createdById: input.createdById ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

/** Writes the full set of entries produced by a successful customer payment. */
export async function postBookingPaymentEntries(options: {
  reservationId: string;
  paymentId: string;
  partnerId: string;
  currency: string;
  grossAmount: number;
  platformCommission: number;
  processingFee: number;
  partnerNetAmount: number;
  reference: string;
  createdById?: string | null;
}) {
  await postLedgerEntry({
    type: "CUSTOMER_PAYMENT",
    direction: "INFLOW",
    amount: options.grossAmount,
    currency: options.currency,
    description: `Customer payment received for ${options.reference}`,
    reservationId: options.reservationId,
    paymentId: options.paymentId,
    partnerId: options.partnerId,
    createdById: options.createdById ?? null,
  });

  if (options.platformCommission > 0) {
    await postLedgerEntry({
      type: "PLATFORM_COMMISSION",
      direction: "INFLOW",
      amount: options.platformCommission,
      currency: options.currency,
      description: `RentOps commission for ${options.reference}`,
      reservationId: options.reservationId,
      partnerId: options.partnerId,
      createdById: options.createdById ?? null,
    });
  }

  if (options.processingFee > 0) {
    await postLedgerEntry({
      type: "PROCESSING_FEE",
      direction: "OUTFLOW",
      amount: options.processingFee,
      currency: options.currency,
      description: `Payment processing fee for ${options.reference}`,
      reservationId: options.reservationId,
      paymentId: options.paymentId,
      partnerId: options.partnerId,
      createdById: options.createdById ?? null,
    });
  }

  if (options.partnerNetAmount > 0) {
    await postLedgerEntry({
      type: "PARTNER_PAYABLE",
      direction: "OUTFLOW",
      amount: options.partnerNetAmount,
      currency: options.currency,
      description: `Payable to partner for ${options.reference}`,
      reservationId: options.reservationId,
      partnerId: options.partnerId,
      createdById: options.createdById ?? null,
    });
  }
}

export type MoneySummary = {
  customerPayments: number;
  commissionRevenue: number;
  refunds: number;
  partnerPayouts: number;
  partnerPayable: number;
};

/**
 * Aggregates ledger entries. `partnerPayable` is only ever derived from
 * PARTNER_PAYABLE entries less payouts — never from gross customer payments.
 */
export async function getLedgerSummary(options?: { partnerId?: string; from?: Date; to?: Date }): Promise<MoneySummary> {
  const where: Record<string, unknown> = {};
  if (options?.partnerId) where.partnerId = options.partnerId;
  if (options?.from || options?.to) {
    where.occurredAt = {
      ...(options.from ? { gte: options.from } : {}),
      ...(options.to ? { lte: options.to } : {}),
    };
  }

  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["type"],
    where,
    _sum: { amount: true },
  });

  const totals = new Map(grouped.map((row) => [row.type, row._sum.amount ?? 0]));

  const customerPayments = totals.get("CUSTOMER_PAYMENT") ?? 0;
  const commissionRevenue =
    (totals.get("PLATFORM_COMMISSION") ?? 0) + (totals.get("SERVICE_FEE") ?? 0);
  const refunds = (totals.get("REFUND") ?? 0) + (totals.get("CHARGEBACK") ?? 0);
  const partnerPayouts = totals.get("PARTNER_PAYOUT") ?? 0;
  const partnerPayable = Math.max(0, (totals.get("PARTNER_PAYABLE") ?? 0) - partnerPayouts);

  return { customerPayments, commissionRevenue, refunds, partnerPayouts, partnerPayable };
}
