import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { clearAuthCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
  let allDevices = false;
  try {
    const body = await request.json();
    allDevices = Boolean(body?.allDevices);
  } catch {
    // no body / not JSON — default to single-device logout
  }

  if (allDevices) {
    const user = await getCurrentUser();
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: { refreshTokenVersion: { increment: 1 } },
      });
    }
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
