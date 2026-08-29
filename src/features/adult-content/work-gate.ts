import "server-only";

import { redirect } from "next/navigation";
import { getPublicWorkAgeRating } from "@/features/works/member-public-queries";
import {
  getAdultContentAccess,
  safeAdultGateReturnPath,
} from "@/lib/adult-content-access";

export async function enforceAdultWorkGate({
  returnTo,
  slug,
  user,
}: {
  returnTo: string;
  slug: string;
  user: { id: string; role: string } | null;
}) {
  const work = await getPublicWorkAgeRating(slug);
  if (!work || work.contentRating !== "adult_18") return;

  const safeReturnTo = safeAdultGateReturnPath(returnTo, `/kitap/${slug}`);

  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(safeReturnTo)}`);
  }
  if (user.role === "admin") return;

  const access = await getAdultContentAccess(user.id);
  if (access.needsBirthDate) {
    redirect(`/yas-dogrulama?sonraki=${encodeURIComponent(safeReturnTo)}`);
  }
  if (!access.isAdult) {
    redirect("/erisim-reddedildi?kaynak=18-plus");
  }
  if (!access.canAccessAdultContent) {
    redirect(`/yetiskin-icerik-onayi?sonraki=${encodeURIComponent(safeReturnTo)}`);
  }
}
