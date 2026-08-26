import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";

import "./public-site-header.css";

function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export async function PublicSiteHeader() {
  const profile = await getCurrentProfile();
  const navigation = profile ? await getRoleNavigation(profile) : null;
  const pendingRole =
    navigation?.pendingRequest?.requestedRole ??
    (profile?.role === "editor_pending" ? "editor" : null);

  return (
    <header className="public-site-header">
      <div className="public-site-header__inner">
        <Link
          className="public-site-header__brand"
          href="/"
          aria-label="İlkOku ana sayfa"
        >
          <Image
            src={logo}
            alt="İlkOku"
            priority
            sizes="(max-width: 480px) 86px, (max-width: 768px) 94px, 110px"
          />
        </Link>

        <span className="public-site-header__kicker">
          Dijital edebiyat platformu
        </span>

        <div className="public-site-header__tools">
          <details className="public-site-header__account">
            <summary
              aria-label={
                profile
                  ? `${profile.fullName} hesap menüsünü aç`
                  : "Hesap menüsünü aç"
              }
            >
              <AccountIcon />
            </summary>

            <div className="public-site-header__account-menu">
              {profile && navigation ? (
                <>
                  <div className="public-site-header__identity">
                    <strong>{profile.fullName}</strong>
                    <span>Aktif rol: {authContent.roles[profile.role]}</span>
                    {navigation.hasPendingRequest ? (
                      <small>
                        {pendingRole
                          ? `${authContent.roles[pendingRole]} başvurunuz inceleniyor`
                          : "Başvurunuz inceleniyor"}
                      </small>
                    ) : null}
                  </div>
                  <Link href="/hesabim">Hesabım</Link>
                  <Link href={navigation.workspaceHref}>
                    {navigation.hasPendingRequest
                      ? "Mevcut çalışma alanına dön"
                      : "Çalışma Alanım"}
                  </Link>
                  <form action={logoutAction}>
                    <button
                      className="public-site-header__logout"
                      type="submit"
                    >
                      Çıkış Yap
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/giris">Giriş Yap</Link>
                  <Link href="/kayit">Üye Ol</Link>
                </>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
