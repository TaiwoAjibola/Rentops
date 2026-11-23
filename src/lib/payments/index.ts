import { createHmac } from "node:crypto";

import { paymentReference } from "@/lib/reference";

/**
 * Payment abstraction.
 *
 * RentOps never holds customer funds in its own bank account as escrow. Money is
 * collected by a licensed payment provider; partner payouts are made from the
 * settlement ledger according to the agreed policy. When no provider credentials
 * are configured, an explicitly-labelled TEST driver is used so the booking flow
 * remains exercisable locally without pretending real money moved.
 */

export type InitializePaymentInput = {
  amount: number; // minor units
  currency: string;
  email: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
  reference?: string;
};

export type InitializePaymentResult = {
  reference: string;
  authorizationUrl: string;
  providerReference?: string | null;
  isTestDriver: boolean;
};

export type VerifyPaymentResult = {
  status: "PENDING" | "SUCCESS" | "FAILED";
  amount: number;
  currency: string;
  providerReference: string | null;
  channel: string | null;
  paidAt: Date | null;
  raw: unknown;
};

export const PAYSTACK_BASE = "https://api.paystack.co";

function paystackSecret() {
  return process.env.PAYSTACK_SECRET_KEY ?? "";
}

export function paymentDriverEnabled() {
  const driver = (process.env.PAYMENT_DRIVER ?? "test").toLowerCase();
  return driver === "paystack" && Boolean(paystackSecret());
}

export function isTestDriver() {
  return !paymentDriverEnabled();
}

export async function initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
  const reference = input.reference ?? paymentReference();

  if (!paymentDriverEnabled()) {
    return {
      reference,
      authorizationUrl: `/payments/test/${reference}`,
      isTestDriver: true,
    };
  }

  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const payload = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };

  if (!response.ok || !payload.status || !payload.data?.authorization_url) {
    throw new Error(payload.message ?? "Unable to start payment.");
  }

  return {
    reference,
    authorizationUrl: payload.data.authorization_url,
    providerReference: payload.data.access_code ?? null,
    isTestDriver: false,
  };
}

export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  if (!paymentDriverEnabled()) {
    return {
      status: "PENDING",
      amount: 0,
      currency: "NGN",
      providerReference: null,
      channel: "TEST",
      paidAt: null,
      raw: { testDriver: true },
    };
  }

  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecret()}` },
  });

  const payload = (await response.json()) as {
    status?: boolean;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
      channel?: string;
      paid_at?: string;
    };
  };

  const data = payload.data;
  const status: VerifyPaymentResult["status"] =
    data?.status === "success" ? "SUCCESS" : data?.status === "failed" ? "FAILED" : "PENDING";

  return {
    status,
    amount: data?.amount ?? 0,
    currency: data?.currency ?? "NGN",
    providerReference: data?.reference ?? null,
    channel: data?.channel ?? null,
    paidAt: data?.paid_at ? new Date(data.paid_at) : null,
    raw: payload,
  };
}

/** Paystack signs the raw request body with HMAC-SHA512 of the secret key. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!paymentDriverEnabled()) return false;
  if (!signature) return false;
  const expected = createHmac("sha512", paystackSecret()).update(rawBody).digest("hex");
  return expected === signature;
}

export async function initiateTransfer(options: {
  amount: number;
  currency: string;
  recipientCode: string;
  reference: string;
  reason?: string;
}) {
  if (!paymentDriverEnabled()) {
    return { ok: false as const, message: "No live payout provider configured." };
  }

  const response = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: options.amount,
      currency: options.currency,
      recipient: options.recipientCode,
      reference: options.reference,
      reason: options.reason ?? "RentOps partner settlement",
    }),
  });

  const payload = (await response.json()) as { status?: boolean; message?: string; data?: unknown };
  return { ok: Boolean(response.ok && payload.status), message: payload.message ?? null, data: payload.data };
}
