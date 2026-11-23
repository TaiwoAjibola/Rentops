# RentOps — Engineering Reference

Read this before writing any UI code. It documents every shared API that already
exists so you do not have to (and must not) reinvent it.

## Stack

- Next.js 15.5 App Router, React 19, TypeScript strict.
- Tailwind CSS v4 (CSS-first config — there is **no** `tailwind.config.js`).
- Prisma 6 + PostgreSQL. Prisma Client is imported from `@/lib/db` as `prisma`.
- lucide-react for icons. No other UI library exists — use `src/components/ui/*`.

## Money

Every monetary value is a **whole number of minor units** (kobo for NGN).
`150000` = ₦1,500.00. Values are typed `number`; columns are `double precision`
(int4's ₦21m ceiling is too low for annual leases) and always integral — always
convert user input with `majorToMinor`, never write a raw form value.

```ts
import { formatMoney } from "@/lib/money";
formatMoney(150000);            // "₦1,500.00"
formatMoney(150000, "NGN", { compact: true }); // "₦1,500"
```

**A price must never be rendered without its billing period.** Use
`<PriceTag amount currency basis />` / `<PriceInline />` from
`@/components/ui/price` or `RATE_BASIS_LABELS[basis]` from `@/lib/constants`.
`basis` is a Prisma `RateBasis`: `NIGHTLY | WEEKLY | MONTHLY | ANNUAL`.

## Dates

Booking dates are calendar dates normalised to UTC midnight.

```ts
import { parseDateInput, nightsBetween, formatDate, describeDuration, toISODate } from "@/lib/dates";
parseDateInput("2026-08-14"); // Date @ 00:00 UTC
```

All stay ranges are **half-open** `[checkIn, checkOut)`.

## Design tokens (Tailwind v4)

Colours: `brand-50…950` (deep emerald, primary), `gold-50…900` (accent),
`ink-50…950` (warm neutral text/borders), `surface`, `canvas`, `line`,
`line-strong`. Status: `success`, `warning`, `danger`, `info` (+ `-soft`
variants). Radius `rounded-xs…2xl`, shadows `shadow-xs…xl`.
Fonts: `font-display` (Fraunces, for headings) and default sans (Inter, body).
Layout helper: `.container-page` (max-width 1280, responsive padding).

Tone: modern, clean, premium, trustworthy, minimal but functional, strong
photography, clear pricing, intuitive navigation. No gradients-for-the-sake-of-it,
no gratuitous animation, no crowded screens. Mobile-first on the customer site.

## Existing UI components

- `@/components/ui/button` — `Button`, `ButtonLink`, `IconButton`, `buttonClass`.
  Variants: `primary | secondary | outline | ghost | danger | gold | inverse`;
  sizes `sm | md | lg | icon`.
- `@/components/ui/field` — `Label`, `Input`, `Textarea`, `Select`, `Checkbox`,
  `Field` (label/hint/error wrapper), `Fieldset`, `FormError`, `FormSuccess`.
- `@/components/ui/badge` — `Badge`, `StatusBadge` (tones from `@/lib/constants`).
- `@/components/ui/card` — `Card`, `CardHeader`, `CardBody`, `CardFooter`,
  `SectionHeading`, `Divider`.
- `@/components/ui/data` — `EmptyState`, `DataTable`/`TableRow`/`TableCell`,
  `Stat`, `InfoRow`, `Callout`.
- `@/components/ui/avatar` — `Avatar`, `Rating`, `ScoreBadge`.
- `@/components/ui/price` — `PriceTag`, `PriceInline`, `PriceBreakdown`.
- `@/components/ui/modal` — `Modal` (client).
- `@/components/brand/logo` — `Logo`, `LogoMark`.
- `@/components/layout/site-header` / `site-footer` — public chrome only.
- Status labels + tone maps live in `@/lib/constants`
  (`RESERVATION_STATUS_LABELS`, `PROPERTY_STATUS_TONES`, …). Always use them.

## Auth & access control

```ts
import { getCurrentUser, requireUser, requireSystemRole, requirePlatformStaff } from "@/lib/auth/session";
import { requirePartnerContext, requirePartnerPermission } from "@/lib/auth/session";

const user = await requireUser("/login");                    // customer
const admin = await requirePlatformStaff("finance.view");    // RentOps staff
const { partner, membership, permissions, can } = await requirePartnerContext();
await requirePartnerPermission("unit.manage");
```

Never let one partner reach another partner's data: always scope queries by
`partnerId` from the context object, never by a user-supplied id.

## Domain services (use these, do not re-implement)

- `@/lib/properties` — `searchProperties(params)`, `buildPropertyWhere`,
  `getPropertyBySlug`, `getPropertyBySlugAnyStatus`, `getFeaturedProperties`,
  `getRecentlyAddedProperties`, `getRecommendedProperties`, `getSpecialOffers`,
  `getPopularDestinations`, `getCategoryHighlights`, `getDestinationSummary`,
  `withAvailability`, `recalculatePropertyRate`, `parseSearchParams`,
  `searchParamsToQuery`, `PROPERTY_CARD_SELECT`, types `SearchParams`,
  `PropertyCard`, `PropertySort`, `PropertyDetail`.
- `@/lib/pricing` — `computeUnitStay`, `effectiveNightlyRate`, `nightlyForDate`,
  `buildQuote`, `PERIOD_NIGHTS`, types `Quote`, `UnitStayResult`.
- `@/lib/availability` — `isUnitAvailable`, `findAvailableUnits`,
  `getUnitCalendar`, `countAvailableUnits`.
- `@/lib/reservations` — `quoteBooking`, `createReservation`,
  `evaluateBookingRules`, `releaseExpiredHolds`, `approveReservation`,
  `declineReservation`, `cancelReservation`, `checkInReservation`,
  `checkOutReservation`, `ensureSettlement`, `computeCancellationOutcome`,
  `holdExpired`.
- `@/lib/payments/booking` — `startReservationPayment`, `markPaymentSuccess`,
  `markPaymentFailed`, `reconcilePayment`, `issueRefund`, `partnerStaffUserIds`.
- `@/lib/payments` — `initializePayment`, `verifyPayment`, `isTestDriver`.
- `@/lib/ledger` — `postLedgerEntry`, `getLedgerSummary`.
- `@/lib/notifications` — `notify`, `notifyMany`, `unreadCount`, `markAllRead`.
- `@/lib/audit` — `recordAudit`, `getAuditTrail`, `getRecentAudit`.
- `@/lib/settings` — `getFinancialConfig`, `getSetting`, `saveSetting`.
- `@/lib/due-diligence` — `evaluateDueDiligence`.
- `@/lib/storage` — `storeUpload(file, folder, { resourceType })`.
- `@/lib/reference` — `reservationReference`, `paymentReference`, etc.
- `@/lib/money`, `@/lib/dates`, `@/lib/utils` (`cn`, `slugify`, `initials`).
- `@/server/actions/auth` — `login`, `registerCustomer`, `logout`,
  `requestPasswordReset`, `resetPassword`, `updateCustomerProfile`.

## Conventions

1. Server Components by default. `"use client"` only where interaction demands it.
2. Mutations go through **Server Actions** defined in files named
   `src/server/actions/<area>-<thing>.ts` starting with `"use server"`.
   Forms use React 19 `useActionState(action, null)` in a small client
   component; pattern already used in `src/server/actions/auth.ts`.
   Actions return `{ error?: string; success?: string } | null`.
3. After a mutation call `revalidatePath(...)` and/or `redirect(...)`.
4. Audit every sensitive partner/admin/financial action with `recordAudit`.
5. Validate input. Use `getRequiredString`-style guards; never trust formData.
6. **No fake functionality.** Every button must do something real. If there is
   genuinely no data, render `<EmptyState>`. Seed/demo content must be
   unmistakably labelled.
7. Typed: no `any`, no `@ts-ignore`. Keep `tsc --noEmit` clean.
8. Files ≤ ~400 lines. Split large pages into components in your own
   `src/components/<area>/` folder.
9. Do **not** modify anything outside your assigned directories. Do not edit
   `src/lib/**`, `src/components/ui/**`, `src/components/layout/**`, `prisma/**`,
   or another team's routes. If you need a new shared primitive, put a local
   component inside your own `src/components/<area>/`.
10. Do not run `next build` or start dev servers — they conflict across teams.
11. Accessibility: label every input, use semantic landmarks, visible focus,
    alt text on images.

## Status vocabularies (from `@/lib/constants`)

- Property: `DRAFT, SUBMITTED, UNDER_REVIEW, ADDITIONAL_INFO_REQUIRED, APPROVED,
  REJECTED, SUSPENDED` — only `APPROVED` + `isActive` is publicly discoverable.
- Reservation: `DRAFT, PENDING_PAYMENT, PENDING_APPROVAL, CONFIRMED, CHECKED_IN,
  CHECKED_OUT, CANCELLED, REFUND_PENDING, REFUNDED, DISPUTED, EXPIRED`.
- Booking mode: `INSTANT` (pay → confirmed) and `APPROVAL` (request held 24h →
  partner approves → customer pays → confirmed).
- Never hardcode 7/30/180/365-day limits. Duration comes from the partner's own
  `minNights` / `maxNights` / `acceptedCheckInDays` settings.

## Financial truth

The gross customer payment is **not** RentOps revenue. Revenue is only the
`platformCommission` / `serviceCharge`. Use `getLedgerSummary()` for reporting;
partner money is `PARTNER_PAYABLE` less payouts.
