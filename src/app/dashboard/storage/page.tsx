import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StorageView } from "@/components/dashboard/storage-view";

export default async function StoragePage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: {
      agents: { select: { id: true, businessName: true, storageBytes: true, storageQuotaBytes: true } },
      parentBusiness: { select: { businessName: true, storageBytes: true, storageQuotaBytes: true } }
    }
  });
  if (!profile) redirect("/signup");

  const isBusiness = profile.providerType === "BUSINESS";
  const num = (b: bigint) => Number(b);

  return (
    <StorageView
      isBusiness={isBusiness}
      businessName={profile.businessName}
      used={num(profile.storageBytes)}
      quota={num(profile.storageQuotaBytes)}
      sharedUsed={isBusiness ? num(profile.storageBytes) + profile.agents.reduce((s, a) => s + num(a.storageBytes), 0) : null}
      agents={profile.agents.map((a) => ({ id: a.id, name: a.businessName, used: num(a.storageBytes), quota: num(a.storageQuotaBytes) }))}
      parentBusinessName={profile.parentBusiness?.businessName ?? null}
    />
  );
}
