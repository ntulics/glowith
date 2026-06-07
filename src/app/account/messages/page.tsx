import { auth } from "@/lib/auth";
import { InboxView } from "@/components/dashboard/inbox-view";

export const dynamic = "force-dynamic";

export default async function AccountMessagesPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <InboxView myId={userId} />
    </div>
  );
}
