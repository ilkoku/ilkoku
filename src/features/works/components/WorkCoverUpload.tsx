"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

type UploadState = {
  message: string;
  status: "idle" | "loading" | "error" | "success";
};

export function WorkCoverUpload({ workId }: { workId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ message: "", status: "idle" });

  async function upload(file: File) {
    setState({ message: "Kapak yükleniyor…", status: "loading" });

    const formData = new FormData();
    formData.set("workId", workId);
    formData.set("file", file);

    try {
      const response = await fetch("/api/work-cover-upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { message?: string; ok?: boolean };

      if (!response.ok || !payload.ok) {
        setState({
          message: payload.message ?? "Kapak yüklenemedi.",
          status: "error",
        });
        return;
      }

      setState({ message: "Kapak yüklendi.", status: "success" });
      router.refresh();
    } catch {
      setState({ message: "Kapak yüklenemedi. Bağlantını kontrol edip tekrar dene.", status: "error" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="workspace-cover-upload">
      <input
        ref={inputRef}
        className="workspace-cover-upload__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={state.status === "loading"}
        onClick={() => inputRef.current?.click()}
      >
        {state.status === "loading" ? "Yükleniyor…" : "Kapak Yükle"}
      </Button>
      <small>2:3 oran · en az 800×1200 px · önerilen 1200×1800 px · JPG/PNG/WebP · en fazla 3 MB</small>
      {state.message ? (
        <span className="work-action-message" data-state={state.status} role="status">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
