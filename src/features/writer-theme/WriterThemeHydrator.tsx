"use client";

import { useEffect } from "react";

import {
  defaultWriterTheme,
  sanitizeWriterTheme,
  writerThemeStorageKey,
  type WriterTheme,
  type WriterThemeKey,
} from "./theme";

const cssVariables: Record<WriterThemeKey, string> = {
  pageCanvas: "--writer-custom-page-canvas",
  sidebar: "--writer-custom-sidebar",
  mainSurface: "--writer-custom-main-surface",
  cardSurface: "--writer-custom-card-surface",
  controlSurface: "--writer-custom-control-surface",
  border: "--writer-custom-border",
  text: "--writer-custom-text",
  textMuted: "--writer-custom-text-muted",
  heading: "--writer-custom-heading",
  activeNav: "--writer-custom-active-nav",
  hover: "--writer-custom-hover",
  primary: "--writer-custom-primary",
  primaryHover: "--writer-custom-primary-hover",
  accent: "--writer-custom-accent",
  progressTrack: "--writer-custom-progress-track",
};

export function applyWriterTheme(theme: WriterTheme) {
  const shell = document.querySelector<HTMLElement>('.app-shell[data-role="writer"]');
  if (!shell) return;

  for (const key of Object.keys(cssVariables) as WriterThemeKey[]) {
    shell.style.setProperty(cssVariables[key], theme[key]);
  }
}

export function loadWriterTheme(userId: string): WriterTheme {
  try {
    const raw = window.localStorage.getItem(writerThemeStorageKey(userId));
    if (!raw) return { ...defaultWriterTheme };
    return sanitizeWriterTheme(JSON.parse(raw));
  } catch {
    return { ...defaultWriterTheme };
  }
}

export function saveWriterTheme(userId: string, theme: WriterTheme) {
  window.localStorage.setItem(
    writerThemeStorageKey(userId),
    JSON.stringify(sanitizeWriterTheme(theme)),
  );
}

export function resetWriterTheme(userId: string) {
  window.localStorage.removeItem(writerThemeStorageKey(userId));
  applyWriterTheme({ ...defaultWriterTheme });
}

export function WriterThemeHydrator({ userId }: { userId: string }) {
  useEffect(() => {
    applyWriterTheme(loadWriterTheme(userId));
  }, [userId]);

  return null;
}
