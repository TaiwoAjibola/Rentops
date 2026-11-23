import type {
  ConversationType,
  NotificationChannel,
  ReferralStatus,
  ReviewStatus,
  TicketPriority,
  TicketStatus,
  VerificationStatus,
  VerificationType,
} from "@prisma/client";

import type { StatusTone } from "@/lib/constants";

/**
 * Vocabularies specific to the customer account area. Anything shared across
 * the platform lives in `@/lib/constants`; these are only used here.
 */

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  PENDING: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_STATUS_TONES: Record<TicketStatus, StatusTone> = {
  OPEN: "danger",
  PENDING: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TICKET_PRIORITY_TONES: Record<TicketPriority, StatusTone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  BOOKING: "Booking or reservation",
  PAYMENT: "Payment or refund",
  PROPERTY: "Property issue",
  INSPECTION: "Inspection visit",
  VERIFICATION: "Verification",
  ACCOUNT: "Account & security",
  PARTNER: "Property partner conduct",
  OTHER: "Something else",
};

export const TICKET_CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS);

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING: "Pending",
  QUALIFIED: "Qualified",
  REWARDED: "Rewarded",
  REJECTED: "Rejected",
};

export const REFERRAL_STATUS_TONES: Record<ReferralStatus, StatusTone> = {
  PENDING: "warning",
  QUALIFIED: "info",
  REWARDED: "success",
  REJECTED: "danger",
};

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  BOOKING: "Booking",
  ENQUIRY: "Enquiry",
  INSPECTION: "Inspection",
  SUPPORT: "RentOps support",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "In-app",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
};

export const NOTIFICATION_CHANNEL_HINTS: Record<NotificationChannel, string> = {
  IN_APP: "Shown in your RentOps account area.",
  EMAIL: "Sent to your registered email address.",
  SMS: "Sent as a text message once a provider is configured.",
  WHATSAPP: "Sent over WhatsApp once a provider is configured.",
};

export const INSPECTION_WINDOW_LABELS: Record<string, string> = {
  MORNING: "Morning (9am – 12pm)",
  AFTERNOON: "Afternoon (12pm – 4pm)",
  EVENING: "Evening (4pm – 7pm)",
};

export const INSPECTION_WINDOWS = Object.keys(INSPECTION_WINDOW_LABELS);

export const ID_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID: "National Identity Number (NIN)",
  VOTERS_CARD: "Voter's card",
  DRIVERS_LICENCE: "Driver's licence",
  INTERNATIONAL_PASSPORT: "International passport",
};

export const ID_TYPES = Object.keys(ID_TYPE_LABELS);

export const VERIFICATION_STEPS: { type: VerificationType; title: string; description: string }[] = [
  {
    type: "IDENTITY",
    title: "Identity",
    description: "A government-issued ID that matches the name on your account.",
  },
  {
    type: "ADDRESS",
    title: "Address",
    description: "Proof of where you live — utility bill, tenancy agreement or bank statement.",
  },
  {
    type: "BACKGROUND",
    title: "Background",
    description: "A light background check. Required for most long leases.",
  },
];

export const VERIFICATION_STATUS_COPY: Record<VerificationStatus, string> = {
  UNVERIFIED: "You have not started verification yet.",
  PENDING: "Submitted. A RentOps reviewer will look at this shortly.",
  IN_REVIEW: "A reviewer is checking your documents right now.",
  VERIFIED: "Your identity is verified. Partners see you as a trusted guest.",
  REJECTED: "Something did not match. Please review the note below and resubmit.",
  EXPIRED: "Your verification expired. Please resubmit a current document.",
};

export const REVIEW_STATUS_COPY: Record<ReviewStatus, string> = {
  PENDING: "Waiting for moderation. Reviews are published once checked.",
  PUBLISHED: "Live on the property page.",
  HIDDEN: "Hidden by moderators.",
  REMOVED: "Removed — it did not meet our review policy.",
};

export const SUPPORT_REASONS = [
  "Booking or reservation",
  "Payment or refund",
  "Property issue during a stay",
  "Inspection visit",
  "Verification",
  "Account & security",
  "Property partner conduct",
  "Something else",
];
