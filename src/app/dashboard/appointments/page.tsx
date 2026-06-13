import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppointmentsView } from "@/components/dashboard/appointments-view";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AppointmentsView />;
}
