import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";

const sendSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), otp: z.string().length(6) });

// POST { email } — send a 6-digit OTP for password reset
export async function POST(request: Request) {
  const body = await request.json();
  const action = body.action ?? "send";

  if (action === "send") {
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

    const email = parsed.data.email.toLowerCase().trim();
    // Always return 200 to avoid leaking account existence
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: true });

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashed = crypto.createHash("sha256").update(otp).digest("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.verificationToken.deleteMany({ where: { identifier: `pwd_reset_otp:${email}` } });
    await prisma.verificationToken.create({
      data: { identifier: `pwd_reset_otp:${email}`, token: hashed, expires }
    });

    await sendEmail({
      to: email,
      subject: "Your Glowith password reset code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#E85D2F">Reset your password</h2>
          <p>Enter this code to reset your password. It expires in 10 minutes.</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#1F1B1C;padding:20px 0">${otp}</div>
          <p style="color:#666;font-size:14px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your Glowith password reset code is: ${otp} (expires in 10 minutes)`
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "verify") {
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const email = parsed.data.email.toLowerCase().trim();
    const hashed = crypto.createHash("sha256").update(parsed.data.otp).digest("hex");

    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: `pwd_reset_otp:${email}`, token: hashed } }
    });

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Code is incorrect or has expired." }, { status: 400 });
    }

    // Issue a short-lived reset token (same mechanism as link-based reset)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `pwd_reset_otp:${email}`, token: hashed } }
    });
    await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
    await prisma.verificationToken.create({
      data: { identifier: `reset:${email}`, token: resetToken, expires: resetExpires }
    });

    return NextResponse.json({ ok: true, resetToken });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
