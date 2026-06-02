import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
  handle: z.string().regex(/^@[a-z0-9]+$/, "Handle must be @lowercaseletters"),
  category: z.string()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, email, password, businessName, handle, category } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const handleExists = await prisma.providerProfile.findUnique({ where: { handle } });
  if (handleExists) {
    return NextResponse.json({ error: "That studio name is already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "PROVIDER",
      providerProfile: {
        create: {
          handle,
          businessName,
          category,
          bio: "",
          city: "",
          latitude: 0,
          longitude: 0
        }
      }
    }
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}
