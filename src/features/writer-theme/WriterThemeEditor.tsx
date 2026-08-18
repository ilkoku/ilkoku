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
  writerThemePaletteGroups,
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

function hexToHsl(hex: string) {
  const normalized = normalizeHex(hex) ?? "#000000";
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;

  return `${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%`;
}

function hslToHex(value: string) {
  const cleaned = value
    .trim()
    .replace(/^hsl\(/i, "")
    .replace(/\)$/, "")
    .replace(/,/g, " ")
    .replace(/deg/gi, "")
    .trim();

  if (!cleaned || cleaned.includes("/")) return null;

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length !== 3) return null;

  const hueInput = Number.parseFloat(parts[0]);
  const saturation = Number.parseFloat(parts[1].replace("%", ""));
  const lightness = Number.parseFloat(parts[2].replace("%", ""));

  if (
    !Number.isFinite(hueInput) ||
    !Number.isFinite(saturation) ||
    !Number.isFinite(lightness) ||
    saturation < 0 ||
    saturation > 100 ||
    lightness < 0 ||
    lightness > 100
  ) {
    return null;
  }

  const hue = ((hueInput % 360) + 360) % 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = l - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment < 1) [red, green, blue] = [chroma, x, 0];
  else if (segment < 2) [red, green, blue] = [x, chroma, 0];
  else if (segment < 3) [red, green, blue] = [0, chroma, x];
  else if (segment < 4) [red, green, blue] = [0, x, chroma];
  else if (segment < 5) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function WriterThemeEditor({ userId }: { userId: string }) {
  const [theme, setTheme] = useState<WriterTheme>({ ...defaultWriterTheme });
  const [savedTheme, setSavedTheme] = useState<WriterTheme>({ ...defaultWriterTheme });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = loadWriterTheme(userId);
    let active = true;

    applyWriterTheme(stored);
    queueMicrotask(() => {
      if (!active) return;
      setTheme(stored);
      setSavedTheme(stored);
    });

    return () => {
      active = false;
    };
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
          Hazır kartelalar yalnızca hızlı seçim içindir; renk seçimin bunlarla sınırlı değildir.
          Tam renk seçiciyi açabilir veya istediğin HEX, RGB ya da HSL değerini girebilirsin.
          Değişiklikleri bu ekranda anında görürsün.
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

            <div className="writer-theme-editor__palette-groups">
              {writerThemePaletteGroups.map((group) => (
                <div className="writer-theme-editor__palette-group" key={group.label}>
                  <span className="writer-theme-editor__palette-label">{group.label}</span>
                  <div aria-label={`${layer.label} ${group.label} renk kartelası`} className="writer-theme-editor__palette">
                    {group.colors.map((color) => (
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
                </div>
              ))}
            </div>

            <div className="writer-theme-editor__custom">
              <label title="Sınırsız özel renk seç">
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
                <span className="writer-theme-editor__field-label">HEX</span>
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
                  placeholder="#6847E8"
                />
              </label>

              <label>
                <span className="writer-theme-editor__field-label">RGB</span>
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

              <label>
                <span className="writer-theme-editor__field-label">HSL</span>
                <input
                  aria-label={`${layer.label} HSL değeri`}
                  onBlur={(event) => {
                    const normalized = hslToHex(event.target.value);
                    event.target.value = normalized ? hexToHsl(normalized) : hexToHsl(theme[layer.key]);
                    if (normalized) updateColor(layer.key, normalized);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  type="text"
                  defaultValue={hexToHsl(theme[layer.key])}
                  key={`hsl-${layer.key}-${theme[layer.key]}`}
                  placeholder="252, 78%, 59%"
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
