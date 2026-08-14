"use client";

import { useState } from "react";

export function CopyMediaUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy}>
      {copied ? "Kopyalandı" : "URL'yi kopyala"}
    </button>
  );
}
