"use client";

import { useEffect, useState } from "react";

import {
  isReadingDisplayMode,
  READING_DISPLAY_MODE_EVENT,
  READING_DISPLAY_MODE_STORAGE_KEY,
  type ReadingDisplayMode,
} from "../reading-display-mode";
import styles from "./ReadingModeToggle.module.css";

export function ReadingModeToggle() {
  const [mode, setMode] = useState<ReadingDisplayMode>("scroll");

  useEffect(() => {
    const saved = window.localStorage.getItem(
      READING_DISPLAY_MODE_STORAGE_KEY,
    );
    const frame = isReadingDisplayMode(saved)
      ? window.requestAnimationFrame(() => setMode(saved))
      : 0;

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function chooseMode(nextMode: ReadingDisplayMode) {
    setMode(nextMode);
    window.localStorage.setItem(
      READING_DISPLAY_MODE_STORAGE_KEY,
      nextMode,
    );
    window.dispatchEvent(
      new CustomEvent(READING_DISPLAY_MODE_EVENT, {
        detail: nextMode,
      }),
    );
  }

  return (
    <section
      aria-label="Okuma biçimi"
      className={styles.modeControl}
    >
      <div className={styles.heading}>
        <strong>Okuma Biçimi</strong>
        <small>
          Kaydırarak oku veya kitabı sayfa sayfa ilerlet.
        </small>
      </div>

      <div className={styles.options} role="group" aria-label="Okuma biçimi seçimi">
        <button
          aria-pressed={mode === "scroll"}
          onClick={() => chooseMode("scroll")}
          type="button"
        >
          Kaydırmalı
        </button>
        <button
          aria-pressed={mode === "paged"}
          onClick={() => chooseMode("paged")}
          type="button"
        >
          Sayfalı
        </button>
      </div>
    </section>
  );
}
