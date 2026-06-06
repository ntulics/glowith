import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, token, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: `reset:${normalizedEmail}`, token } },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Link is invalid or has expired." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email: normalizedEmail }, data: { password: hashed } });
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: `reset:${normalizedEmail}`, token } },
  });

  return NextResponse.json({ ok: true });
}
