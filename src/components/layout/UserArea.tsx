import Image from "next/image";
import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import type { AuthProfile } from "@/features/auth/profile";

export function UserArea({ profile }: { profile: AuthProfile }) {
  const initial = profile.fullName.trim().charAt(0).toLocaleUpperCase("tr") || "İ";
  return (
    <header className="user-area">
      <div className="user-area__identity">
        <span className="user-area__greeting">{authContent.common.roleAccount(authContent.roles[profile.role])}</span>
        <span className="user-area__name">{profile.fullName}</span>
      </div>
      {profile.avatarUrl ? (
        <Image className="user-area__avatar user-area__avatar--image" src={profile.avatarUrl} alt={authContent.common.profilePhoto(profile.fullName)} width={40} height={40} />
      ) : (
        <div className="user-area__avatar" aria-label={authContent.common.profilePlaceholder(profile.fullName)}>{initial}</div>
      )}
      <form action={logoutAction}><button className="user-area__logout" type="submit">{authContent.common.logout}</button></form>
    </header>
  );
}
