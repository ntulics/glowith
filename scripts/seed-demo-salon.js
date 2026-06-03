"use strict";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const LEGACY_DEMO_EMAIL = "demo.salon@glowith.co.za";
const DEMO_EMAIL = "bookings@demo.glowith.co.za";
const DEMO_PASSWORD = process.env.DEMO_SALON_PASSWORD || "GlowithDemo!2026";
const DEMO_HANDLE = "@demo";

const services = [
  { name: "Demo silk press", category: "Hair", durationMinutes: 90, priceCents: 85000, depositCents: 25000 },
  { name: "Demo colour gloss", category: "Hair", durationMinutes: 120, priceCents: 125000, depositCents: 35000 },
  { name: "Demo gel manicure", category: "Nails", durationMinutes: 75, priceCents: 52000, depositCents: 15000 },
  { name: "Demo bridal soft glam", category: "Makeup", durationMinutes: 60, priceCents: 70000, depositCents: 20000 }
];

const posts = [
  {
    imageUrl: "/images/glowith-hero.png",
    caption: "Demo salon hero look for walkthroughs",
    tags: ["demo", "hair", "glowith"],
    likes: 128,
    saves: 34
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    caption: "Soft glam demo portfolio",
    tags: ["demo", "makeup"],
    likes: 96,
    saves: 21
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    caption: "Gel set demo portfolio",
    tags: ["demo", "nails"],
    likes: 142,
    saves: 48
  }
];

async function main() {
  if (process.env.GLOWITH_SEED_DEMO_SALON !== "true") {
    console.log("[seed-demo-salon] GLOWITH_SEED_DEMO_SALON is not true — skipping.");
    return;
  }

  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const existingUser =
      (await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })) ||
      (await prisma.user.findUnique({ where: { email: LEGACY_DEMO_EMAIL } }));

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: DEMO_EMAIL,
            name: "Glowith Demo Stylist",
            role: "PROVIDER",
            passwordHash
          }
        })
      : await prisma.user.create({
          data: {
            email: DEMO_EMAIL,
            name: "Glowith Demo Stylist",
            role: "PROVIDER",
            passwordHash
          }
        });

    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        handle: DEMO_HANDLE,
        businessName: "Glowith Demo Salon",
        category: "Hair",
        bio: "A seeded salon for product demos, booking flows, dashboard testing, and marketplace walkthroughs.",
        city: "Rosebank, Johannesburg",
        latitude: -26.1458,
        longitude: 28.042,
        verified: true,
        mobile: true,
        studio: true
      },
      create: {
        userId: user.id,
        handle: DEMO_HANDLE,
        businessName: "Glowith Demo Salon",
        category: "Hair",
        bio: "A seeded salon for product demos, booking flows, dashboard testing, and marketplace walkthroughs.",
        city: "Rosebank, Johannesburg",
        latitude: -26.1458,
        longitude: 28.042,
        verified: true,
        mobile: true,
        studio: true
      }
    });

    for (const service of services) {
      const existing = await prisma.service.findFirst({
        where: { providerProfileId: profile.id, name: service.name }
      });

      if (existing) {
        await prisma.service.update({ where: { id: existing.id }, data: { ...service, active: true } });
      } else {
        await prisma.service.create({ data: { ...service, providerProfileId: profile.id } });
      }
    }

    await prisma.portfolioPost.deleteMany({
      where: { providerProfileId: profile.id, tags: { has: "demo" } }
    });

    await prisma.portfolioPost.createMany({
      data: posts.map((post) => ({ ...post, providerProfileId: profile.id }))
    });

    console.log(`[seed-demo-salon] Demo salon ready: ${DEMO_EMAIL} / ${DEMO_HANDLE}`);
  } catch (err) {
    console.error("[seed-demo-salon] Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
