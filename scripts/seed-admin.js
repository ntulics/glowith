/**
 * seed-admin.js — runs inside Azure at startup via start.sh
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from env vars (set in Azure App Settings).
 * - If the user doesn't exist: creates them as ADMIN with a ProviderProfile stub
 * - If they exist but aren't ADMIN: promotes them
 * - If they're already ADMIN: no-op
 *
 * Safe to run on every boot — idempotent.
 */

"use strict";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("[seed-admin] ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping.");
    return;
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role !== "ADMIN") {
        await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
        console.log(`[seed-admin] Promoted ${email} to ADMIN.`);
      } else {
        console.log(`[seed-admin] Admin ${email} already exists — no changes.`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name: "Super Admin",
        passwordHash,
        role: "ADMIN",
        providerProfile: {
          create: {
            handle: "@admin",
            businessName: "Glowith Admin",
            category: "Hair",
            bio: "Platform administrator",
            city: "Johannesburg",
            latitude: -26.2041,
            longitude: 28.0473,
            verified: true
          }
        }
      }
    });

    console.log(`[seed-admin] Admin user created: ${email}`);
  } catch (err) {
    console.error("[seed-admin] Failed:", err.message);
    // Non-fatal — server starts regardless
  } finally {
    await prisma.$disconnect();
  }
}

main();
