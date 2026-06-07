import { auth } from "@/lib/auth";
import { AccountFavourites } from "@/components/account/account-favourites";

export const dynamic = "force-dynamic";

export default async function FavouritesPage() {
  // Auth guard is in layout; just confirm session for userId
  const session = await auth();
  const userId = (session!.user as any).id as string;

  return <AccountFavourites userId={userId} />;
}
