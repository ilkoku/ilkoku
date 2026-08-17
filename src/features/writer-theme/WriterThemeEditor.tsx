"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

import {
  applyWriterTheme,
  loadWriterTheme,
  resetWriterTheme,
  saveWriterTheme,
} from "./WriterThemeHydrator";
import {
  defaultWriterTheme,
  normalizeHex,
  writerThemeLayers,
  writerThemePalette,
  type WriterTheme,
  type WriterThemeKey,
} from "./theme";

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex) ?? "#000000";
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ].join(", ");
}

function rgbToHex(value: string) {
  const parts = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10));

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }

  return `#${parts
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function WriterThemeEditor({ userId }: { userId: string }) {
  const [theme, setTheme] = useState<WriterTheme>({ ...defaultWriterTheme });
  const [savedTheme, setSavedTheme] = useState<WriterTheme>({ ...defaultWriterTheme });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = loadWriterTheme(userId);
    setTheme(stored);
    setSavedTheme(stored);
    applyWriterTheme(stored);
  }, [userId]);

  const dirty = useMemo(
    () => JSON.stringify(theme) !== JSON.stringify(savedTheme),
    [savedTheme, theme],
  );

  function updateColor(key: WriterThemeKey, value: string) {
    const normalized = normalizeHex(value);
    if (!normalized) return;

    setTheme((current) => {
      const next = { ...current, [key]: normalized };
      applyWriterTheme(next);
      return next;
    });
    setMessage("");
  }

  function resetLayer(key: WriterThemeKey) {
    updateColor(key, defaultWriterTheme[key]);
  }

  function save() {
    saveWriterTheme(userId, theme);
    setSavedTheme(theme);
    setMessage("Renklerin kaydedildi. Yazar panelinde otomatik uygulanacak.");
  }

  function resetAll() {
    const defaults = { ...defaultWriterTheme };
    resetWriterTheme(userId);
    setTheme(defaults);
    setSavedTheme(defaults);
    setMessage("Tüm renkler İlkOku varsayılanlarına döndürüldü.");
  }

  return (
    <div className="writer-theme-editor">
      <section className="writer-theme-editor__intro">
        <p className="dashboard-hero__eyebrow">Kişisel çalışma alanın</p>
        <h1>Sayfa Renkleri</h1>
        <p>
          Renkleri en dip sayfa zemininden en üst vurgu katmanına doğru düzenle.
          Hazır karteladan seçebilir, yuvarlak renk seçiciyi açabilir veya HEX / RGB
          değerini kendin girebilirsin. Değişiklikleri bu ekranda anında görürsün.
        </p>
      </section>

      <div className="writer-theme-editor__grid">
        {writerThemeLayers.map((layer) => (
          <section className="writer-theme-editor__layer" key={layer.key}>
            <div className="writer-theme-editor__layer-header">
              <div>
                <h2>{layer.label}</h2>
                <p>{layer.description}</p>
              </div>
              <span
                aria-label={`Seçili renk ${theme[layer.key]}`}
                className="writer-theme-editor__selected"
                style={{ background: theme[layer.key] }}
              />
            </div>

            <div aria-label={`${layer.label} renk kartelası`} className="writer-theme-editor__palette">
              {writerThemePalette.map((color) => (
                <button
                  aria-label={`${color} rengini seç`}
                  className="writer-theme-editor__swatch"
                  data-selected={theme[layer.key] === color ? "true" : undefined}
                  key={color}
                  onClick={() => updateColor(layer.key, color)}
                  style={{ background: color }}
                  title={color}
                  type="button"
                />
              ))}
            </div>

            <div className="writer-theme-editor__custom">
              <label title="Özel renk seç">
                <span className="sr-only">{layer.label} özel renk seçici</span>
                <input
                  aria-label={`${layer.label} özel renk seçici`}
                  className="writer-theme-editor__picker"
                  onChange={(event) => updateColor(layer.key, event.target.value)}
                  type="color"
                  value={theme[layer.key]}
                />
              </label>

              <label>
                <span className="sr-only">HEX</span>
                <input
                  aria-label={`${layer.label} HEX değeri`}
                  maxLength={7}
                  onBlur={(event) => {
                    const normalized = normalizeHex(event.target.value);
                    event.target.value = normalized ?? theme[layer.key];
                    if (normalized) updateColor(layer.key, normalized);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  type="text"
                  defaultValue={theme[layer.key]}
                  key={`hex-${layer.key}-${theme[layer.key]}`}
                />
              </label>

              <label>
                <span className="sr-only">RGB</span>
                <input
                  aria-label={`${layer.label} RGB değeri`}
                  onBlur={(event) => {
                    const normalized = rgbToHex(event.target.value);
                    event.target.value = normalized ? hexToRgb(normalized) : hexToRgb(theme[layer.key]);
                    if (normalized) updateColor(layer.key, normalized);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  type="text"
                  defaultValue={hexToRgb(theme[layer.key])}
                  key={`rgb-${layer.key}-${theme[layer.key]}`}
                  placeholder="104, 71, 232"
                />
              </label>
            </div>

            <div>
              <Button onClick={() => resetLayer(layer.key)} type="button" variant="ghost">
                Bu rengi varsayılana döndür
              </Button>
            </div>
          </section>
        ))}
      </div>

      <div className="writer-theme-editor__actions">
        {message ? <span role="status">{message}</span> : null}
        <Button onClick={resetAll} type="button" variant="ghost">
          Tümünü varsayılana döndür
        </Button>
        <Button disabled={!dirty} onClick={save} type="button">
          Renkleri kaydet
        </Button>
      </div>
    </div>
  );
}
