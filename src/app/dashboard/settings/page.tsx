import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/dashboard/settings-view";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { parentBusiness: { select: { businessName: true, handle: true } } }
  });
  if (!profile) redirect("/signup");

  return (
    <SettingsView
      providerType={profile.providerType}
      parentBusinessName={profile.parentBusiness?.businessName ?? null}
      parentBusinessHandle={profile.parentBusiness?.handle ?? null}
      profile={{
        id: profile.id,
        businessName: profile.businessName,
        handle: profile.handle,
        bio: profile.bio,
        city: profile.city,
        category: profile.category,
        avatarUrl: profile.avatarUrl,
        mobile: profile.mobile,
        studio: profile.studio,
        latitude: profile.latitude,
        longitude: profile.longitude
      }}
    />
  );
}
