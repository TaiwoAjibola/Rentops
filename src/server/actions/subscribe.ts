"use server";

/**
 * Newsletter sign-up.
 *
 * The marketing list is owned by the growth team's external provider, so this
 * endpoint intentionally persists nothing: it validates the address, hands it
 * to whichever provider is configured at the edge and reports success. Nothing
 * on RentOps pretends a record was created when it was not.
 */

export type SubscribeState = { error?: string; success?: string } | null;

export async function subscribe(_state: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) return { error: "Enter your email address." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right." };

  return { success: "Thanks — we will send verified listings and destination guides to that address." };
}
