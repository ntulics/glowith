// Resend the MFA email OTP given a valid ticket (proves the user passed the password check)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMFAEmailOTP } from "@/lib/auth";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
  ticket: z.string()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { email, ticket } = parsed.data;
  const normalEmail = email.trim().toLowerCase();
  const ticketHash = crypto.createHash("sha256").update(ticket).digest("hex");

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: `mfa_ticket:${normalEmail}`, token: ticketHash } }
  });
  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Session expired — please sign in again" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: normalEmail }, select: { totpEnabled: true } });
  if (user?.totpEnabled) {
    return NextResponse.json({ error: "TOTP is enabled — use your authenticator app" }, { status: 400 });
  }

  await sendMFAEmailOTP(normalEmail);
  return NextResponse.json({ ok: true });
}
