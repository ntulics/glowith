import { headers } from "next/headers";
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

  // ── Tenant-match guard ─────────────────────────────────────────────────────
  // If the request arrived via a subdomain (e.g. lumestudio.glowith.co.za),
  // middleware injects x-tenant-slug. We verify the logged-in provider's handle
  // matches that slug so one tenant can never see another's dashboard.
  // ADMIN role bypasses the check and can view any tenant's dashboard.
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug");

  if (tenantSlug && user.role !== "ADMIN") {
    const profileHandle = profile.handle.replace("@", "");
    if (profileHandle !== tenantSlug) {
      // Wrong tenant — sign them out to the correct subdomain's login
      redirect(`/login?error=wrong_tenant&tenant=${tenantSlug}`);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      <Sidebar businessName={profile.businessName} handle={profile.handle} role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
