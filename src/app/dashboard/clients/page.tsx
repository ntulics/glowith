import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function ClientsPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { bookings: { include: { client: true, service: true }, orderBy: { startsAt: "desc" } } }
  });

  if (!profile) redirect("/signup");

  // Aggregate clients
  const clientMap = new Map<string, { name: string; email: string; bookings: number; totalSpent: number; lastVisit: Date }>();
  for (const b of profile.bookings) {
    const existing = clientMap.get(b.clientId);
    if (existing) {
      existing.bookings++;
      existing.totalSpent += b.depositCents;
      if (b.startsAt > existing.lastVisit) existing.lastVisit = b.startsAt;
    } else {
      clientMap.set(b.clientId, { name: b.client.name, email: b.client.email, bookings: 1, totalSpent: b.depositCents, lastVisit: b.startsAt });
    }
  }
  const clients = Array.from(clientMap.values()).sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());

  const formatZAR = (cents: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Clients</h1>
        <span className="text-sm text-gray-400">{clients.length} total</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              {["Client", "Email", "Bookings", "Total spent", "Last visit"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D94472]/10 text-xs font-black text-[#D94472]">
                      {c.name[0]}
                    </div>
                    <span className="font-semibold">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500">{c.email}</td>
                <td className="px-5 py-3 font-semibold">{c.bookings}</td>
                <td className="px-5 py-3 font-semibold">{formatZAR(c.totalSpent)}</td>
                <td className="px-5 py-3 text-gray-500">{format(c.lastVisit, "d MMM yyyy")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-semibold text-gray-400">No clients yet — bookings will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
