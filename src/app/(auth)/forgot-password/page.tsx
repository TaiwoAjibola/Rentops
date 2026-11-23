import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/app/(auth)/_components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your RentOps account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
