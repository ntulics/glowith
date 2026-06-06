import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InboxView } from "@/components/dashboard/inbox-view";

export default async function InboxPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) redirect("/login");

  return (
    <Suspense>
      <InboxView myId={user.id} />
    </Suspense>
  );
}
