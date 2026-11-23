"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PartnerMemberRole, PartnerType, PayoutModel, VerificationType } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  createSession,
  getCurrentUser,
  hashPassword,
  hashToken,
  setActivePartner,
} from "@/lib/auth/session";
import { PARTNER_PERMISSIONS, type PartnerPermission } from "@/lib/auth/rbac";
import { slugify, uniqueSuffix } from "@/lib/utils";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { storeUpload } from "@/lib/storage";
import type { PartnerActionState } from "@/components/partner/action-state";

const PARTNER_TYPES: PartnerType[] = [
  "INDIVIDUAL_OWNER",
  "SHORTLET_OWNER",
  "HOTEL",
  "SERVICED_APARTMENT_OPERATOR",
  "PROPERTY_MANAGEMENT_COMPANY",
  "PROPERTY_DEVELOPER",
  "OTHER",
];

const PAYOUT_MODELS: PayoutModel[] = ["PLATFORM_COLLECTED", "PARTNER_DIRECT", "HYBRID"];

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function file0(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

async function uniquePartnerSlug(base: string) {
  const cleaned = slugify(base) || "partner";
  let candidate = cleaned;
  let index = 2;
  while (await prisma.partner.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${cleaned}-${index++}`;
  }
  return candidate;
}

/**
 * Creates the user, the partner organisation and the owner membership in one
 * transaction. The user keeps SystemRole.CUSTOMER — access to the portal is
 * granted by membership, not by a platform role.
 */
export async function registerPartner(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const type = str(formData, "type") as PartnerType;
  const businessName = str(formData, "businessName");
  const legalName = str(formData, "legalName");
  const registrationNumber = str(formData, "registrationNumber");
  const taxId = str(formData, "taxId");
  const email = str(formData, "email").toLowerCase();
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  const website = str(formData, "website");
  const description = str(formData, "description");
  const city = str(formData, "city");
  const state = str(formData, "state");
  const country = str(formData, "country") || "Nigeria";
  const addressLine = str(formData, "addressLine");
  const payoutModel = (str(formData, "payoutModel") || "PLATFORM_COLLECTED") as PayoutModel;

  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  const contactEmail = str(formData, "contactEmail").toLowerCase();
  const contactPhone = str(formData, "contactPhone");
  const password = str(formData, "password");
  const confirm = str(formData, "confirmPassword");
  const accepted = formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true";

  if (!PARTNER_TYPES.includes(type)) return { error: "Choose the option that describes your business." };
  if (!businessName) return { error: "Enter your business or trading name." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid business email address." };
  if (!phone) return { error: "Enter a business phone number." };
  if (!PAYOUT_MODELS.includes(payoutModel)) return { error: "Choose how you want to be paid." };
  if (!firstName || !lastName) return { error: "Enter the contact person's first and last name." };
  if (!contactEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) return { error: "Enter a valid contact email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };
  if (!accepted) return { error: "Please accept the partner terms to continue." };

  const existing = await prisma.user.findUnique({ where: { email: contactEmail }, select: { id: true } });
  if (existing) {
    return { error: "An account already exists for that contact email. Sign in, then register your business from the partner portal." };
  }

  const slug = await uniquePartnerSlug(businessName);

  const uploadedDocuments: { file: File; type: VerificationType; label: string }[] = [];
  const businessFile = file0(formData, "businessDocument");
  const identityFile = file0(formData, "identityDocument");
  if (businessFile) uploadedDocuments.push({ file: businessFile, type: "BUSINESS", label: "Business registration" });
  if (identityFile) uploadedDocuments.push({ file: identityFile, type: "IDENTITY", label: "Contact person identity" });

  const storedDocuments = await Promise.all(
    uploadedDocuments.map(async (entry) => {
      const stored = await storeUpload(entry.file, `partners/${slug}`, { resourceType: entry.file.type === "application/pdf" ? "raw" : "image" });
      return { url: stored.url, type: entry.type, label: entry.label };
    }),
  );

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: contactEmail,
      firstName,
      lastName,
      phone: contactPhone || null,
      passwordHash,
      systemRole: "CUSTOMER",
      referralCode: `RT-${uniqueSuffix(8)}`,
      profile: { create: {} },
      notificationPrefs: { create: {} },
    },
  });

  const partner = await prisma.partner.create({
    data: {
      slug,
      type,
      businessName,
      legalName: legalName || null,
      registrationNumber: registrationNumber || null,
      taxId: taxId || null,
      email,
      phone,
      whatsapp: whatsapp || null,
      website: website || null,
      description: description || null,
      addressLine: addressLine || null,
      city: city || null,
      state: state || null,
      country,
      payoutModel,
      onboardingStep: "ACCOUNT",
      verificationStatus: storedDocuments.length > 0 ? "PENDING" : "UNVERIFIED",
      members: { create: { userId: user.id, role: "OWNER", status: "ACTIVE" } },
      documents: {
        create: storedDocuments.map((doc) => ({
          type: doc.type,
          label: doc.label,
          fileUrl: doc.url,
          status: "PENDING",
          uploadedById: user.id,
        })),
      },
    },
    select: { id: true, slug: true, businessName: true },
  });

  await createSession(user.id);
  await setActivePartner(partner.id);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: "PARTNER_OWNER",
    action: "PARTNER_REGISTERED",
    entityType: "Partner",
    entityId: partner.id,
    summary: `${partner.businessName} registered as a RentOps partner`,
    after: { type, payoutModel, documents: storedDocuments.length },
  });

  await notify({
    userId: user.id,
    type: "REGISTRATION",
    title: "Your partner account is live",
    body: `${partner.businessName} is registered. Finish verification documents and add your bank details so payouts can be released.`,
    channels: ["IN_APP"],
    data: { partnerId: partner.id },
  });

  revalidatePath("/partner");
  redirect("/partner/onboarding");
}

/** Accepts a staff invitation token. Signing in first is required. */
export async function acceptTeamInvitation(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const token = str(formData, "token");
  if (!token) return { error: "This invitation link is not valid." };

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/partner/staff/join?token=${token}`)}`);
  }

  const invitation = await prisma.partnerInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { partner: { select: { id: true, businessName: true } } },
  });

  if (!invitation) return { error: "This invitation link is not valid." };
  if (invitation.status !== "INVITED" || invitation.acceptedAt) return { error: "This invitation has already been used." };
  if (invitation.expiresAt < new Date()) return { error: "This invitation has expired. Ask the owner to send a new one." };
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: `This invitation was sent to ${invitation.email}. Sign in with that email address to accept it.` };
  }

  const existing = await prisma.partnerMember.findUnique({
    where: { partnerId_userId: { partnerId: invitation.partnerId, userId: user.id } },
  });

  if (existing) {
    await prisma.partnerMember.update({ where: { id: existing.id }, data: { status: "ACTIVE", role: invitation.role, permissions: invitation.permissions ?? undefined } });
  } else {
    await prisma.partnerMember.create({
      data: {
        partnerId: invitation.partnerId,
        userId: user.id,
        role: invitation.role,
        permissions: invitation.permissions ?? undefined,
        status: "ACTIVE",
        invitedById: invitation.invitedById,
      },
    });
  }

  await prisma.partnerInvitation.update({
    where: { id: invitation.id },
    data: { status: "ACTIVE", acceptedAt: new Date() },
  });

  await setActivePartner(invitation.partnerId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_INVITATION_ACCEPTED",
    entityType: "PartnerInvitation",
    entityId: invitation.id,
    summary: `${user.email} joined ${invitation.partner.businessName} as ${invitation.role.toLowerCase()}`,
  });

  revalidatePath("/partner/staff");
  redirect("/partner");
}

export async function updatePartnerProfile(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { requirePartnerPermission } = await import("@/lib/auth/session");
  const { partner, user } = await requirePartnerPermission("settings.manage");

  const businessName = str(formData, "businessName");
  const email = str(formData, "email").toLowerCase();
  if (!businessName) return { error: "Business name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid business email address." };

  const payoutModel = str(formData, "payoutModel") as PayoutModel;
  if (!PAYOUT_MODELS.includes(payoutModel)) return { error: "Choose how you want to be paid." };

  const preferredCurrency = str(formData, "preferredCurrency") || "NGN";

  const before = await prisma.partner.findUniqueOrThrow({
    where: { id: partner.id },
    select: { businessName: true, email: true, payoutModel: true, defaultCurrency: true },
  });

  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      businessName,
      legalName: str(formData, "legalName") || null,
      registrationNumber: str(formData, "registrationNumber") || null,
      taxId: str(formData, "taxId") || null,
      email,
      phone: str(formData, "phone"),
      whatsapp: str(formData, "whatsapp") || null,
      website: str(formData, "website") || null,
      description: str(formData, "description") || null,
      addressLine: str(formData, "addressLine") || null,
      city: str(formData, "city") || null,
      state: str(formData, "state") || null,
      country: str(formData, "country") || "Nigeria",
      payoutModel,
      defaultCurrency: preferredCurrency,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_PROFILE_UPDATED",
    entityType: "Partner",
    entityId: partner.id,
    summary: "Business profile updated",
    before,
    after: { businessName, email, payoutModel, defaultCurrency: preferredCurrency },
  });

  revalidatePath("/partner/settings");
  revalidatePath("/partner");
  return { success: "Business profile updated." };
}

export async function updatePartnerLogo(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { requirePartnerPermission } = await import("@/lib/auth/session");
  const { partner, user } = await requirePartnerPermission("settings.manage");

  const file = file0(formData, "logo");
  if (!file) return { error: "Choose an image to upload." };

  const stored = await storeUpload(file, `partners/${partner.slug}`);
  await prisma.partner.update({ where: { id: partner.id }, data: { logoUrl: stored.url } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_LOGO_UPDATED",
    entityType: "Partner",
    entityId: partner.id,
    summary: "Business logo updated",
  });

  revalidatePath("/partner/settings");
  revalidatePath("/partner");
  return { success: "Logo updated." };
}

export async function saveNotificationPreferences(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { requirePartnerContext } = await import("@/lib/auth/session");
  const { user } = await requirePartnerContext();

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      inApp: true,
      email: formData.get("email") === "on",
      sms: formData.get("sms") === "on",
      whatsapp: formData.get("whatsapp") === "on",
    },
    update: {
      email: formData.get("email") === "on",
      sms: formData.get("sms") === "on",
      whatsapp: formData.get("whatsapp") === "on",
    },
  });

  revalidatePath("/partner/settings");
  return { success: "Notification preferences saved." };
}

/** Switches which partner account the operator is acting for. */
export async function switchPartnerContext(formData: FormData) {
  const { requireUser } = await import("@/lib/auth/session");
  const user = await requireUser("/partner");

  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const membership = await prisma.partnerMember.findFirst({
    where: { partnerId, userId: user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) return;

  await setActivePartner(partnerId);
  revalidatePath("/partner", "layout");
  redirect("/partner");
}


