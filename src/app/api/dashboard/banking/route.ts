import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSubaccount, updateSubaccount, listBanks, resolveAccountName } from "@/lib/paystack";

// GET /api/dashboard/banking — list SA banks + return current provider banking info
export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [banks, profile] = await Promise.all([
    listBanks(),
    prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: { bankName: true, bankCode: true, bankAccountNumber: true, bankAccountName: true, paystackSubaccountCode: true }
    })
  ]);

  return NextResponse.json({ banks, banking: profile });
}

// POST /api/dashboard/banking — save banking details + auto-create/update Paystack subaccount
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bankCode, accountNumber, accountName: providedAccountName } = await request.json();
  if (!bankCode || !accountNumber || !providedAccountName) {
    return NextResponse.json({ error: "bankCode, accountNumber and accountName are required" }, { status: 400 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, businessName: true, paystackSubaccountCode: true }
  });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  // Try to verify via Paystack; fall back to the provider-supplied name if unsupported
  const resolvedName = await resolveAccountName(accountNumber, bankCode);
  const accountName = resolvedName ?? providedAccountName;

  // Get the bank name from our banks list
  const banks = await listBanks();
  const bank = banks.find((b) => b.code === bankCode);
  const bankName = bank?.name ?? bankCode;

  // Get platform cut from config
  const config = await prisma.platformConfig.findUnique({ where: { id: "global" } });
  const platformPercent = config?.depositPercent ?? 20;

  // Create or update Paystack subaccount
  let subaccountCode = profile.paystackSubaccountCode;
  if (subaccountCode) {
    await updateSubaccount(subaccountCode, {
      accountName,
      bankCode,
      accountNumber,
      platformPercent,
    });
  } else {
    const result = await createSubaccount({
      businessName: profile.businessName,
      accountName,
      bankCode,
      accountNumber,
      platformPercent,
    });
    subaccountCode = result.subaccountCode;
  }

  // Persist to DB
  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { bankName, bankCode, bankAccountNumber: accountNumber, bankAccountName: accountName, paystackSubaccountCode: subaccountCode }
  });

  return NextResponse.json({ success: true, accountName, bankName, subaccountCode });
}
