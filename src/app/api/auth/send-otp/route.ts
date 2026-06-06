import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists — sign in instead" }, { status: 409 });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert into VerificationToken (identifier = email, token = hash)
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token: otpHash, expires }
  });

  await sendEmail({
    to: email,
    subject: "Your Glowith verification code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#E85D2F">Your verification code</h2>
        <p style="font-size:48px;font-weight:bold;letter-spacing:8px;color:#1a1a1a">${otp}</p>
        <p style="color:#666">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
    text: `Your Glowith verification code: ${otp} (valid for 10 minutes)`
  });

  return NextResponse.json({ ok: true });
}
