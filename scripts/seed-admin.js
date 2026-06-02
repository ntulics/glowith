/**
 * seed-admin.js — runs inside Azure at startup via start.sh
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from env vars (Azure App Settings).
 * - If the user doesn't exist: creates them as ADMIN
 * - If they exist: promotes to ADMIN if needed AND always re-syncs the password hash
 *   so that changing ADMIN_PASSWORD in Azure App Settings takes effect on next deploy
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
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Always re-sync role + password hash so Azure App Setting changes take effect
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN", passwordHash }
      });
      console.log(`[seed-admin] Admin ${email} updated (role=ADMIN, password synced).`);
      return;
    }

    // Create fresh admin user with ProviderProfile stub
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
  } finally {
    await prisma.$disconnect();
  }
}

main();
