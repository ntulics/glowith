import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — returns platform-level config needed by providers
// to show revenue breakdowns in their dashboard.
export async function GET() {
  const config = await prisma.platformConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", depositPercent: 20, verificationFee: 15000 },
  });
  return NextResponse.json({ depositPercent: config.depositPercent });
}
