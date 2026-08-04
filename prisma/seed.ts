/**
 * Seeds demo data: a handful of shops across different categories (salon,
 * gym, repair shop), each with services, staff, business hours, a demo
 * client, and a few sample appointments. This gives a brand-new deployment
 * something realistic to look at before real shops sign up.
 *
 * Safe to re-run — each tenant is looked up by slug first and skipped if it
 * already exists, so running `npm run db:seed` again won't create
 * duplicates or wipe real data.
 *
 * This is a starting point. The exact content (specific "issues and
 * solutions" scenarios per shop type) is meant to be refined later — the
 * mechanism here (idempotent, category-varied, one-command) is the
 * mandatory part; the demo content itself can be swapped or expanded
 * without changing how seeding works.
 */
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

const DEMO_PASSWORD = "Demo1234!"; // demo-only credential, not for production use

const STANDARD_HOURS = {
  monday: { closed: false, open: "09:00", close: "18:00" },
  tuesday: { closed: false, open: "09:00", close: "18:00" },
  wednesday: { closed: false, open: "09:00", close: "18:00" },
  thursday: { closed: false, open: "09:00", close: "18:00" },
  friday: { closed: false, open: "09:00", close: "18:00" },
  saturday: { closed: false, open: "10:00", close: "16:00" },
  sunday: { closed: true, open: "09:00", close: "18:00" },
};

interface DemoStaff {
  name: string;
  email: string;
  title: string;
}
interface DemoService {
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
}
interface DemoShop {
  slug: string;
  name: string;
  category: string;
  description: string;
  ownerName: string;
  ownerEmail: string;
  staff: DemoStaff[];
  services: DemoService[];
  demoClient: { name: string; email: string };
}

const DEMO_SHOPS: DemoShop[] = [
  {
    slug: "glow-salon",
    name: "Glow Salon",
    category: "Salon",
    description: "A neighborhood hair and beauty salon offering cuts, color, and spa treatments.",
    ownerName: "Priya Sharma",
    ownerEmail: "owner@glow-salon.demo",
    staff: [
      { name: "Ananya Rao", email: "ananya@glow-salon.demo", title: "Senior Stylist" },
      { name: "Kabir Mehta", email: "kabir@glow-salon.demo", title: "Colour Specialist" },
    ],
    services: [
      { name: "Haircut & Style", description: "Wash, cut, and blow-dry.", durationMin: 45, priceCents: 80000 },
      { name: "Full Colour", description: "Full head colour with gloss finish.", durationMin: 120, priceCents: 350000 },
      { name: "Spa Package", description: "60-minute relaxation facial + head massage.", durationMin: 60, priceCents: 220000 },
    ],
    demoClient: { name: "Meera Nair", email: "client@glow-salon.demo" },
  },
  {
    slug: "ironclad-gym",
    name: "Ironclad Gym",
    category: "Gym",
    description: "Strength and conditioning gym with personal training and group classes.",
    ownerName: "Vikram Singh",
    ownerEmail: "owner@ironclad-gym.demo",
    staff: [{ name: "Rohan Desai", email: "rohan@ironclad-gym.demo", title: "Head Trainer" }],
    services: [
      { name: "Personal Training Session", description: "One-on-one strength coaching.", durationMin: 60, priceCents: 150000 },
      { name: "Group HIIT Class", description: "High-intensity interval training, small group.", durationMin: 45, priceCents: 60000 },
    ],
    demoClient: { name: "Arjun Kapoor", email: "client@ironclad-gym.demo" },
  },
  {
    slug: "fixit-repairs",
    name: "FixIt Repairs",
    category: "Repair Shop",
    description: "Phone, laptop, and small appliance repair with same-day service.",
    ownerName: "Sana Iqbal",
    ownerEmail: "owner@fixit-repairs.demo",
    staff: [{ name: "Farhan Ali", email: "farhan@fixit-repairs.demo", title: "Lead Technician" }],
    services: [
      { name: "Screen Replacement", description: "Phone or tablet screen replacement.", durationMin: 60, priceCents: 250000 },
      { name: "Diagnostic Check", description: "Full diagnostic for any device issue.", durationMin: 30, priceCents: 30000 },
    ],
    demoClient: { name: "Neha Gupta", email: "client@fixit-repairs.demo" },
  },
];

async function seedShop(shop: DemoShop) {
  const existing = await db.tenant.findUnique({ where: { slug: shop.slug } });
  if (existing) {
    console.log(`↷ Skipping "${shop.name}" — already seeded (slug: ${shop.slug}).`);
    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const tenant = await db.tenant.create({
    data: {
      slug: shop.slug,
      name: shop.name,
      category: shop.category,
      description: shop.description,
      status: "ACTIVE",
      businessHours: STANDARD_HOURS,
    },
  });

  await db.user.create({
    data: {
      tenantId: tenant.id,
      name: shop.ownerName,
      email: shop.ownerEmail,
      passwordHash,
      role: "OWNER",
      isEmailVerified: true,
    },
  });

  await db.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "FREE_TRIAL",
      status: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  const staffRecords = await Promise.all(
    shop.staff.map((s) =>
      db.user.create({
        data: {
          tenantId: tenant.id,
          name: s.name,
          email: s.email,
          passwordHash,
          role: "STAFF",
          title: s.title,
          isEmailVerified: true,
        },
      })
    )
  );

  const serviceRecords = await Promise.all(
    shop.services.map((s) =>
      db.service.create({
        data: {
          tenantId: tenant.id,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
        },
      })
    )
  );

  const client = await db.user.create({
    data: {
      tenantId: tenant.id,
      name: shop.demoClient.name,
      email: shop.demoClient.email,
      passwordHash,
      role: "CLIENT",
      isEmailVerified: true,
    },
  });

  // A couple of sample appointments: one already completed, one upcoming.
  const service = serviceRecords[0];
  const staffMember = staffRecords[0];

  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 3);
  pastStart.setHours(11, 0, 0, 0);

  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 2);
  futureStart.setHours(14, 0, 0, 0);

  await db.appointment.create({
    data: {
      tenantId: tenant.id,
      serviceId: service.id,
      staffId: staffMember?.id,
      clientId: client.id,
      startAt: pastStart,
      endAt: new Date(pastStart.getTime() + service.durationMin * 60_000),
      status: "COMPLETED",
    },
  });

  await db.appointment.create({
    data: {
      tenantId: tenant.id,
      serviceId: service.id,
      staffId: staffMember?.id,
      clientId: client.id,
      startAt: futureStart,
      endAt: new Date(futureStart.getTime() + service.durationMin * 60_000),
      status: "CONFIRMED",
    },
  });

  console.log(`✅ Seeded "${shop.name}" (/${shop.slug}) — owner login: ${shop.ownerEmail} / ${DEMO_PASSWORD}`);
}

async function main() {
  console.log("Seeding demo shops...\n");
  for (const shop of DEMO_SHOPS) {
    await seedShop(shop);
  }
  console.log("\nDone. All demo accounts use the password:", DEMO_PASSWORD);
  console.log("(Demo data only — never reuse this password for a real account.)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
