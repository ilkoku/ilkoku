"use client";

import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { feedbackContent } from "@/content";

export default function FeedbackError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="system-state">
      <div className="system-state__brand"><Brand /></div>
      <h1>{feedbackContent.empty.title}</h1>
      <p>{feedbackContent.errors.load}</p>
      <Button onClick={reset}>{feedbackContent.errors.retry}</Button>
    </main>
  );
}
