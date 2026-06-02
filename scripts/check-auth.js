"use strict";
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
(async () => {
  const p = new PrismaClient();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  console.log("Email env:", email || "(not set)");
  console.log("Password env length:", password ? password.length : 0);
  const user = await p.user.findUnique({ where: { email } });
  console.log("User found:", !!user);
  console.log("Has hash:", !!user?.passwordHash);
  if (user?.passwordHash && password) {
    const match = await bcrypt.compare(password, user.passwordHash);
    console.log("Password match:", match);
  }
  await p.$disconnect();
})().catch(console.error);
