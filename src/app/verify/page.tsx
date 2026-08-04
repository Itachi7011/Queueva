import type { Metadata } from "next";
import { VerifyForm } from "@/components/auth/VerifyForm";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return <VerifyForm />;
}
