"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { siteContact } from "@/lib/site-contact";

export function PublicEmailLink({ className }: { className?: string }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <Link className={className} href="/iletisim">
        E-posta ile ulaşın
      </Link>
    );
  }

  return (
    <a className={className} href={`mailto:${siteContact.generalEmail}`}>
      {siteContact.generalEmail}
    </a>
  );
}
