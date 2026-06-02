import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Users</h1>
        <p className="text-xs text-gray-400">{users.length} total</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              {["Name", "Email", "Role", "Joined"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-semibold">{u.name}</td>
                <td className="px-5 py-3 text-gray-500">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.role === "ADMIN" ? "bg-red-50 text-red-700" : u.role === "PROVIDER" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">{format(u.createdAt, "d MMM yyyy")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
