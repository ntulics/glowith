import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  return user?.role === "ADMIN" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const names = await prisma.restrictedName.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ names });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, reason } = await request.json();
  if (!name || typeof name !== "string") return NextResponse.json({ error: "Name required" }, { status: 400 });
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  try {
    const entry = await prisma.restrictedName.create({ data: { name: clean, reason, createdBy: admin.id } });
    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Name already restricted" }, { status: 409 });
  }
}
