/**
 * Bootstraps the platform SUPER_ADMIN account. There is intentionally no
 * public sign-up route for this role — run this once against your database.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=you@queueva.com SUPER_ADMIN_PASSWORD=StrongPass1 \
 *   SUPER_ADMIN_NAME="Platform Admin" npm run bootstrap:admin
 */
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || "Platform Admin";

  if (!email || !password) {
    console.error(
      "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars before running this script."
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("SUPER_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await db.user.findFirst({ where: { tenantId: null, email } });
  if (existing) {
    console.log(`ℹ️  A super admin with email ${email} already exists. Nothing to do.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await db.user.create({
    data: {
      tenantId: null,
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isEmailVerified: true, // trusted, operator-created account
    },
  });

  console.log(`✅ Super admin created: ${admin.email} (id: ${admin.id})`);
  console.log("   Log in at /login with the shop URL field left blank.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
