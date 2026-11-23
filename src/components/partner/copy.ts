/**
 * Shared partner-facing copy.
 *
 * The financial truth of the marketplace is stated in exactly one place so every
 * screen — onboarding, payments, settlements — explains payouts identically:
 * the guest's gross payment is never RentOps revenue, only the commission is.
 */

export const PAYOUT_POLICY_SHORT =
  "RentOps only ever earns its commission. The rest of the guest's payment belongs to you and is settled to " +
  "this account after verified check-in plus the settlement hold window.";

export const PAYOUT_POLICY_LONG =
  "For platform-collected bookings RentOps holds the guest's payment in settlement and releases it to your " +
  "primary bank account after check-in has been verified and the settlement hold window has passed. Bank " +
  "details can only be changed by a member holding settlement.manage — never by front-desk staff.";

export const COMMISSION_NOTE =
  "RentOps revenue is the commission and service fee only. Gross booking value is money held for you, not " +
  "money earned by the platform.";
