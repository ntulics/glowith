import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — return current verification state + fee for this provider
export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, config] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, verified: true },
    }),
    prisma.platformConfig.findUnique({ where: { id: "global" } }),
  ]);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const feeCents = config?.verificationFee ?? 15000;

  const latest = await prisma.verificationRequest.findFirst({
    where: { providerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    include: { documents: true },
  });

  return NextResponse.json({ verified: profile.verified, feeCents, latest });
}

// POST — submit a new verification request (creates request + stores doc URLs)
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { govIdUrl, proofOfAddressUrl, proofOfBankUrl, paymentRef, trigger } = await request.json();

  if (!govIdUrl || !proofOfAddressUrl || !proofOfBankUrl) {
    return NextResponse.json({ error: "All three documents are required" }, { status: 400 });
  }

  const [profile, config] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { userId: user.id }, select: { id: true, verified: true } }),
    prisma.platformConfig.findUnique({ where: { id: "global" } }),
  ]);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const feeCents = config?.verificationFee ?? 15000;

  // If re-verification, mark provider unverified immediately
  if (profile.verified && trigger && trigger !== "INITIAL") {
    await prisma.providerProfile.update({ where: { id: profile.id }, data: { verified: false } });
  }

  const req = await prisma.verificationRequest.create({
    data: {
      providerProfileId: profile.id,
      feeCents,
      paymentRef: paymentRef ?? null,
      paid: !!paymentRef,
      trigger: trigger ?? "INITIAL",
      documents: {
        create: [
          { type: "GOV_ID", fileUrl: govIdUrl },
          { type: "PROOF_OF_ADDRESS", fileUrl: proofOfAddressUrl },
          { type: "PROOF_OF_BANK", fileUrl: proofOfBankUrl },
        ],
      },
    },
  });

  return NextResponse.json({ id: req.id }, { status: 201 });
}
