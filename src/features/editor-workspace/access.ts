import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/features/auth/profile";

export async function requireEditorProfile(nextPath: string) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(`/giris?sonraki=${encodeURIComponent(nextPath)}`);
  }

  if (profile.role !== "editor") {
    redirect("/erisim-reddedildi?kaynak=editor");
  }

  return profile;
}
