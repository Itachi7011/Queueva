import type { Metadata } from "next";
import { OwnerSignupForm } from "@/components/auth/OwnerSignupForm";

export const metadata: Metadata = {
  title: "Set up your shop",
  description: "Create your free Queueva shop — booking, reminders, and a client portal in minutes.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <OwnerSignupForm />;
}
