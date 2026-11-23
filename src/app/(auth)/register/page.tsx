import type { Metadata } from "next";

import { RegisterForm } from "@/app/(auth)/_components/register-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a RentOps account to save properties, message partners and book accommodation.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = typeof raw === "string" && raw.startsWith("/") ? raw : "/account";

  return <RegisterForm next={next} />;
}
