"use client";

import type { MouseEvent } from "react";

import { siteContact } from "@/lib/site-contact";

export function PublicEmailLink({ className }: { className?: string }) {
  function openEmail(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    event.preventDefault();
    window.location.href = `mailto:${siteContact.generalEmail}`;
  }

  return (
    <a className={className} href="/iletisim" onClick={openEmail}>
      E-posta ile ulaşın
    </a>
  );
}
