import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentProfile } from "@/features/auth/profile";

export async function AuthenticatedUser() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const initial = profile.fullName.trim().charAt(0).toLocaleUpperCase("tr") || "İ";
  return (
    <div className="protected-account">
      <span className="protected-account__copy"><strong>{profile.fullName}</strong><small>{authContent.roles[profile.role]}</small></span>
      <span className="protected-account__avatar" aria-hidden="true">{initial}</span>
      <form action={logoutAction}><button type="submit">{authContent.common.shortLogout}</button></form>
    </div>
  );
}
