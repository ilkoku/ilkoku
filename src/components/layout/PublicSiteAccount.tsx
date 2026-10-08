"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AnonymousAccount = {
  signedIn: false;
};

type SignedInAccount = {
  signedIn: true;
  fullName: string;
  roleLabel: string;
  workspaceHref: string;
  pendingLabel: string | null;
};

type PublicAccountState = AnonymousAccount | SignedInAccount;

const anonymousAccount: AnonymousAccount = { signedIn: false };

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

function parseAccountPayload(payload: unknown): PublicAccountState {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("signedIn" in payload) ||
    payload.signedIn !== true
  ) {
    return anonymousAccount;
  }

  const candidate = payload as Partial<SignedInAccount>;

  if (
    typeof candidate.fullName !== "string" ||
    typeof candidate.roleLabel !== "string" ||
    typeof candidate.workspaceHref !== "string"
  ) {
    return anonymousAccount;
  }

  return {
    signedIn: true,
    fullName: candidate.fullName,
    roleLabel: candidate.roleLabel,
    workspaceHref: candidate.workspaceHref,
    pendingLabel:
      typeof candidate.pendingLabel === "string" ? candidate.pendingLabel : null,
  };
}

export function PublicSiteAccount() {
  const [account, setAccount] = useState<PublicAccountState>(anonymousAccount);

  useEffect(() => {
    let active = true;

    void fetch("/api/public-account", {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) return anonymousAccount;
        return parseAccountPayload(await response.json());
      })
      .then((nextAccount) => {
        if (active) setAccount(nextAccount);
      })
      .catch(() => {
        if (active) setAccount(anonymousAccount);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <details className="public-site-header__account">
      <summary
        aria-label={
          account.signedIn
            ? `${account.fullName} hesap menüsünü aç`
            : "Hesap menüsünü aç"
        }
        data-account-label={account.signedIn ? account.fullName : "GİRİŞ YAP"}
      >
        <AccountIcon />
      </summary>

      <div className="public-site-header__account-menu">
        {account.signedIn ? (
          <>
            <div className="public-site-header__identity">
              <strong>{account.fullName}</strong>
              <span>Aktif rol: {account.roleLabel}</span>
              {account.pendingLabel ? <small>{account.pendingLabel}</small> : null}
            </div>
            <Link href="/hesabim">Hesabım</Link>
            <Link href={account.workspaceHref}>Çalışma Alanım</Link>
            <form action="/cikis" method="post">
              <button className="public-site-header__logout" type="submit">
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
  );
}
