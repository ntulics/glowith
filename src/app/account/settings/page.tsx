import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSettings } from "@/components/account/account-settings";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, totpEnabled: true }
  });

  return (
    <AccountSettings
      userId={userId}
      name={user?.name ?? ""}
      email={user?.email ?? ""}
      totpEnabled={user?.totpEnabled ?? false}
    />
  );
}
