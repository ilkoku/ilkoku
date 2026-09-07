"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type WriterFont = "typewriter" | "serif" | "sans";
type WriterWidth = "book" | "comfortable" | "wide";
type WriterPageFlow = "vertical" | "sideBySide";

type WriterPreferences = {
  fontSize: number;
  lineHeight: number;
  font: WriterFont;
  width: WriterWidth;
  pageFlow: WriterPageFlow;
  zoom: number;
  spellcheck: boolean;
};

const STORAGE_KEY = "ilkoku.writer.preferences.v1";

const defaultPreferences: WriterPreferences = {
  fontSize: 17,
  lineHeight: 1.9,
  font: "typewriter",
  width: "book",
  pageFlow: "vertical",
  zoom: 100,
  spellcheck: true,
};

const fontFamilies: Record<WriterFont, string> = {
  typewriter:
    '"Courier New", Courier, ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: 'var(--font-inter), Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const manuscriptWidths: Record<WriterWidth, string> = {
  book: "48rem",
  comfortable: "54rem",
  wide: "58rem",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadPreferences(): WriterPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<WriterPreferences>;

    return {
      fontSize:
        typeof parsed.fontSize === "number"
          ? clamp(parsed.fontSize, 14, 24)
          : defaultPreferences.fontSize,
      lineHeight:
        typeof parsed.lineHeight === "number"
          ? clamp(parsed.lineHeight, 1.5, 2.3)
          : defaultPreferences.lineHeight,
      font:
        parsed.font && parsed.font in fontFamilies
          ? parsed.font
          : defaultPreferences.font,
      width:
        parsed.width && parsed.width in manuscriptWidths
          ? parsed.width
          : defaultPreferences.width,
      pageFlow:
        parsed.pageFlow === "sideBySide" || parsed.pageFlow === "vertical"
          ? parsed.pageFlow
          : defaultPreferences.pageFlow,
      zoom:
        typeof parsed.zoom === "number"
          ? clamp(Math.round(parsed.zoom / 10) * 10, 50, 160)
          : defaultPreferences.zoom,
      spellcheck:
        typeof parsed.spellcheck === "boolean"
          ? parsed.spellcheck
          : defaultPreferences.spellcheck,
    };
  } catch {
    return defaultPreferences;
  }
}

function getToolbarTarget() {
  if (typeof document === "undefined") {
    return null;
  }

  return document.querySelector<HTMLElement>(".writer-context-bar");
}

function getServerToolbarTarget() {
  return null;
}

function subscribeToolbarTarget(onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}

export function WriterEditingTools() {
  const target = useSyncExternalStore(
    subscribeToolbarTarget,
    getToolbarTarget,
    getServerToolbarTarget,
  );
  const [preferences, setPreferences] = useState<WriterPreferences>(() =>
    typeof window === "undefined"
      ? defaultPreferences
      : loadPreferences(),
  );

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(preferences),
    );
  }, [preferences]);

  useEffect(() => {
    if (!target) {
      return;
    }

    const screen = target.closest<HTMLElement>(".writer-screen");
    const textarea = screen?.querySelector<HTMLTextAreaElement>(
      ".writer-textarea",
    );

    if (!screen || !textarea) {
      return;
    }

    screen.style.setProperty(
      "--writer-manuscript-font-size",
      `${preferences.fontSize}px`,
    );
    screen.style.setProperty(
      "--writer-manuscript-line-height",
      String(preferences.lineHeight),
    );
    screen.style.setProperty(
      "--writer-manuscript-font-family",
      fontFamilies[preferences.font],
    );
    screen.style.setProperty(
      "--writer-manuscript-width",
      manuscriptWidths[preferences.width],
    );
    screen.style.setProperty(
      "--writer-page-zoom",
      String(preferences.zoom / 100),
    );
    screen.dataset.writerPageFlow = preferences.pageFlow;

    textarea.spellcheck = preferences.spellcheck;
    textarea.setAttribute(
      "spellcheck",
      String(preferences.spellcheck),
    );

    window.dispatchEvent(
      new CustomEvent("ilkoku:writer-preferences-changed"),
    );
  }, [preferences, target]);

  function updatePreferences(
    update: Partial<WriterPreferences>,
  ) {
    setPreferences((current) => ({
      ...current,
      ...update,
    }));
  }

  function resetPreferences() {
    setPreferences(defaultPreferences);
  }

  if (!target) {
    return null;
  }

  return createPortal(
    <div
      className="writer-editing-tools"
      aria-label="Yazı araçları"
      role="toolbar"
    >
      <span className="writer-editing-tools__label">
        Yazı araçları
      </span>

      <div
        className="writer-editing-tools__group"
        aria-label="Yazı boyutu"
      >
        <button
          type="button"
          onClick={() =>
            updatePreferences({
              fontSize: clamp(
                preferences.fontSize - 1,
                14,
                24,
              ),
            })
          }
          disabled={preferences.fontSize <= 14}
          title="Yazıyı küçült"
          aria-label="Yazıyı küçült"
        >
          A−
        </button>
        <output aria-label="Yazı boyutu">
          {preferences.fontSize}
        </output>
        <button
          type="button"
          onClick={() =>
            updatePreferences({
              fontSize: clamp(
                preferences.fontSize + 1,
                14,
                24,
              ),
            })
          }
          disabled={preferences.fontSize >= 24}
          title="Yazıyı büyüt"
          aria-label="Yazıyı büyüt"
        >
          A+
        </button>
      </div>

      <label className="writer-editing-tools__select">
        <span>Yazı tipi</span>
        <select
          value={preferences.font}
          onChange={(event) =>
            updatePreferences({
              font: event.target.value as WriterFont,
            })
          }
          aria-label="Yazı tipi"
        >
          <option value="typewriter">Daktilo</option>
          <option value="serif">Kitap</option>
          <option value="sans">Sade</option>
        </select>
      </label>

      <div
        className="writer-editing-tools__group"
        aria-label="Satır aralığı"
      >
        <span>Satır</span>
        <button
          type="button"
          onClick={() =>
            updatePreferences({
              lineHeight: Number(
                clamp(
                  preferences.lineHeight - 0.1,
                  1.5,
                  2.3,
                ).toFixed(1),
              ),
            })
          }
          disabled={preferences.lineHeight <= 1.5}
          title="Satır aralığını azalt"
          aria-label="Satır aralığını azalt"
        >
          −
        </button>
        <output aria-label="Satır aralığı">
          {preferences.lineHeight.toFixed(1)}
        </output>
        <button
          type="button"
          onClick={() =>
            updatePreferences({
              lineHeight: Number(
                clamp(
                  preferences.lineHeight + 0.1,
                  1.5,
                  2.3,
                ).toFixed(1),
              ),
            })
          }
          disabled={preferences.lineHeight >= 2.3}
          title="Satır aralığını artır"
          aria-label="Satır aralığını artır"
        >
          +
        </button>
      </div>

      <label className="writer-editing-tools__select">
        <span>Sayfa</span>
        <select
          value={preferences.width}
          onChange={(event) =>
            updatePreferences({
              width: event.target.value as WriterWidth,
            })
          }
          aria-label="Yazı alanı genişliği"
        >
          <option value="book">Kitap</option>
          <option value="comfortable">Rahat</option>
          <option value="wide">Geniş</option>
        </select>
      </label>

      <label className="writer-editing-tools__select">
        <span>Akış</span>
        <select
          value={preferences.pageFlow}
          onChange={(event) =>
            updatePreferences({
              pageFlow: event.target.value as WriterPageFlow,
            })
          }
          aria-label="Sayfa akışı"
        >
          <option value="vertical">Dikey</option>
          <option value="sideBySide">Yan yana</option>
        </select>
      </label>

      <div
        className="writer-editing-tools__group writer-editing-tools__zoom"
        aria-label="Yakınlaştır"
      >
        <span>Yakınlaştır</span>
        <button
          type="button"
          onClick={() =>
            updatePreferences({
              zoom: clamp(preferences.zoom - 10, 50, 160),
            })
          }
          disabled={preferences.zoom <= 50}
          title="Uzaklaştır"
          aria-label="Uzaklaştır"
        >
          −
        </button>
        <output aria-label="Yakınlaştırma oranı">
          {preferences.zoom}%
        </output>
        <button
          type="button"
          onClick={() =>
            updatePreferences({
              zoom: clamp(preferences.zoom + 10, 50, 160),
            })
          }
          disabled={preferences.zoom >= 160}
          title="Yakınlaştır"
          aria-label="Yakınlaştır"
        >
          +
        </button>
      </div>

      <button
        className="writer-editing-tools__toggle"
        type="button"
        aria-pressed={preferences.spellcheck}
        onClick={() =>
          updatePreferences({
            spellcheck: !preferences.spellcheck,
          })
        }
        title="Tarayıcının yazım denetimini aç veya kapat"
      >
        Yazım {preferences.spellcheck ? "Açık" : "Kapalı"}
      </button>

      <button
        className="writer-editing-tools__reset"
        type="button"
        onClick={resetPreferences}
        title="Yazı görünümünü varsayılana döndür"
      >
        Sıfırla
      </button>
    </div>,
    target,
  );
}
