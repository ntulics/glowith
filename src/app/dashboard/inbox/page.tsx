import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { MessageCircle } from "lucide-react";

export default async function InboxPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/signup");

  const messages = await prisma.message.findMany({
    where: { providerProfileId: profile.id },
    include: { sender: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Inbox</h1>
        <span className="rounded-full bg-[#D94472]/10 px-2.5 py-0.5 text-xs font-bold text-[#D94472]">
          {messages.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <MessageCircle className="h-10 w-10 text-gray-200" />
            <p className="mt-3 text-sm font-semibold text-gray-400">No messages yet</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D94472]/10 text-sm font-black text-[#D94472]">
              {m.sender.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{m.sender.name}</p>
                <p className="text-xs text-gray-400">{format(m.createdAt, "d MMM, h:mm a")}</p>
              </div>
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
