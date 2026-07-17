"use client";

import Link from "next/link";
import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { tr } from "@/content";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="system-state" aria-labelledby="error-title">
      <div className="system-state__brand"><Brand /></div>
      <p className="system-state__code">{tr.system.pageError.code}</p>
      <h1 id="error-title">{tr.system.pageError.title}</h1>
      <p>{tr.system.pageError.description}</p>
      <div className="system-state__actions">
        <Button onClick={reset}>{tr.system.pageError.retry}</Button>
        <Link className="button button--outline" href="/">{tr.system.pageError.home}</Link>
      </div>
    </main>
  );
}
