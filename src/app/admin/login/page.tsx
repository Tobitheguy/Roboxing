import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/admin/login/login-form";
import { Card, CardBody } from "@/components/card";
import { RoboxingMark } from "@/components/roboxing-mark";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const params = await props.searchParams;
  const raw = params.next;
  const next = Array.isArray(raw) ? raw[0] : raw;

  // Already signed in — no reason to show a login form.
  if (await getSession()) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <div className="mb-8 text-center">
        <RoboxingMark size="lg" />
        <p className="eyebrow mt-3">Admin</p>
      </div>

      <Card>
        <CardBody>
          <LoginForm next={next ?? "/admin"} />
        </CardBody>
      </Card>

      <p className="text-ink-dim mt-6 text-center text-xs">
        Access is limited to listed administrators.
      </p>
    </div>
  );
}
