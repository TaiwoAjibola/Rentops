import { PrismaClient } from "@prisma/client";

import { createReservation } from "../src/lib/reservations";
import { majorToMinor } from "../src/lib/money";
import { addDays, nightsBetween } from "../src/lib/dates";
import { postBookingPaymentEntries } from "../src/lib/ledger";

const prisma = new PrismaClient();

/**
 * Demo activity seed.
 *
 * Runs real business logic (`createReservation`) so every seeded booking has
 * genuine pricing, a real inventory hold and a correctly-shaped quote — then
 * advances it through the lifecycle so the dashboards have something truthful
 * to show. Each booking uses a distinct unit so the no-overlap constraint is
 * respected.
 */

type DemoBooking = {
  slug: string;
  guestEmail: string;
  nights: number;
  startInDays: number;
  targetStatus: "CONFIRMED" | "PENDING_PAYMENT" | "PENDING_APPROVAL" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
};

const BOOKINGS: DemoBooking[] = [
  { slug: "grand-residences-hotel-lekki", guestEmail: "chidi@example.com", nights: 3, startInDays: 5, targetStatus: "CONFIRMED" },
  { slug: "azure-shortlet-lekki-phase-1", guestEmail: "amara@example.com", nights: 4, startInDays: 2, targetStatus: "CHECKED_IN" },
  { slug: "harmony-residence-lekki-phase-2", guestEmail: "bola@example.com", nights: 9, startInDays: -14, targetStatus: "CHECKED_OUT" },
  { slug: "coastal-villa-banana-island", guestEmail: "emeka@example.com", nights: 5, startInDays: 25, targetStatus: "PENDING_APPROVAL" },
  { slug: "sunset-marina-apartments-vi", guestEmail: "funmi@example.com", nights: 6, startInDays: 20, targetStatus: "CONFIRMED" },
  { slug: "yaba-private-room-studio", guestEmail: "alex@example.com", nights: 45, startInDays: 1, targetStatus: "CONFIRMED" },
  { slug: "maple-court-residential-apartments-ikeja", guestEmail: "chidi@example.com", nights: 365, startInDays: 40, targetStatus: "PENDING_PAYMENT" },
  { slug: "harmony-serviced-apartments-ikoyi", guestEmail: "amara@example.com", nights: 92, startInDays: 4, targetStatus: "CONFIRMED" },
  { slug: "ocean-view-duplex-ajah", guestEmail: "alex@example.com", nights: 6, startInDays: -60, targetStatus: "CHECKED_OUT" },
  { slug: "the-palm-house-ikoyi", guestEmail: "bola@example.com", nights: 120, startInDays: 25, targetStatus: "PENDING_APPROVAL" },
  { slug: "grand-residences-hotel-lekki", guestEmail: "funmi@example.com", nights: 2, startInDays: -30, targetStatus: "CANCELLED" },
];

const naira = (amount: number) => majorToMinor(amount, "NGN");

const day = (offset: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
};

async function main() {
  console.log("Seeding demo activity…");

  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.inspectionRequest.deleteMany();
  await prisma.review.deleteMany();
  await prisma.savedProperty.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.reservationUnit.deleteMany();
  await prisma.reservation.deleteMany();

  const usedUnits = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const [index, booking] of BOOKINGS.entries()) {
    const property = await prisma.property.findFirst({
      where: { slug: booking.slug },
      include: { partner: true },
    });
    const guest = await prisma.user.findUnique({ where: { email: booking.guestEmail } });
    if (!property || !guest) {
      skipped++;
      continue;
    }

    const unit = await prisma.unit.findFirst({
      where: { propertyId: property.id, id: { notIn: Array.from(usedUnits) } },
      orderBy: { sortOrder: "asc" },
    });
    if (!unit) {
      skipped++;
      continue;
    }

    const nights = Math.max(booking.nights, property.minNights || 1);
    const checkIn = day(booking.startInDays);
    const checkOut = addDays(checkIn, nights);

    const result = await createReservation({
      userId: guest.id,
      propertyId: property.id,
      unitIds: [unit.id],
      checkIn,
      checkOut,
      guests: Math.min(2, unit.maxGuests),
      specialRequests: index % 2 === 0 ? "Late arrival, please confirm reception hours." : null,
    });

    if (!result.ok) {
      skipped++;
      console.log(`  skipped ${booking.slug}: ${result.error}`);
      continue;
    }

    usedUnits.add(unit.id);
    created++;

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result.reservationId },
      include: { property: { include: { partner: true } } },
    });

    const paid = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(booking.targetStatus);
    let paymentId: string | null = null;

    if (paid || booking.targetStatus === "CANCELLED") {
      const payment = await prisma.payment.create({
        data: {
          reference: `RTP-DEMO${index.toString().padStart(2, "0")}`,
          provider: "PAYSTACK",
          status: "SUCCESS",
          amount: reservation.grossAmount,
          currency: reservation.currency,
          channel: "card",
          userId: reservation.userId,
          reservationId: reservation.id,
          paidAt: new Date(),
          webhookVerified: true,
        },
      });
      paymentId = payment.id;

      await postBookingPaymentEntries({
        reservationId: reservation.id,
        paymentId: payment.id,
        partnerId: reservation.property.partnerId,
        currency: reservation.currency,
        grossAmount: reservation.grossAmount,
        platformCommission: reservation.platformCommission,
        processingFee: reservation.processingFee,
        partnerNetAmount: reservation.partnerNetAmount,
        reference: reservation.reference,
      });
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: booking.targetStatus as never,
        confirmedAt: paid ? new Date() : null,
        holdExpiresAt: booking.targetStatus === "PENDING_PAYMENT" ? (reservation.holdExpiresAt as Date) : null,
        checkedInAt: ["CHECKED_IN", "CHECKED_OUT"].includes(booking.targetStatus) ? new Date() : null,
        checkedInById: ["CHECKED_IN", "CHECKED_OUT"].includes(booking.targetStatus) ? (await ownerOf(reservation.property.partnerId)) : null,
        checkedOutAt: booking.targetStatus === "CHECKED_OUT" ? new Date() : null,
        cancelledAt: booking.targetStatus === "CANCELLED" ? new Date() : null,
        cancellationReason: booking.targetStatus === "CANCELLED" ? "Guest's travel plans changed." : null,
      },
    });

    if (booking.targetStatus === "CHECKED_OUT" && paymentId) {
      await prisma.settlement.upsert({
        where: { reference: `RTS-${reservation.reference.slice(-8)}` },
        create: {
          reference: `RTS-${reservation.reference.slice(-8)}`,
          partnerId: reservation.property.partnerId,
          status: "PENDING",
          currency: reservation.currency,
          grossAmount: reservation.partnerNetAmount,
          netPayable: reservation.partnerNetAmount,
          periodStart: reservation.checkIn,
          periodEnd: reservation.checkOut,
          holdUntil: new Date(Date.now() + 2 * 86_400_000),
          reservations: { connect: { id: reservation.id } },
        },
        update: {},
      });
    }
  }

  console.log(`Created ${created} reservations (${skipped} skipped).`);

  // Reviews on completed stays.
  const completed = await prisma.reservation.findMany({
    where: { status: "CHECKED_OUT" },
    include: { user: true },
  });

  for (const [index, reservation] of completed.entries()) {
    await prisma.review.create({
      data: {
        propertyId: reservation.propertyId,
        userId: reservation.userId,
        reservationId: reservation.id,
        overallRating: index === 0 ? 5 : 4,
        cleanliness: 5,
        accuracy: 5,
        communication: index === 0 ? 5 : 4,
        locationRating: 5,
        value: 4,
        checkInRating: 5,
        title: index === 0 ? "Better than the photos" : "Comfortable and well run",
        body:
          index === 0
            ? "Everything matched the listing, power and internet were reliable throughout, and the team responded within minutes on chat. I extended my stay by another week."
            : "Clean, quiet and exactly as described. Check-in was smooth and the apartment had everything I needed for a longer stay.",
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }

  // Favourites.
  const customers = await prisma.user.findMany({ where: { systemRole: "CUSTOMER" }, take: 6 });
  const featured = await prisma.property.findMany({ where: { featured: true }, take: 4 });
  for (const customer of customers) {
    for (const property of featured.slice(0, 2)) {
      await prisma.savedProperty.upsert({
        where: { userId_propertyId: { userId: customer.id, propertyId: property.id } },
        create: { userId: customer.id, propertyId: property.id },
        update: {},
      });
    }
  }

  // Conversations between guests and partners.
  const firstPartner = await prisma.partner.findFirst();
  const enquiryProperty = await prisma.property.findFirst({ where: { featured: true } });
  if (firstPartner && customers[0] && enquiryProperty) {
    const conversation = await prisma.conversation.create({
      data: {
        type: "ENQUIRY",
        subject: `Question about ${enquiryProperty.name}`,
        propertyId: enquiryProperty.id,
        customerId: customers[0].id,
        partnerId: firstPartner.id,
        lastMessageAt: new Date(),
      },
    });
    await prisma.message.createMany({
      data: [
        { conversationId: conversation.id, senderId: customers[0].id, body: "Hi — is the generator available 24/7, and can I check in late?" },
        { conversationId: conversation.id, senderId: null, isSystem: false, body: "Yes, backup power runs continuously and late check-in can be arranged. Just let us know your arrival time." },
      ],
    });
  }

  // Inspection request + support ticket + dispute.
  const inspectionProperty = await prisma.property.findFirst({ where: { slug: "maple-court-residential-apartments-ikeja" } });
  if (inspectionProperty && customers[1]) {
    await prisma.inspectionRequest.create({
      data: {
        reference: "RTI-DEMO01",
        propertyId: inspectionProperty.id,
        userId: customers[1].id,
        status: "REQUESTED",
        fullName: `${customers[1].firstName} ${customers[1].lastName}`,
        phone: customers[1].phone,
        email: customers[1].email,
        preferredDate: day(3),
        preferredWindow: "AFTERNOON",
        notes: "Interested in a twelve-month tenancy, would like to view the flat.",
      },
    });
  }

  if (customers[2]) {
    await prisma.supportTicket.create({
      data: {
        reference: "RTT-DEMO01",
        subject: "Cannot upload my ID document",
        description: "The upload keeps failing on Safari. Please advise another way to verify my identity.",
        category: "VERIFICATION",
        status: "OPEN",
        priority: "MEDIUM",
        userId: customers[2].id,
        email: customers[2].email,
      },
    });
  }

  const paidReservation = await prisma.reservation.findFirst({ where: { status: "CONFIRMED" } });
  if (paidReservation) {
    await prisma.dispute.create({
      data: {
        reference: "RTD-DEMO01",
        reservationId: paidReservation.id,
        openedById: paidReservation.userId,
        category: "CHECK_IN",
        reason: "Reception had no record of my booking on arrival and I waited 40 minutes.",
        desiredOutcome: "A partial refund for the first night.",
        status: "OPEN",
      },
    });
  }

  await prisma.promotion.upsert({
    where: { code: "WELCOME10" },
    create: {
      code: "WELCOME10",
      description: "10% off accommodation for new customers.",
      type: "PERCENTAGE",
      value: 10,
      scope: "ALL",
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 90 * 86_400_000),
      usageLimit: 500,
      isActive: true,
    },
    update: {},
  });

  // Keep search "from" prices in step with any changes.
  for (const property of await prisma.property.findMany({ select: { id: true } })) {
    const units = await prisma.unit.findMany({
      where: { propertyId: property.id, status: { not: "INACTIVE" } },
      include: { rate: true },
    });
    const rates = units
      .map((unit) => unit.rate?.nightlyRate ?? (unit.rate?.weeklyRate ? Math.round(unit.rate.weeklyRate / 7) : null) ?? (unit.rate?.monthlyRate ? Math.round(unit.rate.monthlyRate / 30) : null))
      .filter((value): value is number => typeof value === "number" && value > 0);
    if (rates.length > 0) {
      await prisma.property.update({ where: { id: property.id }, data: { baseNightlyRate: Math.min(...rates) } });
    }
  }

  const counts = {
    reservations: await prisma.reservation.count(),
    payments: await prisma.payment.count(),
    ledger: await prisma.ledgerEntry.count(),
    settlements: await prisma.settlement.count(),
    reviews: await prisma.review.count(),
    favourites: await prisma.savedProperty.count(),
    messages: await prisma.message.count(),
    inspections: await prisma.inspectionRequest.count(),
    tickets: await prisma.supportTicket.count(),
    disputes: await prisma.dispute.count(),
  };

  console.log("Demo activity seeded:", counts);
}

async function ownerOf(partnerId: string) {
  const member = await prisma.partnerMember.findFirst({ where: { partnerId, role: "OWNER" } });
  return member?.userId ?? null;
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
