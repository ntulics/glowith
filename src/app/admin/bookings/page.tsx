import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  PENDING_DEPOSIT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  EXPIRED: "bg-amber-50 text-amber-700"
};
const STATUS_LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired"
};

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { client: true, service: true, providerProfile: true }
  });

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-black">All Bookings</h1>
          <p className="text-xs text-gray-400">{bookings.length} total</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              {["Date", "Client", "Provider", "Service", "Deposit", "Status"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-500 text-xs">{format(b.startsAt, "d MMM yyyy, h:mm a")}</td>
                <td className="px-5 py-3 font-semibold">{b.client.name}</td>
                <td className="px-5 py-3 text-gray-500">{b.providerProfile.businessName}</td>
                <td className="px-5 py-3 text-gray-500">{b.service.name}</td>
                <td className="px-5 py-3 font-semibold">{formatZAR(b.depositCents)}</td>
                <td className="px-5 py-3">
                  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", STATUS_STYLE[b.status])}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-semibold text-gray-400">No bookings yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
