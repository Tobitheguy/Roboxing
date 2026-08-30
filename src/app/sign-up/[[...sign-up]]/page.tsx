import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <div className="flex justify-center px-4 py-16 sm:py-24">
      <SignUp />
    </div>
  );
}
