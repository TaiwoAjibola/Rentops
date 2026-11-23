"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export type CustomerActionState = { error?: string; success?: string } | null;

/** Removes one of the signed-in customer's saved properties. */
export async function removeFavourite(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/favourites");

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  if (!propertyId) return { error: "That property could not be identified." };

  const removed = await prisma.savedProperty.deleteMany({ where: { userId: user.id, propertyId } });
  if (removed.count === 0) return { error: "That property is no longer in your saved list." };

  revalidatePath("/account/favourites");
  revalidatePath("/account");
  return { success: "Removed from your saved properties." };
}

/** Adds a property to the signed-in customer's saved list. */
export async function saveFavourite(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account");

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  if (!propertyId) return { error: "That property could not be identified." };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, status: "APPROVED", isActive: true },
    select: { id: true, name: true },
  });
  if (!property) return { error: "That property is not currently listed." };

  await prisma.savedProperty.upsert({
    where: { userId_propertyId: { userId: user.id, propertyId: property.id } },
    create: { userId: user.id, propertyId: property.id },
    update: {},
  });

  revalidatePath("/account/favourites");
  revalidatePath("/account");
  return { success: `${property.name} saved to your favourites.` };
}
