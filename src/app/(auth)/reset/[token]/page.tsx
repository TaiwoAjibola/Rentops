import type { Metadata } from "next";

import { ResetPasswordForm } from "@/app/(auth)/_components/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your RentOps account.",
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <ResetPasswordForm token={token} />;
}
