import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { Field, Input, Checkbox } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { updateProfileDetails, changePassword, saveNotificationPreferences } from "@/server/actions/customer-profile";

export const metadata = { title: "Profile & settings" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");

  const [profile, prefs] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <AccountPageHeader
        eyebrow="Your account"
        title="Profile & settings"
        description="Your details, password and how RentOps notifies you."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Profile details</h2>
          <p className="mt-1 text-sm text-ink-500">Used to confirm identity at check-in and for emergency contact.</p>
          <CustomerActionForm action={updateProfileDetails} submitLabel="Save profile" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="profile-first">
                <Input id="profile-first" value={user.firstName} readOnly disabled />
              </Field>
              <Field label="Last name" htmlFor="profile-last">
                <Input id="profile-last" value={user.lastName} readOnly disabled />
              </Field>
            </div>
            <Field label="Email" htmlFor="profile-email">
              <Input id="profile-email" value={user.email} readOnly disabled />
            </Field>
            <Field label="Phone" htmlFor="profile-phone">
              <Input id="profile-phone" value={user.phone ?? ""} readOnly disabled />
            </Field>

            <Field label="Date of birth" htmlFor="profile-dob">
              <Input id="profile-dob" name="dateOfBirth" type="date" defaultValue={profile?.dateOfBirth?.toISOString().slice(0, 10) ?? ""} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nationality" htmlFor="profile-nationality">
                <Input id="profile-nationality" name="nationality" defaultValue={profile?.nationality ?? ""} />
              </Field>
              <Field label="Country" htmlFor="profile-country">
                <Input id="profile-country" name="country" defaultValue={profile?.country ?? "Nigeria"} />
              </Field>
            </div>

            <Field label="Address line" htmlFor="profile-address">
              <Input id="profile-address" name="addressLine" defaultValue={profile?.addressLine ?? ""} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" htmlFor="profile-city">
                <Input id="profile-city" name="city" defaultValue={profile?.city ?? ""} />
              </Field>
              <Field label="State" htmlFor="profile-state">
                <Input id="profile-state" name="state" defaultValue={profile?.state ?? ""} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emergency contact name" htmlFor="profile-emergency-name">
                <Input id="profile-emergency-name" name="emergencyContactName" defaultValue={profile?.emergencyContactName ?? ""} />
              </Field>
              <Field label="Emergency contact phone" htmlFor="profile-emergency-phone">
                <Input id="profile-emergency-phone" name="emergencyContactPhone" defaultValue={profile?.emergencyContactPhone ?? ""} />
              </Field>
            </div>
          </CustomerActionForm>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Change password</h2>
            <CustomerActionForm action={changePassword} submitLabel="Update password" className="mt-4">
              <Field label="Current password" htmlFor="current-password" required>
                <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="New password" htmlFor="new-password" required hint="At least 8 characters.">
                <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required />
              </Field>
              <Field label="Confirm new password" htmlFor="confirm-password" required>
                <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required />
              </Field>
            </CustomerActionForm>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Notifications</h2>
            <p className="mt-1 text-sm text-ink-500">Choose how RentOps reaches you.</p>
            <CustomerActionForm action={saveNotificationPreferences} submitLabel="Save preferences" className="mt-4">
              {([
                ["inApp", "In-app notifications"],
                ["email", "Email notifications"],
                ["sms", "SMS notifications"],
                ["whatsapp", "WhatsApp notifications"],
              ] as const).map(([name, label]) => (
                <label
                  key={name}
                  htmlFor={`prefs-${name}`}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line px-4 py-3 hover:bg-ink-50"
                >
                  <span className="text-[14px] text-ink-800">{label}</span>
                  <Checkbox id={`prefs-${name}`} name={name} defaultChecked={prefs?.[name] ?? (name === "inApp" || name === "email")} />
                </label>
              ))}
            </CustomerActionForm>
          </section>
        </div>
      </div>
    </div>
  );
}
