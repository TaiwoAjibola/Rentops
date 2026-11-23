"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseDateInput } from "@/lib/dates";
import { inspectionReference } from "@/lib/reference";
import { notify, notifyMany } from "@/lib/notifications";
import { partnerStaffUserIds } from "@/lib/payments/booking";

export type CustomerActionState = { error?: string; success?: string } | null;

const WINDOWS = ["MORNING", "AFTERNOON", "EVENING"] as const;

export async function requestInspection(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/inspections");

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const preferredDateRaw = String(formData.get("preferredDate") ?? "").trim();
  const preferredWindow = String(formData.get("preferredWindow") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const reservationId = String(formData.get("reservationId") ?? "").trim();

  const property = await prisma.property.findFirst({
    where: propertyId ? { id: propertyId, status: "APPROVED" } : { slug, status: "APPROVED" },
    select: { id: true, name: true, slug: true, partnerId: true, city: true },
  });
  if (!property) return { error: "That property is not currently available for inspection." };

  const preferredDate = parseDateInput(preferredDateRaw);
  if (!preferredDate) return { error: "Choose the date you would like to visit." };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (preferredDate < today) return { error: "Choose a date from today onwards." };

  if (!WINDOWS.includes(preferredWindow as (typeof WINDOWS)[number])) {
    return { error: "Choose a time window for your visit." };
  }

  const contactPhone = phone || user.phone;
  if (!contactPhone) return { error: "Add a phone number so the property can confirm your visit." };

  const request = await prisma.inspectionRequest.create({
    data: {
      reference: inspectionReference(),
      propertyId: property.id,
      userId: user.id,
      reservationId: reservationId || null,
      status: "REQUESTED",
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phone: contactPhone,
      email: user.email,
      preferredDate,
      preferredWindow,
      notes: notes || null,
    },
  });

  const staff = await partnerStaffUserIds(property.partnerId, ["OWNER", "MANAGER", "FRONT_DESK"]);
  await notifyMany(staff, {
    type: "INSPECTION_UPDATE",
    title: `Inspection requested — ${property.name}`,
    body: `${request.fullName} would like to visit on ${preferredDate.toISOString().slice(0, 10)} (${preferredWindow.toLowerCase()}).`,
    channels: ["IN_APP", "EMAIL"],
    data: { inspectionId: request.id, propertyId: property.id },
  });

  await notify({
    userId: user.id,
    type: "INSPECTION_UPDATE",
    title: `Inspection requested (${request.reference})`,
    body: `We have asked ${property.name} to confirm your visit. You will be notified here as soon as it is scheduled.`,
    channels: ["IN_APP"],
    data: { inspectionId: request.id },
  });

  revalidatePath("/account/inspections");
  revalidatePath("/account");
  redirect(`/account/inspections?created=${encodeURIComponent(request.reference)}`);
}

export async function cancelInspection(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/inspections");

  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return { error: "Inspection not found." };

  const request = await prisma.inspectionRequest.findFirst({
    where: { reference, userId: user.id },
    include: { property: { select: { id: true, name: true, partnerId: true } } },
  });
  if (!request) return { error: "Inspection not found." };
  if (!["REQUESTED", "SCHEDULED"].includes(request.status)) {
    return { error: "This inspection has already been completed or closed." };
  }

  await prisma.inspectionRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED" },
  });

  const staff = await partnerStaffUserIds(request.property.partnerId, ["OWNER", "MANAGER", "FRONT_DESK"]);
  await notifyMany(staff, {
    type: "INSPECTION_UPDATE",
    title: `Inspection cancelled — ${request.property.name}`,
    body: `${request.fullName ?? "The guest"} cancelled the visit requested for ${request.preferredDate?.toISOString().slice(0, 10) ?? "the agreed date"}.`,
    channels: ["IN_APP"],
    data: { inspectionId: request.id },
  });

  revalidatePath("/account/inspections");
  return { success: "Inspection request cancelled." };
}
