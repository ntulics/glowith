import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = session.user as any;

  if (user.role !== "PROVIDER" && user.role !== "ADMIN") {
    redirect("/");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) {
    redirect("/signup");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      <Sidebar businessName={profile.businessName} handle={profile.handle} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
