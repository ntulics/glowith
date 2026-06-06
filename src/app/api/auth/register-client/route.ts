import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

// Lightweight client (customer) sign-up — used by the booking flow.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a name, valid email and a password of at least 8 characters" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists — sign in instead" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "CLIENT",
      // Mark email as verified since they completed the OTP flow before reaching here
      emailVerified: new Date()
    }
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
