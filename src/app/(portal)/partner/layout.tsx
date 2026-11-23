import { PartnerMobileNav } from "@/components/partner/mobile-nav";
import { PartnerSidebar, type SidebarStep } from "@/components/partner/sidebar";
import { PartnerTopBar } from "@/components/partner/top-bar";
import { isRemtopsStaff, requirePartnerContext } from "@/lib/auth/session";
import { PARTNER_ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notifications";

/**
 * Partner portal shell.
 *
 * This guard is the boundary of the whole portal: `requirePartnerContext()`
 * resolves the acting partner from the session's active membership, so every
 * page below can assume an authenticated member and must scope its queries to
 * `partner.id`.
 */
export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePartnerContext();
  const { user, partner, permissions, membership, memberships } = context;

  const [unread, documents, bankAccounts, propertyCount] = await Promise.all([
    unreadCount(user.id),
    prisma.partnerDocument.count({ where: { partnerId: partner.id } }),
    prisma.partnerBankAccount.count({ where: { partnerId: partner.id } }),
    prisma.property.count({ where: { partnerId: partner.id } }),
  ]);

  const steps: SidebarStep[] = [
    { key: "ACCOUNT", label: "Account created", done: true },
    {
      key: "CONTACT",
      label: "Contact verified",
      done: Boolean(user.emailVerifiedAt ?? user.phoneVerifiedAt),
    },
    { key: "DOCUMENTS", label: "Verification documents", done: documents > 0 },
    { key: "SETTLEMENT", label: "Settlement details", done: bankAccounts > 0 },
    { key: "PROPERTY", label: "First property", done: propertyCount > 0 },
  ];

  const verificationTone =
    partner.verificationStatus === "VERIFIED"
      ? "success"
      : partner.verificationStatus === "REJECTED"
        ? "danger"
        : partner.verificationStatus === "UNVERIFIED"
          ? "neutral"
          : "warning";

  const verificationLabel = {
    UNVERIFIED: "Unverified",
    PENDING: "Verification pending",
    IN_REVIEW: "In review",
    VERIFIED: "Verified",
    REJECTED: "Verification rejected",
    EXPIRED: "Verification expired",
  }[partner.verificationStatus];

  return (
    <div className="min-h-screen bg-canvas">
      <PartnerTopBar
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        avatarUrl={user.avatarUrl}
        unread={unread}
        isPlatformStaff={isRemtopsStaff(user)}
        partnerId={partner.id}
        memberships={memberships.map((entry) => ({
          id: entry.partnerId,
          businessName: entry.partner.businessName,
          roleLabel: PARTNER_ROLE_LABELS[entry.role],
        }))}
      />

      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-line bg-white lg:block">
          <PartnerSidebar
            partnerName={partner.businessName}
            verificationLabel={verificationLabel}
            verificationTone={verificationTone}
            permissions={permissions}
            memberRoleLabel={`${PARTNER_ROLE_LABELS[membership.role]} · RentOps partner`}
            steps={steps}
          />
        </aside>

        <main id="partner-content" className="min-w-0 flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-16 lg:pt-7">
          <div className="mb-5 lg:hidden">
            <PartnerMobileNav permissions={permissions} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
