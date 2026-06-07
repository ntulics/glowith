import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountShell } from "@/components/account/account-shell";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const user = session.user as any;
  return (
    <AccountShell userName={user.name ?? ""} userEmail={user.email ?? ""}>
      {children}
    </AccountShell>
  );
}
