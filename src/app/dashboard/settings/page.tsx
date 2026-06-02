import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/dashboard/settings-view";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/signup");

  return (
    <SettingsView profile={{
      id: profile.id,
      businessName: profile.businessName,
      handle: profile.handle,
      bio: profile.bio,
      city: profile.city,
      category: profile.category,
      mobile: profile.mobile,
      studio: profile.studio
    }} />
  );
}
