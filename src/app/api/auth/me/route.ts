import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/safe-user";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("Not authenticated.", 401);
  return NextResponse.json({ user: toSafeUser(user) });
}
