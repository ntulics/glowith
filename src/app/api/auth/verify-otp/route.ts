import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email and 6-digit code required" }, { status: 400 });
  }

  const { email, otp } = parsed.data;
  const normalised = email.toLowerCase().trim();
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: normalised, token: otpHash } }
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid code — check and try again" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: normalised, token: otpHash } }
    });
    return NextResponse.json({ error: "This code has expired — request a new one" }, { status: 400 });
  }

  // Clean up the token — it's single-use
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: normalised, token: otpHash } }
  });

  return NextResponse.json({ ok: true, verified: true });
}
