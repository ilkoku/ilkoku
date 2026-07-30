"use client";

import { Button } from "@/components/ui/Button";

export default function PublisherError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="publisher-workspace__empty" role="alert">
    <h1>Yayınevi çalışma alanı yüklenemedi</h1>
    <p>Veriler alınırken beklenmeyen bir sorun oluştu. Güvenli biçimde yeniden deneyebilirsiniz.</p>
    <Button onClick={reset} type="button">Yeniden dene</Button>
  </section>;
}
