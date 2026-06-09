import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSettings } from "@/components/account/account-settings";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, totpEnabled: true, phoneNumber: true, phoneWhatsApp: true, addressLine1: true, addressLine2: true, city: true, province: true, postalCode: true }
  });

  return (
    <AccountSettings
      userId={userId}
      name={user?.name ?? ""}
      email={user?.email ?? ""}
      totpEnabled={user?.totpEnabled ?? false}
      phoneNumber={user?.phoneNumber}
      phoneWhatsApp={user?.phoneWhatsApp}
      addressLine1={user?.addressLine1}
      addressLine2={user?.addressLine2}
      city={user?.city}
      province={user?.province}
      postalCode={user?.postalCode}
    />
  );
}
