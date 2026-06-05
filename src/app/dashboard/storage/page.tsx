import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StorageView } from "@/components/dashboard/storage-view";

export const dynamic = "force-dynamic";

const TWO_GB = 2 * 1024 * 1024 * 1024;
const TWENTY_GB = 20 * 1024 * 1024 * 1024;

export default async function StoragePage() {
  const session = await auth();
  const user = session?.user as any;

  const base = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, businessName: true, providerType: true, parentBusinessId: true }
  });
  if (!base) redirect("/signup");

  const isBusiness = base.providerType === "BUSINESS";
  const num = (b: bigint | number | null | undefined) => Number(b ?? 0);

  let used = 0;
  let quota = isBusiness ? TWENTY_GB : TWO_GB;
  let agents: { id: string; name: string; used: number; quota: number }[] = [];
  let parentBusinessName: string | null = null;

  try {
    const full = await prisma.providerProfile.findUnique({
      where: { id: base.id },
      include: {
        agents: { select: { id: true, businessName: true, storageBytes: true, storageQuotaBytes: true } },
        parentBusiness: { select: { businessName: true } }
      }
    });
    if (full) {
      used = num(full.storageBytes);
      quota = num(full.storageQuotaBytes) || quota;
      agents = full.agents.map((a) => ({ id: a.id, name: a.businessName, used: num(a.storageBytes), quota: num(a.storageQuotaBytes) || TWO_GB }));
      parentBusinessName = full.parentBusiness?.businessName ?? null;
    }
  } catch { /* storage columns not available yet */ }

  const sharedUsed = isBusiness ? used + agents.reduce((s, a) => s + a.used, 0) : null;

  return (
    <StorageView
      isBusiness={isBusiness}
      businessName={base.businessName}
      used={used}
      quota={quota}
      sharedUsed={sharedUsed}
      agents={agents}
      parentBusinessName={parentBusinessName}
    />
  );
}
