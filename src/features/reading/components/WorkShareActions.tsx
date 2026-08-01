"use client";

import NextImage from "next/image";
import { useRef, useState } from "react";
import QRCode from "qrcode";

import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";

import styles from "./WorkShareActions.module.css";

type ShareStatus = {
  message: string;
  tone: "error" | "info" | "success";
} | null;

type WorkShareActionsProps = {
  authorName: string;
  genre?: string | null;
  title: string;
  workSlug: string;
};

const PUBLIC_SHARE_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://ilkoku.com"
).replace(/\/+$/u, "");

function loadImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error("IMAGE_LOAD_FAILED"),
      );

    image.src = source;
  });
}

function drawRoundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(
    radius,
    width / 2,
    height / 2,
  );

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(
    x + width - safeRadius,
    y,
  );
  context.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + safeRadius,
  );
  context.lineTo(
    x + width,
    y + height - safeRadius,
  );
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(
    x + safeRadius,
    y + height,
  );
  context.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - safeRadius,
  );
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(
    x,
    y,
    x + safeRadius,
    y,
  );
  context.closePath();
}

function getWrappedLines(
  context: CanvasRenderingContext2D,
  text: string,
  maximumWidth: number,
  maximumLines: number,
) {
  const words = text
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (
      context.measureText(candidate).width <=
        maximumWidth ||
      currentLine.length === 0
    ) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;

    if (
      lines.length === maximumLines
    ) {
      break;
    }
  }

  if (
    currentLine &&
    lines.length < maximumLines
  ) {
    lines.push(currentLine);
  }

  if (
    words.join(" ").length >
      lines.join(" ").length &&
    lines.length > 0
  ) {
    const lastIndex =
      lines.length - 1;

    lines[lastIndex] =
      `${lines[lastIndex].replace(/[.,;:!?]?$/u, "")}…`;
  }

  return lines;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(
            new Error(
              "STORY_IMAGE_CREATION_FAILED",
            ),
          );
        },
        "image/png",
        1,
      );
    },
  );
}

async function createStoryImage({
  authorName,
  genre,
  title,
  workUrl,
}: {
  authorName: string;
  genre: string;
  title: string;
  workUrl: string;
}) {
  const canvas =
    document.createElement("canvas");

  canvas.width = 1080;
  canvas.height = 1920;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "CANVAS_NOT_AVAILABLE",
    );
  }

  const background =
    context.createLinearGradient(
      0,
      0,
      1080,
      1920,
    );

  background.addColorStop(
    0,
    "#090b0f",
  );
  background.addColorStop(
    0.58,
    "#11151c",
  );
  background.addColorStop(
    1,
    "#1b1710",
  );

  context.fillStyle = background;
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  context.globalAlpha = 0.13;
  context.fillStyle = "#d7b43f";
  context.beginPath();
  context.arc(
    940,
    310,
    340,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.beginPath();
  context.arc(
    80,
    1700,
    420,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.globalAlpha = 1;

  try {
    const logo =
      await loadImage(
        mobileLogo.src,
      );

    context.drawImage(
      logo,
      90,
      78,
      76,
      76,
    );
  } catch {
    context.fillStyle = "#d7b43f";
    context.font =
      "700 48px Arial, sans-serif";
    context.fillText(
      "İ",
      108,
      134,
    );
  }

  context.fillStyle = "#ffffff";
  context.font =
    "600 48px Georgia, serif";
  context.fillText(
    "İlkOku",
    188,
    134,
  );

  context.fillStyle =
    "rgba(255,255,255,0.58)";
  context.font =
    "500 25px Arial, sans-serif";
  context.fillText(
    "Yeni hikâyeleri ilk sen keşfet",
    90,
    205,
  );

  const coverX = 170;
  const coverY = 300;
  const coverWidth = 740;
  const coverHeight = 980;

  const coverGradient =
    context.createLinearGradient(
      coverX,
      coverY,
      coverX + coverWidth,
      coverY + coverHeight,
    );

  coverGradient.addColorStop(
    0,
    "#1d1f24",
  );
  coverGradient.addColorStop(
    0.55,
    "#101217",
  );
  coverGradient.addColorStop(
    1,
    "#292516",
  );

  drawRoundedRectangle(
    context,
    coverX,
    coverY,
    coverWidth,
    coverHeight,
    42,
  );

  context.fillStyle =
    coverGradient;
  context.fill();

  context.strokeStyle =
    "rgba(215,180,63,0.45)";
  context.lineWidth = 3;
  context.stroke();

  context.globalAlpha = 0.2;
  context.fillStyle = "#d7b43f";
  context.beginPath();
  context.arc(
    coverX + 665,
    coverY + 215,
    215,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = "#d7b43f";
  context.font =
    "700 25px Arial, sans-serif";
  context.letterSpacing = "3px";
  context.fillText(
    genre.toLocaleUpperCase("tr"),
    coverX + 72,
    coverY + 112,
  );
  context.letterSpacing = "0px";

  const titleFontSize =
    title.length > 38
      ? 70
      : title.length > 22
        ? 82
        : 98;

  context.fillStyle = "#ffffff";
  context.font =
    `700 ${titleFontSize}px Arial, sans-serif`;

  const titleLines =
    getWrappedLines(
      context,
      title,
      coverWidth - 144,
      4,
    );

  titleLines.forEach(
    (line, index) => {
      context.fillText(
        line,
        coverX + 72,
        coverY +
          395 +
          index *
            (titleFontSize + 18),
      );
    },
  );

  context.fillStyle =
    "rgba(255,255,255,0.68)";
  context.font =
    "500 33px Arial, sans-serif";
  context.fillText(
    authorName,
    coverX + 72,
    coverY + coverHeight - 92,
  );

  context.fillStyle = "#ffffff";
  context.font =
    "600 48px Arial, sans-serif";
  context.fillText(
    "İlkOku’da okumaya başla",
    90,
    1425,
  );

  context.fillStyle =
    "rgba(255,255,255,0.62)";
  context.font =
    "400 28px Arial, sans-serif";

  const descriptionLines =
    getWrappedLines(
      context,
      `${title} — ${authorName}`,
      625,
      2,
    );

  descriptionLines.forEach(
    (line, index) => {
      context.fillText(
        line,
        90,
        1485 + index * 42,
      );
    },
  );

  const qrCodeDataUrl =
    await QRCode.toDataURL(
      workUrl,
      {
        color: {
          dark: "#111318",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
        margin: 1,
        width: 250,
      },
    );

  const qrCodeImage =
    await loadImage(qrCodeDataUrl);

  drawRoundedRectangle(
    context,
    746,
    1440,
    264,
    264,
    24,
  );

  context.fillStyle = "#ffffff";
  context.fill();

  context.drawImage(
    qrCodeImage,
    753,
    1447,
    250,
    250,
  );

  context.fillStyle = "#d7b43f";
  context.font =
    "700 25px Arial, sans-serif";
  context.fillText(
    "TARA VE OKU",
    789,
    1750,
  );

  context.fillStyle =
    "rgba(255,255,255,0.45)";
  context.font =
    "400 22px Arial, sans-serif";
  context.fillText(
    "ilkoku.com",
    90,
    1835,
  );

  return canvasToBlob(canvas);
}

async function copyText(
  value: string,
) {
  if (
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(
      value,
    );
    return;
  }

  const textArea =
    document.createElement(
      "textarea",
    );

  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(
    textArea,
  );

  textArea.focus();
  textArea.select();

  const copied =
    document.execCommand("copy");

  textArea.remove();

  if (!copied) {
    throw new Error(
      "COPY_FAILED",
    );
  }
}

function openExternal(
  url: string,
) {
  const opened = window.open(
    url,
    "_blank",
    "noopener,noreferrer",
  );

  if (opened) {
    opened.opener = null;
  }
}

function safeFileName(
  value: string,
) {
  return (
    value
      .normalize("NFKD")
      .replace(
        /[^\p{L}\p{N}]+/gu,
        "-",
      )
      .replace(/^-+|-+$/gu, "")
      .toLocaleLowerCase("tr") ||
    "ilkoku-eser"
  );
}

export function WorkShareActions({
  authorName,
  genre,
  title,
  workSlug,
}: WorkShareActionsProps) {
  const dialogReference =
    useRef<HTMLDialogElement>(null);

  const [
    creatingStory,
    setCreatingStory,
  ] = useState(false);

  const [status, setStatus] =
    useState<ShareStatus>(null);

  function getShareData() {
    const workUrl = new URL(
      `/kitap/${workSlug}`,
      PUBLIC_SHARE_SITE_URL,
    ).toString();

    return {
      shareText:
        `${title} — ${authorName}. ` +
        "İlkOku’da keşfet.",
      workUrl,
    };
  }

  function showError() {
    setStatus({
      message:
        "Paylaşım hazırlanamadı. Lütfen tekrar deneyin.",
      tone: "error",
    });
  }

  async function handleCopy() {
    try {
      const { workUrl } =
        getShareData();

      await copyText(workUrl);

      setStatus({
        message:
          "Eser bağlantısı kopyalandı.",
        tone: "success",
      });
    } catch {
      showError();
    }
  }

  async function handleNativeShare() {
    const {
      shareText,
      workUrl,
    } = getShareData();

    if (!navigator.share) {
      await handleCopy();

      setStatus({
        message:
          "Cihaz paylaşımı desteklenmediği için bağlantı kopyalandı.",
        tone: "info",
      });

      return;
    }

    try {
      await navigator.share({
        text: shareText,
        title,
        url: workUrl,
      });

      setStatus({
        message:
          "Paylaşım ekranı açıldı.",
        tone: "success",
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      showError();
    }
  }

  async function handleInstagramStory() {
    setCreatingStory(true);
    setStatus({
      message:
        "Instagram hikâye görseli hazırlanıyor…",
      tone: "info",
    });

    try {
      const {
        shareText,
        workUrl,
      } = getShareData();

      const storyBlob =
        await createStoryImage({
          authorName,
          genre:
            genre ??
            "Eser",
          title,
          workUrl,
        });

      const storyFile = new File(
        [storyBlob],
        `${safeFileName(title)}-instagram-hikayesi.png`,
        {
          type: "image/png",
        },
      );

      await copyText(workUrl);

      const canShareFile =
        typeof navigator.canShare ===
          "function" &&
        navigator.canShare({
          files: [storyFile],
        });

      if (
        navigator.share &&
        canShareFile
      ) {
        await navigator.share({
          files: [storyFile],
          text:
            `${shareText}\n${workUrl}`,
          title,
        });

        setStatus({
          message:
            "Hikâye görseli hazırlandı. Paylaşım listesinden Instagram’ı seçin.",
          tone: "success",
        });

        return;
      }

      const downloadUrl =
        URL.createObjectURL(
          storyBlob,
        );

      const anchor =
        document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download =
        storyFile.name;

      document.body.appendChild(
        anchor,
      );

      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(
          downloadUrl,
        );
      }, 1000);

      setStatus({
        message:
          "Hikâye görseli hazırlandı ve eser bağlantısı kopyalandı.",
        tone: "success",
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        setStatus(null);
        return;
      }

      showError();
    } finally {
      setCreatingStory(false);
    }
  }

  function handleSocialShare(
    channel:
      | "facebook"
      | "mail"
      | "whatsapp"
      | "x",
  ) {
    const {
      shareText,
      workUrl,
    } = getShareData();

    const encodedText =
      encodeURIComponent(
        shareText,
      );

    const encodedUrl =
      encodeURIComponent(workUrl);

    const destinations = {
      facebook:
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      mail:
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${workUrl}`)}`,
      whatsapp:
        `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${workUrl}`)}`,
      x:
        `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    };

    openExternal(
      destinations[channel],
    );

    setStatus({
      message:
        "Paylaşım penceresi açıldı.",
      tone: "success",
    });
  }

  return (
    <>
      <button
        className="button button--outline"
        onClick={() => {
          setStatus(null);
          dialogReference.current?.showModal();
        }}
        type="button"
      >
        Eseri Paylaş
      </button>

      <dialog
        aria-labelledby="eser-paylasim-basligi"
        className={styles.dialog}
        onCancel={() =>
          setStatus(null)
        }
        onClick={(event) => {
          if (
            event.currentTarget ===
            event.target
          ) {
            dialogReference.current?.close();
          }
        }}
        ref={dialogReference}
      >
        <div className={styles.panel}>
          <header className={styles.header}>
            <div>
              <p>İlkOku paylaşım alanı</p>
              <h2 id="eser-paylasim-basligi">
                Eseri Paylaş
              </h2>
            </div>

            <button
              aria-label="Paylaşım penceresini kapat"
              className={styles.close}
              onClick={() =>
                dialogReference.current?.close()
              }
              type="button"
            >
              ×
            </button>
          </header>

          <div className={styles.preview}>
            <div
              aria-hidden="true"
              className={styles.cover}
            >
              <span>
                {genre ?? "Eser"}
              </span>

              <strong>{title}</strong>

              <small>{authorName}</small>
            </div>

            <div>
              <strong>{title}</strong>
              <span>{authorName}</span>
              <p>
                Bu eseri İlkOku’da keşfet
                ve okumaya başla.
              </p>
            </div>

            <NextImage
              alt=""
              aria-hidden="true"
              height={38}
              src={mobileLogo}
              width={38}
            />
          </div>

          <div className={styles.options}>
            <button
              onClick={handleCopy}
              type="button"
            >
              <span>🔗</span>
              <strong>
                Bağlantıyı Kopyala
              </strong>
            </button>

            <button
              onClick={() =>
                handleSocialShare(
                  "whatsapp",
                )
              }
              type="button"
            >
              <span>WA</span>
              <strong>WhatsApp</strong>
            </button>

            <button
              disabled={creatingStory}
              onClick={
                handleInstagramStory
              }
              type="button"
            >
              <span>IG</span>
              <strong>
                {creatingStory
                  ? "Hazırlanıyor…"
                  : "Instagram Hikâyesi"}
              </strong>
            </button>

            <button
              onClick={() =>
                handleSocialShare("x")
              }
              type="button"
            >
              <span>𝕏</span>
              <strong>X</strong>
            </button>

            <button
              onClick={() =>
                handleSocialShare(
                  "facebook",
                )
              }
              type="button"
            >
              <span>f</span>
              <strong>Facebook</strong>
            </button>

            <button
              onClick={() =>
                handleSocialShare("mail")
              }
              type="button"
            >
              <span>✉</span>
              <strong>E-posta</strong>
            </button>

            <button
              className={styles.nativeShare}
              onClick={
                handleNativeShare
              }
              type="button"
            >
              <span>↗</span>
              <strong>
                Diğer Uygulamalar
              </strong>
            </button>
          </div>

          {status && (
            <p
              aria-live="polite"
              className={`${styles.status} ${
                status.tone === "error"
                  ? styles.statusError
                  : status.tone ===
                      "success"
                    ? styles.statusSuccess
                    : ""
              }`}
            >
              {status.message}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
