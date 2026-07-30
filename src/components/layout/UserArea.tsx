"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import { getWorkspaceDestination } from "@/features/auth/data";
import type { AuthProfile } from "@/features/auth/profile";

export function UserArea({
  profile,
  workspaceHref = getWorkspaceDestination(profile.role),
}: {
  profile: AuthProfile;
  workspaceHref?: string;
}) {
  const pathname = usePathname();
  const initial = profile.fullName.trim().charAt(0).toLocaleUpperCase("tr") || "İ";
  const roleLabel = authContent.roles[profile.role];
  const workspacePath = workspaceHref.split("?")[0];
  const workspaceIsCurrent = pathname === workspacePath
    || pathname.startsWith(`${workspacePath}/`);

  return (
    <div className="user-area">
      <div className="user-area__identity">
        <span className="user-area__greeting">{authContent.common.roleAccount(roleLabel)}</span>
        <span className="user-area__name">{profile.fullName}</span>
      </div>

      <details className="user-area__menu">
        <summary aria-label={authContent.common.openAccountMenu(profile.fullName)}>
          {profile.avatarUrl ? (
            <Image
              className="user-area__avatar user-area__avatar--image"
              src={profile.avatarUrl}
              alt={authContent.common.profilePhoto(profile.fullName)}
              width={40}
              height={40}
            />
          ) : (
            <span className="user-area__avatar" aria-hidden="true">{initial}</span>
          )}
          <span className="user-area__chevron" aria-hidden="true">⌄</span>
        </summary>

        <div className="user-area__popover" role="menu" aria-label={authContent.common.accountMenu}>
          <div className="user-area__popover-copy">
            <strong>{profile.fullName}</strong>
            <small>{authContent.common.roleAccount(roleLabel)}</small>
          </div>
          <Link className="user-area__menu-link" data-current={pathname === "/hesabim"} href="/hesabim" role="menuitem" aria-current={pathname === "/hesabim" ? "page" : undefined}>
            Hesabım
          </Link>
          <Link className="user-area__menu-link" data-current={pathname === "/"} href="/" role="menuitem" aria-current={pathname === "/" ? "page" : undefined}>
            Ana Sayfa
          </Link>
          <Link className="user-area__menu-link" data-current={workspaceIsCurrent} href={workspaceHref} role="menuitem" aria-current={workspaceIsCurrent ? "page" : undefined}>
            Çalışma Alanım
            {workspaceIsCurrent ? <small>Buradasınız</small> : null}
          </Link>
          <form action={logoutAction}>
            <button className="user-area__logout" type="submit" role="menuitem">
              {authContent.common.logout}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
