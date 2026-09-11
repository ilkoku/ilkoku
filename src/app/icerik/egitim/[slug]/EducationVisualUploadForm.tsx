"use client";

import { FormEvent, useRef, useState } from "react";

import styles from "./EducationGuideEditor.module.css";

type Props = {
  genreSlug: string;
  slotKey: string;
  slotLabel: string;
  recommendedWidth: number;
  recommendedHeight: number;
  defaultAltText: string;
  hasVisual: boolean;
};

type ImageCheck = {
  width: number;
  height: number;
  valid: boolean;
  ratioValid: boolean;
};

function readImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const result = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image-size"));
    };
    image.src = objectUrl;
  });
}

export default function EducationVisualUploadForm({
  genreSlug,
  slotKey,
  slotLabel,
  recommendedWidth,
  recommendedHeight,
  defaultAltText,
  hasVisual,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("Dosya seçilmedi");
  const [check, setCheck] = useState<ImageCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onFileChange() {
    const file = inputRef.current?.files?.[0];
    setError("");
    setProgress(null);
    setCheck(null);
    if (!file) {
      setFilename("Dosya seçilmedi");
      return;
    }

    setFilename(file.name);
    setChecking(true);
    try {
      const size = await readImageSize(file);
      const targetRatio = recommendedWidth / recommendedHeight;
      const sourceRatio = size.width / size.height;
      const ratioDifference = Math.abs(sourceRatio - targetRatio) / targetRatio;
      setCheck({
        ...size,
        valid: size.width >= recommendedWidth && size.height >= recommendedHeight,
        ratioValid: ratioDifference <= 0.015,
      });
    } catch {
      setError("Görsel çözünürlüğü okunamadı. Başka bir dosya seçin.");
    } finally {
      setChecking(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || checking) return;
    const form = event.currentTarget;
    const file = inputRef.current?.files?.[0];
    if (!file || !check) {
      setError("Önce bir görsel seçin.");
      return;
    }
    if (!check.valid) {
      setError(`Çözünürlük yetersiz. En az ${recommendedWidth}×${recommendedHeight} px gerekli.`);
      return;
    }
    if (!check.ratioValid) {
      setError(`Görsel oranı ${slotLabel} alanına uygun değil. Kenar boşluğu oluşmaması için hedef oranı koruyan bir görsel seçin.`);
      return;
    }

    const data = new FormData(form);
    data.set("sourceWidth", String(check.width));
    data.set("sourceHeight", String(check.height));

    const xhr = new XMLHttpRequest();
    setUploading(true);
    setProgress(0);
    setError("");

    xhr.upload.onprogress = (uploadEvent) => {
      if (!uploadEvent.lengthComputable) return;
      setProgress(Math.min(99, Math.round((uploadEvent.loaded / uploadEvent.total) * 100)));
    };

    xhr.onerror = () => {
      setUploading(false);
      setProgress(null);
      setError("Yükleme sırasında bağlantı hatası oluştu.");
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        const target = xhr.responseURL;
        if (target && new URL(target).origin === window.location.origin) {
          window.location.assign(target);
          return;
        }
        window.location.assign(`/icerik/egitim/${genreSlug}?yuklendi=${slotKey}`);
        return;
      }
      setUploading(false);
      setProgress(null);
      setError(`Yükleme tamamlanamadı (${xhr.status}).`);
    };

    xhr.open("POST", "/api/cms-education-media-upload");
    xhr.send(data);
  }

  const qualityOk = Boolean(check?.valid && check?.ratioValid);

  return (
    <form onSubmit={submit} encType="multipart/form-data" className={styles.uploadForm}>
      <input type="hidden" name="genreSlug" value={genreSlug} />
      <input type="hidden" name="slot" value={slotKey} />
      <label className={styles.field}>
        <span>Dosya</span>
        <span className={styles.filePicker}>
          <input
            ref={inputRef}
            className={styles.nativeFileInput}
            name="file"
            type="file"
            required
            disabled={uploading}
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={onFileChange}
          />
          <span className={styles.fileButton}>Dosya Seç</span>
          <span className={styles.fileName} title={filename}>{filename}</span>
        </span>
        <span className={`${styles.resolutionStatus} ${qualityOk ? styles.resolutionOk : check ? styles.resolutionBad : ""}`}>
          {checking ? "Çözünürlük okunuyor…" : check ? `Kaynak ${check.width}×${check.height} px · ${qualityOk ? "uygun" : "kontrol gerekli"}` : `Min. ${recommendedWidth}×${recommendedHeight} px`}
        </span>
      </label>
      <label className={styles.field}>
        <span>Alt metin</span>
        <input name="altText" maxLength={300} defaultValue={defaultAltText} placeholder={`${slotLabel} görseli`} disabled={uploading} />
      </label>
      <button className={styles.uploadButton} type="submit" disabled={uploading || checking || Boolean(check && !qualityOk)}>
        {uploading ? `Yükleniyor ${progress ?? 0}%` : hasVisual ? "Değiştir" : "Yükle"}
      </button>
      {(uploading || progress !== null) ? (
        <div className={styles.uploadProgress} aria-live="polite">
          <div className={styles.uploadProgressTrack}><span style={{ width: `${progress ?? 0}%` }} /></div>
          <span>{progress === 100 ? "Yüklendi, sayfa yenileniyor…" : `Yükleniyor · ${progress ?? 0}%`}</span>
        </div>
      ) : null}
      {error ? <div className={styles.uploadError}>{error}</div> : null}
    </form>
  );
}
