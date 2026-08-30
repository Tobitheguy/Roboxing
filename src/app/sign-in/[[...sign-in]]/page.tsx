import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="flex justify-center px-4 py-16 sm:py-24">
      <SignIn />
    </div>
  );
}
