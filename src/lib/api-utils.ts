import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: apiError("Request body must be valid JSON", 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      error: apiError("Validation failed", 422, result.error.flatten().fieldErrors),
    };
  }

  return { data: result.data };
}
