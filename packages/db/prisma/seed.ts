import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@foundercrm.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const name = process.env.SEED_ADMIN_NAME ?? "Founder";

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, password: hashed, role: "ADMIN" },
  });
  console.log(`Seeded user: ${user.email} (${user.id})`);

  const sunshine = await prisma.product.upsert({
    where: { slug: "sunshine-dental" },
    update: {},
    create: {
      name: "Sunshine Dental",
      slug: "sunshine-dental",
      description: "Practice management software for dental clinics.",
      website: "https://sunshine-dental.example.com",
    },
  });

  const finance = await prisma.product.upsert({
    where: { slug: "finance-manager" },
    update: {},
    create: {
      name: "Finance Manager",
      slug: "finance-manager",
      description: "Standalone personal & small-business finance manager.",
      website: "https://finance-manager.example.com",
    },
  });

  const tasks = await prisma.product.upsert({
    where: { slug: "task-manager" },
    update: {},
    create: {
      name: "Task Manager",
      slug: "task-manager",
      description: "Standalone task manager for individuals and small teams.",
      website: "https://task-manager.example.com",
    },
  });

  await prisma.campaign.upsert({
    where: { id: "campaign-sunshine-hu" },
    update: {},
    create: {
      id: "campaign-sunshine-hu",
      name: "Hungarian Dental Clinics June 2026",
      productId: sunshine.id,
      targetMarket: "Hungary",
      status: "ACTIVE",
    },
  });

  await prisma.campaign.upsert({
    where: { id: "campaign-finance-advisors" },
    update: {},
    create: {
      id: "campaign-finance-advisors",
      name: "Financial Advisors July 2026",
      productId: finance.id,
      targetMarket: "EU",
      status: "DRAFT",
    },
  });

  await prisma.emailTemplate.upsert({
    where: { id: "template-sunshine-intro" },
    update: {},
    create: {
      id: "template-sunshine-intro",
      name: "Sunshine Dental Intro",
      subject: "Helping {{company}} streamline patient bookings",
      body: `Hi {{firstName}},

I noticed {{company}}'s website and wanted to reach out. I build Sunshine Dental, a practice management tool that helps dental clinics reduce no-shows and save admin time.

Would you be open to a quick 15-minute call this week to see if it's a fit?

Best,
Founder`,
      productId: sunshine.id,
    },
  });

  await prisma.emailTemplate.upsert({
    where: { id: "template-followup" },
    update: {},
    create: {
      id: "template-followup",
      name: "Generic Follow-up",
      subject: "Following up — {{company}}",
      body: `Hi {{firstName}},

Just bumping this up in your inbox. Happy to walk you through {{productName}} whenever works for you.

Best,
Founder`,
    },
  });

  const sampleContacts = [
    {
      firstName: "Anna",
      lastName: "Kovacs",
      company: "Budapest Smile Clinic",
      email: "anna@budapestsmile.hu",
      country: "Hungary",
      industry: "Dental",
      website: "https://budapestsmile.hu",
      productId: sunshine.id,
      status: "NEW" as const,
    },
    {
      firstName: "Peter",
      lastName: "Nagy",
      company: "Debrecen Dental",
      email: "peter@debrecendental.hu",
      country: "Hungary",
      industry: "Dental",
      website: "https://debrecendental.hu",
      productId: sunshine.id,
      status: "CONTACTED" as const,
    },
    {
      firstName: "Maria",
      lastName: "Szabo",
      company: "Szeged Finance Advisory",
      email: "maria@szegedfinance.hu",
      country: "Hungary",
      industry: "Finance",
      website: "https://szegedfinance.hu",
      productId: finance.id,
      status: "REPLIED" as const,
    },
  ];

  for (const c of sampleContacts) {
    await prisma.contact.upsert({
      where: { email: c.email },
      update: {},
      create: c,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
