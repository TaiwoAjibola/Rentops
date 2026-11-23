import { Prisma } from "@prisma/client";

/**
 * Uniqueness/exclusion violations surface differently depending on whether they
 * come from the query engine or a raw query. Double-booking protection relies on
 * the `reservation_unit_no_overlap` exclusion constraint (23P01), so we detect
 * that specifically and translate it into a customer-friendly outcome.
 */

export function errorCode(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

export function prismaExclusionViolation(error: unknown): boolean {
  const message = String(error instanceof Error ? error.message : error ?? "");
  return message.includes("23P01") || message.includes("reservation_unit_no_overlap");
}

export function isUniqueConstraint(error: unknown): boolean {
  return errorCode(error) === "P2002";
}

export function isSerialisationFailure(error: unknown): boolean {
  return errorCode(error) === "40001" || errorCode(error) === "40P01";
}

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (isUniqueConstraint(error)) return "That record already exists.";
  if (prismaExclusionViolation(error)) return "Those dates clash with an existing booking.";
  return fallback;
}
