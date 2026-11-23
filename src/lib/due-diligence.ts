import type { VerificationType } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Due diligence for longer stays.
 *
 * RentOps never blocks search or booking purely because of duration. Instead,
 * once a stay reaches a configured threshold the platform recommends (or where
 * legally/contractually necessary requires) extra verification. Thresholds are
 * administrator-configurable and may differ per property.
 */

export type DueDiligenceOutcome = {
  required: boolean;
  mandatory: boolean;
  nights: number;
  message: string;
  verificationTypes: VerificationType[];
  chargeMinor: number;
  policyNames: string[];
};

const DEFAULT_THRESHOLD_DAYS = 90;

export async function evaluateDueDiligence(options: {
  nights: number;
  property?: {
    dueDiligenceEnabled?: boolean | null;
    dueDiligenceThresholdDays?: number | null;
    mandatoryVerification?: boolean | null;
  } | null;
}): Promise<DueDiligenceOutcome> {
  const { nights, property } = options;
  const enabled = property?.dueDiligenceEnabled ?? true;

  const policies = await prisma.dueDiligencePolicy.findMany({
    where: { isActive: true },
    orderBy: { minDays: "asc" },
  });

  const threshold = property?.dueDiligenceThresholdDays ?? undefined;

  const matched = policies.filter(
    (policy) =>
      nights >= (threshold ?? policy.minDays) &&
      (threshold != null ? policy.minDays >= 0 : true) &&
      (policy.maxDays == null || nights <= policy.maxDays),
  );

  // When a property sets its own threshold, only policies below that length are advisory.
  const applicable =
    threshold != null
      ? matched.filter((policy) => nights >= threshold)
      : matched.filter((policy) => nights >= policy.minDays);

  const active = enabled ? applicable : applicable.filter((policy) => policy.mandatory);

  if (active.length === 0) {
    return {
      required: false,
      mandatory: false,
      nights,
      message: "",
      verificationTypes: [],
      chargeMinor: 0,
      policyNames: [],
    };
  }

  const verificationTypes = Array.from(
    new Set(active.flatMap((policy) => (policy.verificationTypes as VerificationType[]) ?? [])),
  );
  const chargeMinor = active.reduce((total, policy) => total + (policy.chargeMinor ?? 0), 0);
  const mandatory = active.some((policy) => policy.mandatory) || Boolean(property?.mandatoryVerification);

  const highest = active[active.length - 1];

  return {
    required: true,
    mandatory,
    nights,
    message:
      highest?.recommendationText ??
      "Because of the length of this intended stay, we recommend additional identity and background verification before proceeding.",
    verificationTypes,
    chargeMinor,
    policyNames: active.map((policy) => policy.name),
  };
}

export function dueDiligenceThresholdDays() {
  return DEFAULT_THRESHOLD_DAYS;
}
