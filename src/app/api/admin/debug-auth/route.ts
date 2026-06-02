import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Temporary debug endpoint — remove after login is confirmed working.
// GET /api/admin/debug-auth
// Returns whether the stored hash matches ADMIN_PASSWORD env var.
export async function GET() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    return NextResponse.json({ error: "ADMIN_EMAIL not set" });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, passwordHash: true }
  });

  if (!user) {
    return NextResponse.json({ userExists: false, email });
  }

  const hashPresent = !!user.passwordHash;
  const passwordMatch = hashPresent && password
    ? await bcrypt.compare(password, user.passwordHash!)
    : false;

  return NextResponse.json({
    userExists: true,
    email: user.email,
    role: user.role,
    hashPresent,
    passwordMatch,
    // Show first/last 3 chars of hash to confirm it's a valid bcrypt hash
    hashPreview: user.passwordHash
      ? `${user.passwordHash.slice(0, 7)}...${user.passwordHash.slice(-3)}`
      : null
  });
}
