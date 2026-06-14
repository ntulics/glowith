import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReviewForm } from "@/components/account/review-form";
import { mediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id as string;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: { select: { name: true } },
      providerProfile: {
        select: {
          id: true, businessName: true, handle: true, avatarUrl: true,
          parentBusinessId: true,
          parentBusiness: { select: { id: true, businessName: true, handle: true, avatarUrl: true } }
        }
      }
    }
  });

  if (!booking || booking.clientId !== userId || booking.status !== "COMPLETED") {
    redirect("/account");
  }

  const isAgentBooking = !!booking.providerProfile.parentBusinessId;
  const provider = isAgentBooking ? booking.providerProfile.parentBusiness! : booking.providerProfile;
  const agent = isAgentBooking ? booking.providerProfile : null;

  // Check existing ratings
  const [providerRating, agentRating] = await Promise.all([
    prisma.rating.findUnique({
      where: { userId_providerProfileId: { userId, providerProfileId: provider.id } }
    }),
    agent ? prisma.rating.findUnique({
      where: { userId_providerProfileId: { userId, providerProfileId: agent.id } }
    }) : Promise.resolve(null)
  ]);

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <ReviewForm
          bookingId={bookingId}
          serviceName={booking.service?.name ?? "Service"}
          startsAt={booking.startsAt.toISOString()}
          provider={{
            id: provider.id,
            name: provider.businessName,
            handle: provider.handle,
            avatarUrl: mediaUrl(provider.avatarUrl) ?? null,
            existingStars: providerRating?.stars ?? null,
            existingComment: providerRating?.comment ?? null,
          }}
          agent={agent ? {
            id: agent.id,
            name: agent.businessName,
            handle: agent.handle,
            avatarUrl: mediaUrl(agent.avatarUrl) ?? null,
            existingStars: agentRating?.stars ?? null,
            existingComment: agentRating?.comment ?? null,
          } : null}
        />
      </div>
    </div>
  );
}
