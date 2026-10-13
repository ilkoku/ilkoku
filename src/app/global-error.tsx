"use client";

import Link from "next/link";
import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { systemContent } from "@/content/system";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body>
        <main className="system-state" aria-labelledby="global-error-title">
          <div className="system-state__brand"><Brand /></div>
          <p className="system-state__code">{systemContent.globalError.code}</p>
          <h1 id="global-error-title">{systemContent.globalError.title}</h1>
          <p>{systemContent.globalError.description}</p>
          <div className="system-state__actions">
            <Button onClick={reset}>{systemContent.globalError.retry}</Button>
            <Link className="button button--outline" href="/">{systemContent.globalError.home}</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
