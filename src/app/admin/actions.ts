"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  isAdminEmail,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-redirect";

const LoginSchema = z.object({
  email: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1024),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  // Five attempts per fifteen minutes. One shared password protects the
  // database and the live broadcast, so unlimited guessing is the whole attack.
  const limit = rateLimit(`login:${ip}`, 5, 15 * 60);
  if (!limit.allowed) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(
        limit.retryAfterSeconds / 60,
      )} minutes.`,
    };
  }

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter an email address and password." };
  }

  const { email, password } = parsed.data;
  const allowed = isAdminEmail(email);
  const correct = await verifyPassword(
    password,
    process.env.ADMIN_PASSWORD_HASH,
  );

  // Both checks always run, and one message covers both failures. Telling an
  // attacker which half was wrong hands them the admin address list.
  if (!allowed || !correct) {
    return { error: "Those credentials are not valid." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(email), SESSION_COOKIE_OPTIONS);

  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
