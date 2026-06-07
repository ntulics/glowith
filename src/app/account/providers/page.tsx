import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountProviders } from "@/components/account/account-providers";

export const dynamic = "force-dynamic";

export default async function AccountProvidersPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;

  // Get customer's saved providers list so we can show bookmark state
  const [savedRows, followRows] = await Promise.all([
    prisma.savedProvider.findMany({ where: { userId }, select: { providerProfileId: true } }),
    prisma.follow.findMany({ where: { userId }, select: { providerProfileId: true } })
  ]);

  return (
    <AccountProviders
      savedIds={savedRows.map((r) => r.providerProfileId)}
      followedIds={followRows.map((r) => r.providerProfileId)}
    />
  );
}
