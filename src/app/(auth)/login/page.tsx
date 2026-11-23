import type { Metadata } from "next";

import { LoginForm } from "@/app/(auth)/_components/login-form";
import { DemoSignIn } from "@/app/(auth)/_components/demo-sign-in";
import { FormSuccess } from "@/components/ui/field";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your RentOps account to manage bookings, leases and messages.",
};

function safeNext(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.startsWith("/") ? raw : "/account";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; reset?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const reset = Array.isArray(params.reset) ? params.reset[0] : params.reset;

  return (
    <div className="space-y-5">
      {reset ? (
        <FormSuccess>Your password has been updated. Sign in with your new password.</FormSuccess>
      ) : null}
      <LoginForm next={next} />
      <DemoSignIn next={next} />
    </div>
  );
}
