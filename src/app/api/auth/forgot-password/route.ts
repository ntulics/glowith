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

  // Always return 200 to avoid leaking account existence
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
  await prisma.verificationToken.create({
    data: { identifier: `reset:${email}`, token, expires }
  });

  const resetURL = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: "Reset your Glowith password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#E85D2F">Reset your password</h2>
        <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
        <a href="${resetURL}" style="display:inline-block;background:#E85D2F;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
          Reset password
        </a>
        <p style="color:#666;font-size:14px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Reset your Glowith password: ${resetURL}`
  });

  return NextResponse.json({ ok: true });
}
