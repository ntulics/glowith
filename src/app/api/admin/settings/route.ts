import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  return user?.role === "ADMIN" ? user : null;
}

async function getConfig() {
  return prisma.platformConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", depositPercent: 20, verificationFee: 15000 }
  });
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await getConfig();
  return NextResponse.json({ depositPercent: config.depositPercent, verificationFee: config.verificationFee });
}

export async function PUT(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { depositPercent, verificationFee } = await request.json();

  const data: Record<string, number> = {};

  if (depositPercent !== undefined) {
    const pct = parseInt(depositPercent, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: "Deposit percent must be between 0 and 100" }, { status: 400 });
    }
    data.depositPercent = pct;
  }

  if (verificationFee !== undefined) {
    const fee = parseInt(verificationFee, 10);
    if (isNaN(fee) || fee < 0) {
      return NextResponse.json({ error: "Verification fee must be a positive number" }, { status: 400 });
    }
    data.verificationFee = fee;
  }

  await getConfig();
  const config = await prisma.platformConfig.update({ where: { id: "global" }, data });
  return NextResponse.json({ depositPercent: config.depositPercent, verificationFee: config.verificationFee });
}
