import type { User } from "@prisma/client";

export function toSafeUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, refreshTokenVersion: _refreshTokenVersion, ...safe } = user;
  return safe;
}
