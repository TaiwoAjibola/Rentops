import { PrismaClient, type MediaType, type SystemRole } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { majorToMinor } from "../src/lib/money";
import { effectiveNightlyRate } from "../src/lib/pricing";

const prisma = new PrismaClient();

/**
 * RentOps development seed.
 *
 * All money values below are written in Naira major units and converted once
 * with `majorToMinor` — the database stores integers in kobo.
 */

const NGN = "NGN";

// Verified Unsplash photography used for seeded listings (real property imagery).
const PHOTOS = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
  "https://images.unsplash.com/photo-1600121848594-d8644e57abab",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb",
  "https://images.unsplash.com/photo-1560185007-cde436f6a4d0",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
  "https://images.unsplash.com/photo-1449844908441-8829872d2607",
];

const photo = (index: number, w = 1400, h = 1000) =>
  `${PHOTOS[index % PHOTOS.length]}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

function naira(amount: number) {
  return majorToMinor(amount, NGN);
}

const day = (offset = 0) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
};

async function main() {
  console.log("Seeding RentOps…");

  // Start from a clean slate so re-seeding is deterministic.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservationUnit.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.inspectionRequest.deleteMany();
  await prisma.review.deleteMany();
  await prisma.savedProperty.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.verificationRecord.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.seasonalRate.deleteMany();
  await prisma.unitRate.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.roomCategory.deleteMany();
  await prisma.propertyVerificationCheck.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.propertyMedia.deleteMany();
  await prisma.property.deleteMany();
  await prisma.partnerBankAccount.deleteMany();
  await prisma.partnerDocument.deleteMany();
  await prisma.partnerInvitation.deleteMany();
  await prisma.partnerMember.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.cancellationPolicy.deleteMany();
  await prisma.location.deleteMany();
  await prisma.dueDiligencePolicy.deleteMany();
  await prisma.propertyCategory.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformSetting.deleteMany();

  // ---------------------------------------------------------------------------
  // Catalogue
  // ---------------------------------------------------------------------------

  const categories = await Promise.all(
    [
      { name: "Hotel", slug: "hotel", description: "Rooms and suites in hotels across Nigeria.", suggestedRateBasis: "NIGHTLY" },
      { name: "Shortlet apartment", slug: "shortlet-apartment", description: "Fully furnished apartments for short stays.", suggestedRateBasis: "NIGHTLY" },
      { name: "Serviced apartment", slug: "serviced-apartment", description: "Apartments with hotel-style services.", suggestedRateBasis: "MONTHLY" },
      { name: "Residential apartment", slug: "residential-apartment", description: "Long-let flats and maisonettes.", suggestedRateBasis: "ANNUAL" },
      { name: "House", slug: "house", description: "Detached and semi-detached houses.", suggestedRateBasis: "ANNUAL" },
      { name: "Villa", slug: "villa", description: "High-end villas and duplexes.", suggestedRateBasis: "MONTHLY" },
      { name: "Private room", slug: "private-room", description: "A private room within a home or shared apartment.", suggestedRateBasis: "NIGHTLY" },
    ].map((category, index) =>
      prisma.propertyCategory.create({
        data: { ...category, sortOrder: index, suggestedRateBasis: category.suggestedRateBasis as never },
      }),
    ),
  );

  const category = (slug: string) => categories.find((entry) => entry.slug === slug)!;

  const amenityData = [
    { name: "Air conditioning", slug: "air-conditioning", group: "Comfort" },
    { name: "Free Wi-Fi", slug: "free-wifi", group: "Connectivity" },
    { name: "24-hour power", slug: "generator", group: "Utilities" },
    { name: "Swimming pool", slug: "swimming-pool", group: "Recreation" },
    { name: "Gym", slug: "gym", group: "Recreation" },
    { name: "Secure parking", slug: "parking", group: "Transport" },
    { name: "24-hour security", slug: "security", group: "Safety" },
    { name: "CCTV", slug: "cctv", group: "Safety" },
    { name: "Fully fitted kitchen", slug: "kitchen", group: "Comfort" },
    { name: "Washing machine", slug: "washing-machine", group: "Comfort" },
    { name: "Housekeeping", slug: "housekeeping", group: "Services" },
    { name: "Airport pickup", slug: "airport-pickup", group: "Services" },
    { name: "Restaurant", slug: "restaurant", group: "Dining" },
    { name: "Bar / lounge", slug: "bar", group: "Dining" },
    { name: "Elevator", slug: "elevator", group: "Access" },
    { name: "Balcony", slug: "balcony", group: "Outdoor" },
    { name: "Garden", slug: "garden", group: "Outdoor" },
    { name: "Water heater", slug: "water-heater", group: "Comfort" },
    { name: "Workspace desk", slug: "workspace", group: "Connectivity" },
    { name: "Smart TV", slug: "smart-tv", group: "Entertainment" },
    { name: "Borehole water", slug: "borehole", group: "Utilities" },
    { name: "Fire extinguisher", slug: "fire-extinguisher", group: "Safety" },
    { name: "Pet friendly", slug: "pet-friendly", group: "Policies" },
    { name: "Wheelchair accessible", slug: "wheelchair-accessible", group: "Access" },
  ];

  await prisma.amenity.createMany({ data: amenityData });
  const amenities = await prisma.amenity.findMany();

  const locations = [
    { name: "Lekki Phase 1", city: "Lagos", state: "Lagos", slug: "lekki-phase-1", popular: true, latitude: 6.4301, longitude: 3.4588, imageUrl: photo(0, 800, 600) },
    { name: "Victoria Island", city: "Lagos", state: "Lagos", slug: "victoria-island", popular: true, latitude: 6.4281, longitude: 3.4219, imageUrl: photo(1, 800, 600) },
    { name: "Ikoyi", city: "Lagos", state: "Lagos", slug: "ikoyi", popular: true, latitude: 6.4550, longitude: 3.4350, imageUrl: photo(2, 800, 600) },
    { name: "Ikeja", city: "Lagos", state: "Lagos", slug: "ikeja", popular: true, latitude: 6.6018, longitude: 3.3515, imageUrl: photo(3, 800, 600) },
    { name: "Ajah", city: "Lagos", state: "Lagos", slug: "ajah", popular: true, latitude: 6.4698, longitude: 3.5681, imageUrl: photo(4, 800, 600) },
    { name: "Yaba", city: "Lagos", state: "Lagos", slug: "yaba", popular: true, latitude: 6.5158, longitude: 3.3714, imageUrl: photo(5, 800, 600) },
    { name: "Banana Island", city: "Lagos", state: "Lagos", slug: "banana-island", popular: true, latitude: 6.4420, longitude: 3.4210, imageUrl: photo(6, 800, 600) },
    { name: "Surulere", city: "Lagos", state: "Lagos", slug: "surulere", popular: true, latitude: 6.4961, longitude: 3.3521, imageUrl: photo(7, 800, 600) },
  ];

  await prisma.location.createMany({ data: locations.map((item, index) => ({ ...item, sortOrder: index })) as never });

  await prisma.dueDiligencePolicy.createMany({
    data: [
      {
        name: "30 days or more",
        minDays: 30,
        recommendationText: "Because this stay is a month or longer, we recommend identity verification and a signed occupancy agreement before you proceed.",
        verificationTypes: ["IDENTITY", "ADDRESS"],
        mandatory: false,
        chargeMinor: 0,
        sortOrder: 1,
      },
      {
        name: "90 days or more",
        minDays: 90,
        recommendationText: "For stays of three months or longer, RentOps recommends identity and background verification plus references. This protects both parties for a longer commitment.",
        verificationTypes: ["IDENTITY", "BACKGROUND", "ADDRESS"],
        mandatory: false,
        chargeMinor: naira(5000),
        sortOrder: 2,
      },
      {
        name: "One year or more",
        minDays: 365,
        recommendationText: "Annual tenancies require verified identity, address confirmation and a background check before the lease can be confirmed.",
        verificationTypes: ["IDENTITY", "BACKGROUND", "ADDRESS"],
        mandatory: true,
        chargeMinor: naira(15000),
        sortOrder: 3,
      },
    ],
  });

  const flexibleCancel = await prisma.cancellationPolicy.create({
    data: {
      name: "Flexible",
      description: "Full refund up to 48 hours before check-in.",
      rules: [{ hoursBeforeCheckIn: 48, refundPercent: 100 }],
      isDefault: true,
    },
  });

  const moderateCancel = await prisma.cancellationPolicy.create({
    data: {
      name: "Moderate",
      description: "Full refund up to 5 days before check-in, 50% within 48 hours.",
      rules: [
        { hoursBeforeCheckIn: 120, refundPercent: 100 },
        { hoursBeforeCheckIn: 48, refundPercent: 50 },
      ],
    },
  });

  await prisma.platformSetting.create({
    data: {
      key: "finance.config",
      group: "finance",
      description: "Commission, fees and settlement configuration.",
      value: {
        commissionRate: 12,
        serviceFeeRate: 0,
        processingFeeRate: 1.5,
        processingFeeFlat: 0,
        processingFeeBearer: "PLATFORM",
        currency: "NGN",
        settlementHoldDays: 2,
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  const passwordHash = await hashPassword("Password123!");

  async function makeUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    systemRole?: SystemRole;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        passwordHash,
        systemRole: data.systemRole ?? "CUSTOMER",
        referralCode: `RT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        emailVerifiedAt: new Date(),
        profile: { create: {} },
        notificationPrefs: { create: {} },
      },
    });
  }

  const superAdmin = await makeUser({ email: "admin@rentops.test", firstName: "Ada", lastName: "Okonkwo", systemRole: "SUPER_ADMIN" });
  await makeUser({ email: "ops@rentops.test", firstName: "Tunde", lastName: "Bakare", systemRole: "REMTOPS_OPERATIONS" });
  await makeUser({ email: "support@rentops.test", firstName: "Ngozi", lastName: "Eze", systemRole: "REMTOPS_SUPPORT" });

  const customers = await Promise.all(
    [
      { email: "chidi@example.com", firstName: "Chidi", lastName: "Okafor", phone: "+2348011111111" },
      { email: "amara@example.com", firstName: "Amara", lastName: "Nwosu", phone: "+2348022222222" },
      { email: "bola@example.com", firstName: "Bola", lastName: "Adeyemi", phone: "+2348033333333" },
      { email: "funmi@example.com", firstName: "Funmi", lastName: "Adeleke", phone: "+2348044444444" },
      { email: "emeka@example.com", firstName: "Emeka", lastName: "Chukwu", phone: "+2348055555555" },
      { email: "alex@example.com", firstName: "Alex", lastName: "Morgan", phone: "+447700900123" },
    ].map((customer) => makeUser(customer)),
  );

  // ---------------------------------------------------------------------------
  // Partners
  // ---------------------------------------------------------------------------

  type PartnerSeed = {
    slug: string;
    type: string;
    businessName: string;
    legalName?: string;
    registrationNumber?: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    addressLine: string;
    description: string;
    owner: { email: string; firstName: string; lastName: string };
  };

  const partnerSeeds: PartnerSeed[] = [
    {
      slug: "grand-residences-hotel",
      type: "HOTEL",
      businessName: "Grand Residences Hotel",
      legalName: "Grand Residences Hotels Ltd",
      registrationNumber: "RC-1029384",
      email: "reservations@grandresidences.test",
      phone: "+2347011111111",
      city: "Lagos",
      state: "Lagos",
      addressLine: "12 Admiralty Way, Lekki Phase 1",
      description: "A 42-room business hotel in the heart of Lekki with a rooftop pool and two restaurants.",
      owner: { email: "owner.grand@rentops.test", firstName: "Ibrahim", lastName: "Musa" },
    },
    {
      slug: "lekki-shortlets",
      type: "SHORTLET_OWNER",
      businessName: "Lekki Shortlets",
      legalName: "Lekki Shortlets Ventures",
      email: "hello@lekkishortlets.test",
      phone: "+2347022222222",
      city: "Lagos",
      state: "Lagos",
      addressLine: "8 Ologolo Crescent, Lekki Phase 2",
      description: "Designer serviced shortlet apartments across Lekki, managed by a small local team.",
      owner: { email: "owner.shortlets@rentops.test", firstName: "Temi", lastName: "Ogundipe" },
    },
    {
      slug: "harmony-serviced-apartments",
      type: "SERVICED_APARTMENT_OPERATOR",
      businessName: "Harmony Serviced Apartments",
      legalName: "Harmony Property Partners Ltd",
      registrationNumber: "RC-7781120",
      email: "bookings@harmony.test",
      phone: "+2347033333333",
      city: "Lagos",
      state: "Lagos",
      addressLine: "4 Glover Road, Ikoyi",
      description: "Extended-stay serviced apartments for corporate travellers and relocating families.",
      owner: { email: "owner.harmony@rentops.test", firstName: "Kemi", lastName: "Ajayi" },
    },
    {
      slug: "ibadan-developments",
      type: "PROPERTY_DEVELOPER",
      businessName: "Ibadan Developments",
      legalName: "Ibadan Developments Ltd",
      registrationNumber: "RC-5500921",
      email: "sales@ibadandev.test",
      phone: "+2347044444444",
      city: "Ikeja",
      state: "Lagos",
      addressLine: "19 Awolowo Road, Ikoyi",
      description: "Residential lettings across newly completed developments in Lagos and Oyo State.",
      owner: { email: "owner.devco@rentops.test", firstName: "Segun", lastName: "Adeleke" },
    },
    {
      slug: "coastal-property-management",
      type: "PROPERTY_MANAGEMENT_COMPANY",
      businessName: "Coastal Property Management",
      legalName: "Coastal PM Services Ltd",
      registrationNumber: "RC-2211445",
      email: "ops@coastalpm.test",
      phone: "+2347055555555",
      city: "Lagos",
      state: "Lagos",
      addressLine: "31 Akin Adesola Street, Victoria Island",
      description: "Managing villas and apartments along the Lagos coastline for private owners.",
      owner: { email: "owner.coastal@rentops.test", firstName: "Yemi", lastName: "Balogun" },
    },
  ];

  const partners: Record<string, Awaited<ReturnType<typeof import("@prisma/client").PrismaClient.prototype.partner.create>>> = {};

  for (const seed of partnerSeeds) {
    const owner = await makeUser({
      email: seed.owner.email,
      firstName: seed.owner.firstName,
      lastName: seed.owner.lastName,
      phone: seed.phone,
    });

    const partner = await prisma.partner.create({
      data: {
        slug: seed.slug,
        type: seed.type as never,
        businessName: seed.businessName,
        legalName: seed.legalName ?? null,
        registrationNumber: seed.registrationNumber ?? null,
        email: seed.email,
        phone: seed.phone,
        whatsapp: seed.phone,
        city: seed.city,
        state: seed.state,
        country: "Nigeria",
        addressLine: seed.addressLine,
        description: seed.description,
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedById: superAdmin.id,
        onboardingStep: "COMPLETE",
        payoutModel: "PLATFORM_COLLECTED",
        settlementHoldDays: 2,
        members: {
          create: {
            userId: owner.id,
            role: "OWNER",
            status: "ACTIVE",
            jobTitle: "Owner",
          },
        },
        bankAccounts: {
          create: {
            bankName: "First Bank of Nigeria",
            bankCode: "011",
            accountNumber: "30" + Math.floor(10000000 + Math.random() * 89999999).toString(),
            accountName: seed.businessName,
            isPrimary: true,
            verifiedAt: new Date(),
          },
        },
      },
    });

    // A front-desk operator so the permission model is demonstrable.
    const staff = await makeUser({
      email: `frontdesk.${seed.slug}@rentops.test`,
      firstName: "Reception",
      lastName: seed.businessName.split(" ")[0] ?? "Staff",
    });
    await prisma.partnerMember.create({
      data: { partnerId: partner.id, userId: staff.id, role: "FRONT_DESK", status: "ACTIVE", jobTitle: "Front desk" },
    });

    await prisma.partnerDocument.create({
      data: {
        partnerId: partner.id,
        type: "BUSINESS",
        label: "Corporate Affairs Commission certificate",
        fileUrl: photo(10, 800, 600),
        status: "VERIFIED",
        reviewedById: superAdmin.id,
        reviewedAt: new Date(),
      },
    });

    partners[seed.slug] = partner;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  type UnitSeed = {
    label: string;
    categorySlug?: string;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    nightly?: number;
    weekly?: number;
    monthly?: number;
    annual?: number;
    weekendNightly?: number;
    cleaningFee?: number;
    serviceCharge?: number;
    extraGuestFee?: number;
    extraGuestThreshold?: number;
  };

  type PropertySeed = {
    slug: string;
    partnerSlug: string;
    categorySlug: string;
    name: string;
    headline: string;
    city: string;
    area: string;
    address: string;
    latitude: number;
    longitude: number;
    description: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    status: "APPROVED" | "SUBMITTED" | "DRAFT";
    featured?: boolean;
    bookingMode?: "INSTANT" | "APPROVAL";
    minNights?: number;
    maxNights?: number;
    minNoticeHours?: number;
    advanceBookingDays?: number;
    dueDiligenceThresholdDays?: number;
    verificationLevel?: "VERIFIED" | "PREMIUM" | "BASIC" | "NONE";
    badge?: boolean;
    cancellationPolicyId?: string;
    amenitySlugs: string[];
    videoUrl?: string;
    virtualTour?: boolean;
    units: UnitSeed[];
    seasonal?: { unitLabel: string; name: string; nights: [number, number]; nightly: number; promotion?: boolean; label?: string }[];
  };

  const propertySeeds: PropertySeed[] = [
    {
      slug: "grand-residences-hotel-lekki",
      partnerSlug: "grand-residences-hotel",
      categorySlug: "hotel",
      name: "Grand Residences Hotel, Lekki",
      headline: "Rooftop pool, two restaurants and 42 contemporary rooms in Lekki Phase 1",
      city: "Lagos",
      area: "Lekki Phase 1",
      address: "12 Admiralty Way, Lekki Phase 1, Lagos",
      latitude: 6.4301,
      longitude: 3.4588,
      description:
        "Grand Residences is a full-service business hotel five minutes from the Lekki-Ikoyi link bridge. Rooms are soundproofed with blackout curtains, work desks and fast fibre. Guests have access to a rooftop pool, a 24-hour gym, two restaurants and 340 secure parking bays. The hotel accepts bookings from a single night to several months, with reduced weekly and monthly rates for extended stays.",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 3,
      status: "APPROVED",
      featured: true,
      bookingMode: "INSTANT",
      minNights: 1,
      maxNights: 180,
      minNoticeHours: 0,
      advanceBookingDays: 365,
      verificationLevel: "PREMIUM",
      badge: true,
      cancellationPolicyId: flexibleCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "swimming-pool", "gym", "parking", "security", "cctv", "restaurant", "bar", "elevator", "housekeeping", "smart-tv", "workspace", "fire-extinguisher"],
      videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      virtualTour: true,
      units: [
        { label: "Superior King 101", categorySlug: "superior-king", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 98000, weekly: 590000, monthly: 2100000, weekendNightly: 115000, cleaningFee: 15000, serviceCharge: 0, extraGuestThreshold: 2 },
        { label: "Superior King 102", categorySlug: "superior-king", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 98000, weekly: 590000, monthly: 2100000, weekendNightly: 115000, cleaningFee: 15000, serviceCharge: 0, extraGuestThreshold: 2 },
        { label: "Superior King 103", categorySlug: "superior-king", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 98000, weekly: 590000, monthly: 2100000, weekendNightly: 115000, cleaningFee: 15000, serviceCharge: 0, extraGuestThreshold: 2 },
        { label: "Executive Suite 201", categorySlug: "executive-suite", maxGuests: 3, bedrooms: 1, bathrooms: 1, nightly: 165000, weekly: 990000, monthly: 3400000, weekendNightly: 185000, cleaningFee: 20000, serviceCharge: 0, extraGuestThreshold: 2, extraGuestFee: 18000 },
        { label: "Executive Suite 202", categorySlug: "executive-suite", maxGuests: 3, bedrooms: 1, bathrooms: 1, nightly: 165000, weekly: 990000, monthly: 3400000, weekendNightly: 185000, cleaningFee: 20000, serviceCharge: 0, extraGuestThreshold: 2, extraGuestFee: 18000 },
      ],
      seasonal: [
        { unitLabel: "Superior King 101", name: "Festive season", nights: [0, 21], nightly: 128000, promotion: true, label: "Peak season rate" },
      ],
    },
    {
      slug: "harmony-serviced-apartments-ikoyi",
      partnerSlug: "harmony-serviced-apartments",
      categorySlug: "serviced-apartment",
      name: "Harmony Serviced Apartments, Ikoyi",
      headline: "Extended-stay two and three bedroom apartments with weekly housekeeping",
      city: "Lagos",
      area: "Ikoyi",
      address: "4 Glover Road, Ikoyi, Lagos",
      latitude: 6.455,
      longitude: 3.435,
      description:
        "Harmony provides fully furnished serviced apartments designed for stays of a week to a year. Each apartment has a fitted kitchen, laundry, fibre internet, backup power and a dedicated workspace. Weekly housekeeping, linen changes and 24-hour front desk support are included. Weekly and monthly rates are configured directly by the operator, and stays beyond three months trigger RentOps' recommended additional verification.",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      status: "APPROVED",
      featured: true,
      bookingMode: "INSTANT",
      minNights: 7,
      maxNights: 365,
      minNoticeHours: 24,
      advanceBookingDays: 400,
      dueDiligenceThresholdDays: 90,
      verificationLevel: "VERIFIED",
      badge: true,
      cancellationPolicyId: moderateCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "kitchen", "washing-machine", "housekeeping", "parking", "security", "cctv", "elevator", "balcony", "water-heater", "workspace", "smart-tv", "fire-extinguisher"],
      units: [
        { label: "Apartment 2A — 2 bedroom", categorySlug: "two-bedroom", maxGuests: 4, bedrooms: 2, bathrooms: 2, weekly: 780000, monthly: 2800000, nightly: 140000, cleaningFee: 45000, serviceCharge: 30000, extraGuestThreshold: 4 },
        { label: "Apartment 2B — 2 bedroom", categorySlug: "two-bedroom", maxGuests: 4, bedrooms: 2, bathrooms: 2, weekly: 780000, monthly: 2800000, nightly: 140000, cleaningFee: 45000, serviceCharge: 30000, extraGuestThreshold: 4 },
        { label: "Apartment 3A — 3 bedroom", categorySlug: "three-bedroom", maxGuests: 6, bedrooms: 3, bathrooms: 3, weekly: 1150000, monthly: 4100000, nightly: 195000, cleaningFee: 60000, serviceCharge: 40000, extraGuestThreshold: 6, extraGuestFee: 20000 },
      ],
      seasonal: [
        { unitLabel: "Apartment 2A — 2 bedroom", name: "Corporate relocation promo", nights: [10, 70], nightly: 112000, promotion: true, label: "15% off long corporate stays" },
      ],
    },
    {
      slug: "azure-shortlet-lekki-phase-1",
      partnerSlug: "lekki-shortlets",
      categorySlug: "shortlet-apartment",
      name: "Azure Shortlet, Lekki Phase 1",
      headline: "Designer one-bedroom with pool access and rooftop lounge",
      city: "Lagos",
      area: "Lekki Phase 1",
      address: "27 Admiralty Road, Lekki Phase 1, Lagos",
      latitude: 6.4321,
      longitude: 3.4602,
      description:
        "A bright, design-led one bedroom apartment minutes from restaurants and nightlife. The building has a pool, rooftop lounge, gym, 24-hour power and secure parking. Perfect for weekend breaks and short work trips, with discounted weekly rates.",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      status: "APPROVED",
      featured: true,
      bookingMode: "INSTANT",
      minNights: 2,
      maxNights: 90,
      verificationLevel: "VERIFIED",
      badge: true,
      cancellationPolicyId: flexibleCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "swimming-pool", "gym", "parking", "security", "cctv", "kitchen", "washing-machine", "housekeeping", "balcony", "smart-tv", "water-heater", "workspace"],
      videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      units: [
        { label: "Azure 1B", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 62000, weekly: 370000, monthly: 1350000, weekendNightly: 72000, cleaningFee: 12000, serviceCharge: 0 },
      ],
    },
    {
      slug: "coastal-villa-banana-island",
      partnerSlug: "coastal-property-management",
      categorySlug: "villa",
      name: "Coastal Villa, Banana Island",
      headline: "Five bedroom waterfront villa with private chef and boat berth",
      city: "Lagos",
      area: "Banana Island",
      address: "5 Banana Island Road, Ikoyi, Lagos",
      latitude: 6.442,
      longitude: 3.421,
      description:
        "A fully staffed waterfront villa with five en-suite bedrooms, an infinity pool, a private cinema, a gym and a boat berth. Staff include a chef, housekeeper and security detail. Available for short stays and monthly lets; long lets require the RentOps verification package.",
      bedrooms: 5,
      bathrooms: 6,
      maxGuests: 10,
      status: "APPROVED",
      featured: true,
      bookingMode: "APPROVAL",
      minNights: 3,
      maxNights: 365,
      dueDiligenceThresholdDays: 90,
      verificationLevel: "PREMIUM",
      badge: true,
      cancellationPolicyId: moderateCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "swimming-pool", "gym", "parking", "security", "cctv", "kitchen", "washing-machine", "housekeeping", "airport-pickup", "garden", "balcony", "water-heater", "smart-tv", "borehole", "fire-extinguisher"],
      virtualTour: true,
      units: [
        { label: "Villa — whole property", maxGuests: 10, bedrooms: 5, bathrooms: 6, nightly: 850000, weekly: 4900000, monthly: 17500000, annual: 190000000, cleaningFee: 150000, serviceCharge: 150000, extraGuestThreshold: 10, extraGuestFee: 55000 },
      ],
    },
    {
      slug: "harmony-residence-lekki-phase-2",
      partnerSlug: "harmony-serviced-apartments",
      categorySlug: "serviced-apartment",
      name: "Harmony Residence, Lekki Phase 2",
      headline: "Quiet serviced studios with co-working lounge",
      city: "Lagos",
      area: "Lekki Phase 2",
      address: "14 Chevron Drive, Lekki Phase 2, Lagos",
      latitude: 6.4412,
      longitude: 3.5001,
      description:
        "Compact serviced studios built for remote workers: fast internet, a co-working lounge, backup power and weekly housekeeping. Nightly, weekly and monthly pricing available.",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      status: "APPROVED",
      bookingMode: "INSTANT",
      minNights: 3,
      maxNights: 365,
      verificationLevel: "VERIFIED",
      badge: true,
      cancellationPolicyId: flexibleCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "kitchen", "housekeeping", "security", "cctv", "workspace", "smart-tv", "elevator", "water-heater", "fire-extinguisher"],
      units: [
        { label: "Studio S1", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 55000, weekly: 330000, monthly: 1200000, cleaningFee: 12000, serviceCharge: 0 },
        { label: "Studio S2", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 55000, weekly: 330000, monthly: 1200000, cleaningFee: 12000, serviceCharge: 0 },
        { label: "Studio S3", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 55000, weekly: 330000, monthly: 1200000, cleaningFee: 12000, serviceCharge: 0 },
      ],
    },
    {
      slug: "maple-court-residential-apartments-ikeja",
      partnerSlug: "ibadan-developments",
      categorySlug: "residential-apartment",
      name: "Maple Court Apartments, Ikeja",
      headline: "Three bedroom flats available for annual tenancy",
      city: "Lagos",
      area: "Ikeja",
      address: "9 Obafemi Awolowo Way, Ikeja, Lagos",
      latitude: 6.6018,
      longitude: 3.3515,
      description:
        "Well-maintained three bedroom flats in a gated compound with 24-hour power backup, borehole water, parking and a playground. Annual tenancy. Applications include references and identity verification, and physical inspection is arranged through RentOps.",
      bedrooms: 3,
      bathrooms: 3,
      maxGuests: 6,
      status: "APPROVED",
      bookingMode: "APPROVAL",
      minNights: 365,
      maxNights: 730,
      dueDiligenceThresholdDays: 90,
      verificationLevel: "VERIFIED",
      badge: true,
      cancellationPolicyId: moderateCancel.id,
      amenitySlugs: ["generator", "parking", "security", "cctv", "kitchen", "garden", "borehole", "water-heater", "air-conditioning", "washing-machine", "free-wifi", "fire-extinguisher"],
      units: [
        { label: "Flat A1", maxGuests: 6, bedrooms: 3, bathrooms: 3, monthly: 950000, annual: 10500000, cleaningFee: 0, serviceCharge: 0 },
        { label: "Flat A2", maxGuests: 6, bedrooms: 3, bathrooms: 3, monthly: 950000, annual: 10500000, cleaningFee: 0, serviceCharge: 0 },
        { label: "Flat B1", maxGuests: 6, bedrooms: 3, bathrooms: 3, monthly: 920000, annual: 10200000, cleaningFee: 0, serviceCharge: 0 },
      ],
    },
    {
      slug: "the-palm-house-ikoyi",
      partnerSlug: "coastal-property-management",
      categorySlug: "house",
      name: "The Palm House, Ikoyi",
      headline: "Four bedroom detached house with garden and staff quarters",
      city: "Lagos",
      area: "Ikoyi",
      address: "22 Bourdillon Road, Ikoyi, Lagos",
      latitude: 6.4601,
      longitude: 3.4301,
      description:
        "A detached four bedroom family house on a quiet Ikoyi street, with mature gardens, staff quarters, a generator, borehole and covered parking for four cars. Available for medium and long lets.",
      bedrooms: 4,
      bathrooms: 4,
      maxGuests: 8,
      status: "APPROVED",
      bookingMode: "APPROVAL",
      minNights: 90,
      maxNights: 1095,
      dueDiligenceThresholdDays: 90,
      verificationLevel: "VERIFIED",
      cancellationPolicyId: moderateCancel.id,
      amenitySlugs: ["generator", "parking", "security", "cctv", "kitchen", "garden", "borehole", "water-heater", "air-conditioning", "washing-machine", "balcony", "fire-extinguisher"],
      units: [
        { label: "Whole house", maxGuests: 8, bedrooms: 4, bathrooms: 4, monthly: 3200000, annual: 36000000, cleaningFee: 0, serviceCharge: 0 },
      ],
    },
    {
      slug: "yaba-private-room-studio",
      partnerSlug: "lekki-shortlets",
      categorySlug: "private-room",
      name: "Yaba Private Room & Studio",
      headline: "Affordable private room with shared kitchen, five minutes to Yaba Tech",
      city: "Lagos",
      area: "Yaba",
      address: "3 Herbert Macaulay Way, Yaba, Lagos",
      latitude: 6.5158,
      longitude: 3.3714,
      description:
        "A clean, lockable private room within a shared apartment, ideal for students, interns and short work placements. Shared kitchen and lounge, weekly cleaning, power backup and good transport links.",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 1,
      status: "APPROVED",
      bookingMode: "INSTANT",
      minNights: 1,
      maxNights: 180,
      verificationLevel: "BASIC",
      cancellationPolicyId: flexibleCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "kitchen", "washing-machine", "housekeeping", "security", "workspace", "water-heater", "borehole"],
      units: [
        { label: "Room 1", maxGuests: 1, bedrooms: 1, bathrooms: 1, nightly: 21000, weekly: 125000, monthly: 460000, cleaningFee: 5000, serviceCharge: 0 },
        { label: "Room 2", maxGuests: 1, bedrooms: 1, bathrooms: 1, nightly: 21000, weekly: 125000, monthly: 460000, cleaningFee: 5000, serviceCharge: 0 },
      ],
    },
    {
      slug: "sunset-marina-apartments-vi",
      partnerSlug: "coastal-property-management",
      categorySlug: "serviced-apartment",
      name: "Sunset Marina Apartments, Victoria Island",
      headline: "Sea-facing serviced apartments with concierge",
      city: "Lagos",
      area: "Victoria Island",
      address: "7 Akin Adesola Street, Victoria Island, Lagos",
      latitude: 6.4281,
      longitude: 3.4219,
      description:
        "Sea-facing apartments with a concierge desk, gym, pool and secure parking. Walking distance to the business district and waterfront restaurants.",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      status: "APPROVED",
      featured: true,
      bookingMode: "INSTANT",
      minNights: 2,
      maxNights: 365,
      verificationLevel: "VERIFIED",
      badge: true,
      cancellationPolicyId: flexibleCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "swimming-pool", "gym", "parking", "security", "cctv", "kitchen", "washing-machine", "housekeeping", "elevator", "balcony", "water-heater", "smart-tv", "workspace", "fire-extinguisher"],
      units: [
        { label: "Marina 4C — 2 bedroom", maxGuests: 4, bedrooms: 2, bathrooms: 2, nightly: 145000, weekly: 850000, monthly: 3100000, weekendNightly: 165000, cleaningFee: 40000, serviceCharge: 25000 },
        { label: "Marina 5A — 1 bedroom", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 98000, weekly: 580000, monthly: 2050000, weekendNightly: 110000, cleaningFee: 30000, serviceCharge: 20000 },
      ],
      seasonal: [
        { unitLabel: "Marina 4C — 2 bedroom", name: "Shoulder-season offer", nights: [30, 90], nightly: 118000, promotion: true, label: "Save on longer stays" },
      ],
    },
    {
      slug: "ocean-view-duplex-ajah",
      partnerSlug: "ibadan-developments",
      categorySlug: "house",
      name: "Ocean View Duplex, Ajah",
      headline: "Five bedroom duplex with ocean views and a private pool",
      city: "Lagos",
      area: "Ajah",
      address: "Addo Road, Ajah, Lagos",
      latitude: 6.4698,
      longitude: 3.5681,
      description:
        "A newly completed five bedroom duplex with ocean views, a private pool, gym room, staff quarters and parking for six cars. Available for short stays or annual letting.",
      bedrooms: 5,
      bathrooms: 5,
      maxGuests: 10,
      status: "APPROVED",
      bookingMode: "APPROVAL",
      minNights: 5,
      maxNights: 730,
      dueDiligenceThresholdDays: 90,
      verificationLevel: "VERIFIED",
      cancellationPolicyId: moderateCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "swimming-pool", "gym", "parking", "security", "cctv", "kitchen", "washing-machine", "housekeeping", "garden", "balcony", "water-heater", "smart-tv", "borehole", "fire-extinguisher"],
      units: [
        { label: "Whole duplex", maxGuests: 10, bedrooms: 5, bathrooms: 5, nightly: 420000, weekly: 2450000, monthly: 8200000, annual: 90000000, cleaningFee: 90000, serviceCharge: 80000, extraGuestThreshold: 10, extraGuestFee: 35000 },
      ],
    },
    {
      slug: "grand-residences-annex-surulere",
      partnerSlug: "grand-residences-hotel",
      categorySlug: "hotel",
      name: "Grand Residences Annex, Surulere",
      headline: "Budget-friendly rooms near the National Stadium",
      city: "Lagos",
      area: "Surulere",
      address: "15 Ogunlana Drive, Surulere, Lagos",
      latitude: 6.4961,
      longitude: 3.3521,
      description:
        "A value wing of Grand Residences offering compact rooms with air conditioning, Wi-Fi, power backup and a simple breakfast service. Popular with travellers on short assignments.",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      status: "SUBMITTED",
      bookingMode: "INSTANT",
      minNights: 1,
      maxNights: 120,
      verificationLevel: "NONE",
      cancellationPolicyId: flexibleCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "parking", "security", "cctv", "housekeeping", "restaurant", "smart-tv", "water-heater", "fire-extinguisher"],
      units: [
        { label: "Standard Room 01", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 38000, weekly: 225000, monthly: 820000, cleaningFee: 8000, serviceCharge: 0 },
        { label: "Standard Room 02", maxGuests: 2, bedrooms: 1, bathrooms: 1, nightly: 38000, weekly: 225000, monthly: 820000, cleaningFee: 8000, serviceCharge: 0 },
      ],
    },
    {
      slug: "crescent-bay-shortlet-lekki",
      partnerSlug: "lekki-shortlets",
      categorySlug: "shortlet-apartment",
      name: "Crescent Bay Shortlet, Lekki Phase 1",
      headline: "Penthouse apartment with panoramic lagoon views",
      city: "Lagos",
      area: "Lekki Phase 1",
      address: "2 Crescent Bay Road, Lekki Phase 1, Lagos",
      latitude: 6.4351,
      longitude: 3.4551,
      description:
        "A top-floor penthouse with panoramic lagoon views, three bedrooms, a private terrace, gym access and a dedicated housekeeper between 9am and 5pm.",
      bedrooms: 3,
      bathrooms: 3,
      maxGuests: 6,
      status: "SUBMITTED" as never,
      bookingMode: "INSTANT",
      minNights: 2,
      maxNights: 180,
      verificationLevel: "NONE",
      cancellationPolicyId: flexibleCancel.id,
      amenitySlugs: ["air-conditioning", "free-wifi", "generator", "kitchen", "washing-machine", "housekeeping", "security", "cctv", "balcony", "water-heater", "smart-tv", "parking", "elevator", "fire-extinguisher"],
      units: [
        { label: "Penthouse 9A", maxGuests: 6, bedrooms: 3, bathrooms: 3, nightly: 195000, weekly: 1150000, monthly: 4200000, weekendNightly: 220000, cleaningFee: 55000, serviceCharge: 0, extraGuestThreshold: 6, extraGuestFee: 22000 },
      ],
    },
  ];

  const createdProperties: Record<string, string> = {};

  for (const [index, seed] of propertySeeds.entries()) {
    const partner = partners[seed.partnerSlug];
    if (!partner) continue;

    const property = await prisma.property.create({
      data: {
        slug: seed.slug,
        partnerId: partner.id,
        categoryId: category(seed.categorySlug).id,
        name: seed.name,
        headline: seed.headline,
        description: seed.description,
        status: seed.status as never,
        verificationLevel: (seed.verificationLevel ?? "NONE") as never,
        verificationBadge: Boolean(seed.badge),
        isActive: true,
        addressLine1: seed.address,
        area: seed.area,
        city: seed.city,
        state: "Lagos",
        country: "Nigeria",
        postalCode: "106104",
        latitude: seed.latitude,
        longitude: seed.longitude,
        contactName: partner.businessName,
        contactPhone: partner.phone,
        contactEmail: partner.email,
        bedrooms: seed.bedrooms,
        bathrooms: seed.bathrooms,
        maxGuests: seed.maxGuests,
        houseRules:
          "Quiet hours from 10pm. No parties or events without prior written approval. Smoking is permitted on balconies only. Visitors must be registered at reception. Loss of keys or access cards attracts a replacement charge.",
        cancellationPolicyId: seed.cancellationPolicyId ?? flexibleCancel.id,
        checkInFrom: "14:00",
        checkInTo: "22:00",
        checkOutUntil: "12:00",
        smokingAllowed: false,
        petsAllowed: false,
        partiesAllowed: false,
        childrenAllowed: true,
        minimumAge: 18,
        bookingMode: (seed.bookingMode ?? "INSTANT") as never,
        instantBooking: (seed.bookingMode ?? "INSTANT") === "INSTANT",
        minNights: seed.minNights ?? 1,
        maxNights: seed.maxNights ?? null,
        minNoticeHours: seed.minNoticeHours ?? 0,
        advanceBookingDays: seed.advanceBookingDays ?? 365,
        dueDiligenceEnabled: true,
        dueDiligenceThresholdDays: seed.dueDiligenceThresholdDays ?? null,
        mandatoryVerification: Boolean(seed.dueDiligenceThresholdDays && seed.dueDiligenceThresholdDays >= 365),
        currency: NGN,
        featured: Boolean(seed.featured),
        coverImageUrl: photo(index),
        publishedAt: seed.status === "APPROVED" ? new Date(Date.now() - (index + 1) * 86_400_000) : null,
        submittedAt: new Date(Date.now() - (index + 3) * 86_400_000),
        reviewedAt: seed.status === "APPROVED" ? new Date() : null,
        reviewedById: seed.status === "APPROVED" ? superAdmin.id : null,
        totalViews: 120 * (index + 1),
      },
    });

    createdProperties[seed.slug] = property.id;

    // Media: gallery + optional video + optional genuine interactive virtual tour.
    await prisma.propertyMedia.createMany({
      data: [
        { propertyId: property.id, type: "IMAGE" as MediaType, url: photo(index), sortOrder: 0, caption: "Exterior" },
        { propertyId: property.id, type: "IMAGE" as MediaType, url: photo(index + 1), sortOrder: 1, caption: "Living area" },
        { propertyId: property.id, type: "IMAGE" as MediaType, url: photo(index + 2), sortOrder: 2, caption: "Kitchen" },
        { propertyId: property.id, type: "IMAGE" as MediaType, url: photo(index + 3), sortOrder: 3, caption: "Principal bedroom" },
        { propertyId: property.id, type: "IMAGE" as MediaType, url: photo(index + 4), sortOrder: 4, caption: "Bathroom" },
        { propertyId: property.id, type: "IMAGE" as MediaType, url: photo(index + 5), sortOrder: 5, caption: "Views" },
        ...(seed.videoUrl
          ? [{ propertyId: property.id, type: "YOUTUBE" as MediaType, url: seed.videoUrl, sortOrder: 20, caption: "Property walkthrough video" }]
          : []),
        ...(seed.virtualTour
          ? [
              {
                propertyId: property.id,
                type: "VIRTUAL_TOUR" as MediaType,
                url: photo(index + 6),
                sortOrder: 30,
                caption: "Interactive 360° tour",
                meta: {
                  provider: "rentops-360",
                  scenes: [
                    {
                      id: "lobby",
                      name: "Entrance & lobby",
                      panorama: photo(index),
                      hotspots: [
                        { yaw: 45, pitch: 0, to: "living", label: "Living area" },
                        { yaw: -60, pitch: 0, to: "pool", label: "Pool deck" },
                      ],
                    },
                    {
                      id: "living",
                      name: "Living area",
                      panorama: photo(index + 1),
                      hotspots: [
                        { yaw: 120, pitch: 0, to: "bedroom", label: "Principal bedroom" },
                        { yaw: -150, pitch: 0, to: "lobby", label: "Back to lobby" },
                      ],
                    },
                    {
                      id: "bedroom",
                      name: "Principal bedroom",
                      panorama: photo(index + 3),
                      hotspots: [{ yaw: 10, pitch: 0, to: "living", label: "Living area" }],
                    },
                    {
                      id: "pool",
                      name: "Pool deck",
                      panorama: photo(index + 5),
                      hotspots: [{ yaw: 170, pitch: 0, to: "lobby", label: "Back to lobby" }],
                    },
                  ],
                },
              },
            ] : []),
      ],
    });

    await prisma.propertyAmenity.createMany({
      data: seed.amenitySlugs
        .map((slug) => amenities.find((amenity) => amenity.slug === slug))
        .filter((amenity): amenity is (typeof amenities)[number] => Boolean(amenity))
        .map((amenity) => ({ propertyId: property.id, amenityId: amenity.id })),
    });

    await prisma.propertyVerificationCheck.createMany({
      data: (["BUSINESS", "OWNERSHIP", "LOCATION", "MEDIA"] as const).map((type) => ({
        propertyId: property.id,
        type: type as never,
        status: seed.status === "APPROVED" ? ("VERIFIED" as never) : ("PENDING" as never),
        completedAt: seed.status === "APPROVED" ? new Date() : null,
        reviewedById: seed.status === "APPROVED" ? superAdmin.id : null,
        note:
          type === "OWNERSHIP"
            ? "Listing authority confirmed against the partner's business documents."
            : type === "LOCATION"
              ? "Coordinates confirmed against the stated address."
              : null,
      })),
    });

    // Rooms & units ------------------------------------------------------------
    const categoryNames = Array.from(new Set(seed.units.map((unit) => unit.categorySlug).filter(Boolean))) as string[];
    const roomCategories: Record<string, string> = {};
    for (const categorySlug of categoryNames) {
      const unitsInCategory = seed.units.filter((unit) => unit.categorySlug === categorySlug);
      const first = unitsInCategory[0];
      if (!first) continue;
      const label = categorySlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      const record = await prisma.roomCategory.create({
        data: {
          propertyId: property.id,
          name: label,
          slug: categorySlug,
          description: `${label} — ${first.bedrooms} bedroom(s), sleeps up to ${first.maxGuests}.`,
          maxGuests: first.maxGuests,
          bedrooms: first.bedrooms,
          bathrooms: first.bathrooms,
          quantity: unitsInCategory.length,
          sortOrder: 0,
        },
      });
      roomCategories[categorySlug] = record.id;
    }

    let sortOrder = 0;
    for (const unitSeed of seed.units) {
      const unit = await prisma.unit.create({
        data: {
          propertyId: property.id,
          categoryId: unitSeed.categorySlug ? roomCategories[unitSeed.categorySlug] ?? null : null,
          label: unitSeed.label,
          maxGuests: unitSeed.maxGuests,
          bedrooms: unitSeed.bedrooms,
          bathrooms: unitSeed.bathrooms,
          status: "ACTIVE",
          isBookable: true,
          sortOrder: sortOrder++,
        },
      });

      await prisma.unitRate.create({
        data: {
          unitId: unit.id,
          currency: NGN,
          nightlyRate: unitSeed.nightly != null ? naira(unitSeed.nightly) : null,
          weeklyRate: unitSeed.weekly != null ? naira(unitSeed.weekly) : null,
          monthlyRate: unitSeed.monthly != null ? naira(unitSeed.monthly) : null,
          annualRate: unitSeed.annual != null ? naira(unitSeed.annual) : null,
          weekendNightlyRate: unitSeed.weekendNightly != null ? naira(unitSeed.weekendNightly) : null,
          extraGuestFee: unitSeed.extraGuestFee != null ? naira(unitSeed.extraGuestFee) : 0,
          extraGuestThreshold: unitSeed.extraGuestThreshold ?? unitSeed.maxGuests,
          cleaningFee: unitSeed.cleaningFee != null ? naira(unitSeed.cleaningFee) : 0,
          serviceCharge: unitSeed.serviceCharge != null ? naira(unitSeed.serviceCharge) : 0,
          securityDeposit: 0,
        },
      });

      const seasonal = seed.seasonal?.filter((season) => season.unitLabel === unitSeed.label) ?? [];
      for (const season of seasonal) {
        await prisma.seasonalRate.create({
          data: {
            unitId: unit.id,
            name: season.name,
            startDate: day(season.nights[0]),
            endDate: day(season.nights[1]),
            nightlyRate: naira(season.nightly),
            isPromotion: Boolean(season.promotion),
            label: season.label ?? null,
            priority: 1,
          },
        });
      }
    }

    // A small amount of realistic owner-blocked inventory.
    if (index % 3 === 0) {
      const unit = await prisma.unit.findFirst({ where: { propertyId: property.id } });
      if (unit) {
        await prisma.availabilityBlock.create({
          data: {
            unitId: unit.id,
            startDate: day(12),
            endDate: day(16),
            reason: "MAINTENANCE",
            note: "Air-conditioning servicing.",
          },
        });
      }
    }
  }

  // Advertised "from" price is derived from the units, never hand-maintained.
  for (const propertyId of Object.values(createdProperties)) {
    const units = await prisma.unit.findMany({
      where: { propertyId, status: { not: "INACTIVE" } },
      include: { rate: true },
    });
    const rates = units
      .map((unit) =>
        unit.rate
          ? effectiveNightlyRate({
              unitId: unit.id,
              label: unit.label,
              maxGuests: unit.maxGuests,
              nightlyRate: unit.rate.nightlyRate,
              weeklyRate: unit.rate.weeklyRate,
              monthlyRate: unit.rate.monthlyRate,
              annualRate: unit.rate.annualRate,
              weekendNightlyRate: unit.rate.weekendNightlyRate,
              extraGuestFee: unit.rate.extraGuestFee,
              extraGuestThreshold: unit.rate.extraGuestThreshold,
              cleaningFee: unit.rate.cleaningFee,
              serviceCharge: unit.rate.serviceCharge,
              securityDeposit: unit.rate.securityDeposit,
            })
          : null,
      )
      .filter((value): value is number => typeof value === "number" && value > 0);

    await prisma.property.update({
      where: { id: propertyId },
      data: { baseNightlyRate: rates.length > 0 ? Math.min(...rates) : null },
    });
  }

  console.log(`Seeded ${Object.keys(createdProperties).length} properties.`);
  console.log("RentOps seed complete. Sign in with any seeded email and password Password123!");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
