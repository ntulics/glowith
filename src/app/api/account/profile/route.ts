import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await request.json();
  const { name, phoneNumber, phoneWhatsApp, addressLine1, addressLine2, city, province, postalCode } = body;

  const data: Record<string, any> = {};
  if (name !== undefined) {
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
    data.name = name.trim();
  }
  if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
  if (phoneWhatsApp !== undefined) data.phoneWhatsApp = !!phoneWhatsApp;
  if (addressLine1 !== undefined) data.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) data.addressLine2 = addressLine2;
  if (city !== undefined) data.city = city;
  if (province !== undefined) data.province = province;
  if (postalCode !== undefined) data.postalCode = postalCode;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ ok: true });
}
