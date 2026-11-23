import type {
  BookingMode,
  DisputeStatus,
  InspectionStatus,
  LedgerEntryType,
  MemberStatus,
  PartnerMemberRole,
  PartnerType,
  PaymentStatus,
  PropertyStatus,
  PropertyVerificationLevel,
  RateBasis,
  ReservationStatus,
  ReviewStatus,
  SettlementStatus,
  SystemRole,
  VerificationStatus,
  VerificationType,
} from "@prisma/client";

export const SITE = {
  name: "RentOps",
  tagline: "Find your next stay. Book it. Lease it.",
  description:
    "RentOps is the accommodation marketplace connecting hotels, shortlet owners, serviced apartment operators and landlords with people who need a place to stay — for one night or for years.",
  supportEmail: "support@rentops.com",
  partnerEmail: "partners@rentops.com",
  phone: "+234 700 REMTOPS",
  address: "Lagos, Nigeria",
} as const;

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  INDIVIDUAL_OWNER: "Individual property owner",
  SHORTLET_OWNER: "Shortlet apartment owner",
  HOTEL: "Hotel",
  SERVICED_APARTMENT_OPERATOR: "Serviced apartment operator",
  PROPERTY_MANAGEMENT_COMPANY: "Property management company",
  PROPERTY_DEVELOPER: "Property developer",
  OTHER: "Other property business",
};

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  CUSTOMER: "Customer",
  REMTOPS_SUPPORT: "RentOps Support",
  REMTOPS_OPERATIONS: "RentOps Operations",
  REMTOPS_ADMIN: "RentOps Administrator",
  SUPER_ADMIN: "Super Administrator",
};

export const PARTNER_ROLE_LABELS: Record<PartnerMemberRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  FINANCE: "Finance",
  FRONT_DESK: "Front desk",
  VIEWER: "Viewer",
};

export const PARTNER_ROLE_DESCRIPTIONS: Record<PartnerMemberRole, string> = {
  OWNER: "Full control including settlement details and staff permissions.",
  MANAGER: "Manage properties, units, pricing, availability and reservations.",
  FINANCE: "View and action settlements, payouts and financial reports.",
  FRONT_DESK: "Handle arrivals, departures, calendars and guest messages.",
  VIEWER: "Read-only access to dashboards and reports.",
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  INVITED: "Invited",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REMOVED: "Removed",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ADDITIONAL_INFO_REQUIRED: "Additional information required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export const PROPERTY_STATUS_TONES: Record<PropertyStatus, StatusTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  ADDITIONAL_INFO_REQUIRED: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  PENDING_APPROVAL: "Pending owner approval",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
  EXPIRED: "Expired",
};

export const RESERVATION_STATUS_TONES: Record<ReservationStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING_PAYMENT: "warning",
  PENDING_APPROVAL: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "info",
  CHECKED_OUT: "neutral",
  CANCELLED: "danger",
  REFUND_PENDING: "warning",
  REFUNDED: "neutral",
  DISPUTED: "danger",
  EXPIRED: "neutral",
};

/** Statuses that hold inventory (must mirror the database trigger). */
export const INVENTORY_HOLDING_STATUSES: ReservationStatus[] = [
  "PENDING_PAYMENT",
  "PENDING_APPROVAL",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "DISPUTED",
  "REFUND_PENDING",
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCESS: "Successful",
  FAILED: "Failed",
  REVERSED: "Reversed",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  PENDING: "warning",
  SUCCESS: "success",
  FAILED: "danger",
  REVERSED: "neutral",
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  PENDING: "Pending",
  ON_HOLD: "On hold",
  SCHEDULED: "Scheduled",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const SETTLEMENT_STATUS_TONES: Record<SettlementStatus, StatusTone> = {
  PENDING: "warning",
  ON_HOLD: "neutral",
  SCHEDULED: "info",
  PROCESSING: "info",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

export const LEDGER_TYPE_LABELS: Record<LedgerEntryType, string> = {
  CUSTOMER_PAYMENT: "Customer payment",
  PARTNER_PAYABLE: "Partner payable",
  PLATFORM_COMMISSION: "Platform commission",
  PROCESSING_FEE: "Processing fee",
  SERVICE_FEE: "Service fee",
  PARTNER_PAYOUT: "Partner payout",
  REFUND: "Refund",
  CHARGEBACK: "Chargeback",
  ADJUSTMENT: "Adjustment",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Pending",
  IN_REVIEW: "In review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export const VERIFICATION_STATUS_TONES: Record<VerificationStatus, StatusTone> = {
  UNVERIFIED: "neutral",
  PENDING: "warning",
  IN_REVIEW: "info",
  VERIFIED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
};

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  IDENTITY: "Identity verification",
  ADDRESS: "Address verification",
  BACKGROUND: "Background check",
  BUSINESS: "Business verification",
  OWNERSHIP: "Ownership / listing authority",
  LOCATION: "Location confirmation",
  MEDIA: "Media review",
  INSPECTION: "Property inspection",
};

export const VERIFICATION_LEVEL_LABELS: Record<PropertyVerificationLevel, string> = {
  NONE: "Not verified",
  BASIC: "Basic",
  VERIFIED: "Verified",
  PREMIUM: "Premium verified",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: "Pending",
  PUBLISHED: "Published",
  HIDDEN: "Hidden",
  REMOVED: "Removed",
};

export const REVIEW_STATUS_TONES: Record<ReviewStatus, StatusTone> = {
  PENDING: "warning",
  PUBLISHED: "success",
  HIDDEN: "neutral",
  REMOVED: "danger",
};

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  REQUESTED: "Requested",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
};

export const INSPECTION_STATUS_TONES: Record<InspectionStatus, StatusTone> = {
  REQUESTED: "warning",
  SCHEDULED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
  DECLINED: "danger",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  AWAITING_PARTNER: "Awaiting partner",
  RESOLVED_CUSTOMER: "Resolved for customer",
  RESOLVED_PARTNER: "Resolved for partner",
  CLOSED: "Closed",
};

export const DISPUTE_STATUS_TONES: Record<DisputeStatus, StatusTone> = {
  OPEN: "danger",
  UNDER_REVIEW: "warning",
  AWAITING_PARTNER: "info",
  RESOLVED_CUSTOMER: "success",
  RESOLVED_PARTNER: "success",
  CLOSED: "neutral",
};

export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  INSTANT: "Instant booking",
  APPROVAL: "Approval required",
};

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export const RATE_BASIS_LABELS: Record<RateBasis, string> = {
  NIGHTLY: "per night",
  WEEKLY: "per week",
  MONTHLY: "per month",
  ANNUAL: "per year",
};

export const RATE_BASIS_UNIT_LABELS: Record<RateBasis, string> = {
  NIGHTLY: "night",
  WEEKLY: "week",
  MONTHLY: "month",
  ANNUAL: "year",
};

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

export const LAGOS_AREAS = [
  "Lekki Phase 1", "Lekki Phase 2", "Ikate", "Chevron", "Victoria Island", "Ikoyi",
  "Ajah", "Ikeja", "Yaba", "Surulere", "Maryland", "Magodo", "Gbagada", "Ilupeju",
  "Festac Town", "Banana Island", "Oniru", "Ikota", "Ogudu", "Opebi", "Allen Avenue",
  "Amuwo Odofin", "Apapa", "Garki", "Wuse II", "Maitama",
] as const;

/** Stay-length presets — suggestions only, never enforced restrictions. */
export const STAY_PRESETS = [
  { label: "Short stay", hint: "A few nights", nights: 3 },
  { label: "Week", hint: "7 nights", nights: 7 },
  { label: "Month", hint: "30 nights", nights: 30 },
  { label: "Six months", hint: "180 nights", nights: 180 },
  { label: "One year", hint: "365 nights", nights: 365 },
] as const;

export const SETTLEMENT_HOLD_DEFAULT_DAYS = 2;
export const DEFAULT_COMMISSION_RATE = 12; // percent
export const RESERVATION_HOLD_MINUTES = 20;
