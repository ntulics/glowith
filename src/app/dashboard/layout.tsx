import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const user = session.user as any;
  if (user.role !== "PROVIDER" && user.role !== "ADMIN") redirect("/");

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: {
      parentBusiness: { select: { handle: true, businessName: true } }
    }
  });

  if (!profile) redirect("/signup");

  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug");

  // ── Tenant guard ───────────────────────────────────────────────────────────
  if (tenantSlug && user.role !== "ADMIN") {
    if (tenantSlug === "freelancer") {
      // Only standalone freelancers may access freelancer.*
      if (profile.providerType !== "FREELANCER" || profile.parentBusinessId) {
        redirect("/login?error=not_a_freelancer");
      }
    } else {
      // Business subdomain — must be the owner or one of its agents
      const effectiveSlug =
        profile.providerType === "BUSINESS"
          ? profile.handle.replace("@", "")
          : profile.parentBusiness?.handle.replace("@", "") ?? null;

      if (effectiveSlug !== tenantSlug) {
        redirect(`/login?error=wrong_tenant&tenant=${tenantSlug}`);
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Display name context
  const displayName =
    profile.providerType === "BUSINESS"
      ? profile.businessName
      : profile.parentBusiness
      ? `${profile.businessName} · ${profile.parentBusiness.businessName}`
      : profile.businessName;

  return (
    <DashboardShell
      businessName={displayName}
      handle={profile.handle}
      providerType={profile.providerType}
      role={user.role}
    >
      {children}
    </DashboardShell>
  );
}
