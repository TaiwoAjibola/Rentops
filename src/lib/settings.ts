import { prisma } from "@/lib/db";
import { DEFAULT_COMMISSION_RATE, SETTLEMENT_HOLD_DEFAULT_DAYS } from "@/lib/constants";

/**
 * Platform configuration is stored in the database so RentOps administrators can
 * change commercial rules without a deployment. Defaults here apply until a
 * value is set in the admin portal.
 */

export type FinancialConfig = {
  commissionRate: number; // percent applied to accommodation revenue
  serviceFeeRate: number; // percent added to the customer total as a service fee
  processingFeeRate: number; // percent charged by the payment processor
  processingFeeFlat: number; // minor units
  processingFeeBearer: "PLATFORM" | "PARTNER";
  currency: string;
  settlementHoldDays: number;
};

export const FINANCIAL_DEFAULTS: FinancialConfig = {
  commissionRate: DEFAULT_COMMISSION_RATE,
  serviceFeeRate: 0,
  processingFeeRate: 1.5,
  processingFeeFlat: 0,
  processingFeeBearer: "PLATFORM",
  currency: "NGN",
  settlementHoldDays: SETTLEMENT_HOLD_DEFAULT_DAYS,
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const record = await prisma.platformSetting.findUnique({ where: { key } });
  if (!record) return fallback;
  return (record.value as T) ?? fallback;
}

export async function getFinancialConfig(): Promise<FinancialConfig> {
  const stored = await getSetting<Partial<FinancialConfig>>("finance.config", {});
  return { ...FINANCIAL_DEFAULTS, ...stored };
}

export async function saveSetting(key: string, value: unknown, group = "general", actorId?: string) {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as object, group, updatedById: actorId ?? null },
    update: { value: value as object, group, updatedById: actorId ?? null },
  });
}

export async function getPartnerCommissionRate(partnerOverride: number | null, categoryRate?: number | null) {
  if (typeof partnerOverride === "number") return partnerOverride;
  if (typeof categoryRate === "number") return categoryRate;
  const config = await getFinancialConfig();
  return config.commissionRate;
}
