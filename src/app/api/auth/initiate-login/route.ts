// Web-facing pre-login endpoint: validates password, sends OTP, returns MFA ticket.
// The credentials NextAuth provider still exists for iOS compatibility —
// this route avoids it on web so we can return the MFA state to the client
// without depending on NextAuth's error URL encoding.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, totpEnabled: true }
  });

  // Constant-time rejection — always bcrypt even when user not found
  const dummyHash = "$2b$12$abcdefghijklmnopqrstuvuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu";
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  // Email MFA is disabled — only TOTP is enforced (opt-in from Security settings).
  if (!user.totpEnabled) {
    // Password is valid, no MFA required — tell the client to proceed directly.
    return NextResponse.json({ proceed: true, email });
  }

  // TOTP user — issue a ticket; client will show the TOTP prompt.
  const ticket = crypto.randomBytes(20).toString("hex");
  const ticketHash = crypto.createHash("sha256").update(ticket).digest("hex");
  await prisma.verificationToken.deleteMany({ where: { identifier: `mfa_ticket:${email}` } });
  await prisma.verificationToken.create({
    data: {
      identifier: `mfa_ticket:${email}`,
      token: ticketHash,
      expires: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  return NextResponse.json({ email, ticket, method: "totp" });
}
