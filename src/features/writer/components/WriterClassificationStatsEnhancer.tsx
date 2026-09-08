"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import {
  workContentRatingDetails,
  workContentRatings,
  workContentWarningDetails,
  workContentWarnings,
  type WorkContentRating,
  type WorkContentWarning,
} from "@/lib/work-content-classification";

type ClassificationTarget = {
  screen: HTMLElement;
  footer: HTMLElement;
  originalPanel: HTMLDetailsElement;
  rating: HTMLSelectElement;
  confirmation: HTMLInputElement;
};

type ClassificationSnapshot = {
  confirmed: boolean;
  rating: string;
  warnings: WorkContentWarning[];
};

const UNAVAILABLE = "writer-classification-stats-unavailable";

function getTarget(): ClassificationTarget | null {
  if (typeof document === "undefined") return null;

  const screen = document.querySelector<HTMLElement>(".writer-screen");
  const footer = screen?.querySelector<HTMLElement>(
    ".writer-editor-layout > .writer-footer",
  );
  const originalPanel = screen?.querySelector<HTMLDetailsElement>(
    ".writer-chapters > .writer-classification-panel",
  );
  const rating = originalPanel?.querySelector<HTMLSelectElement>(
    'select[name="contentRating"]',
  );
  const confirmation = originalPanel?.querySelector<HTMLInputElement>(
    'input[name="contentClassificationConfirmed"]',
  );

  if (!screen || !footer || !originalPanel || !rating || !confirmation) {
    return null;
  }

  return { screen, footer, originalPanel, rating, confirmation };
}

function getSnapshot() {
  const target = getTarget();
  if (!target) return UNAVAILABLE;

  const warnings = Array.from(
    target.originalPanel.querySelectorAll<HTMLInputElement>(
      'input[name="contentWarnings"]:checked',
    ),
  )
    .map((input) => input.value)
    .filter((value): value is WorkContentWarning =>
      workContentWarnings.includes(value as WorkContentWarning),
    );

  return JSON.stringify({
    confirmed: target.confirmation.checked,
    rating: target.rating.value,
    warnings,
  } satisfies ClassificationSnapshot);
}

function getServerSnapshot() {
  return UNAVAILABLE;
}

function subscribe(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => undefined;

  const handleChange = () => onStoreChange();
  document.addEventListener("change", handleChange, true);

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    document.removeEventListener("change", handleChange, true);
    observer.disconnect();
  };
}

function setNativeSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  )?.set;

  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNativeCheckboxValue(input: HTMLInputElement, checked: boolean) {
  if (input.checked === checked) return;
  input.click();
}

function ratingLabel(value: string) {
  return workContentRatings.includes(value as WorkContentRating)
    ? workContentRatingDetails[value as WorkContentRating].shortLabel
    : "Seçilmedi";
}

export function WriterClassificationStatsEnhancer() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const target = getTarget();
  const screen = target?.screen ?? null;

  useEffect(() => {
    if (!screen) return;

    screen.classList.add("writer-classification-in-stats");
    return () => screen.classList.remove("writer-classification-in-stats");
  }, [screen]);

  if (!target || snapshot === UNAVAILABLE) return null;

  const state = JSON.parse(snapshot) as ClassificationSnapshot;

  function updateWarning(warning: WorkContentWarning, checked: boolean) {
    const original = target.originalPanel.querySelector<HTMLInputElement>(
      `input[name="contentWarnings"][value="${warning}"]`,
    );
    if (original) setNativeCheckboxValue(original, checked);
  }

  return createPortal(
    <details className="writer-classification-panel writer-classification-panel--statistics">
      <summary>
        <span>İçerik sınıfı</span>
        <strong>{ratingLabel(state.rating)}</strong>
      </summary>

      <fieldset className="work-classification work-classification--compact">
        <legend>İçerik ve yaş sınıfı</legend>
        <p>
          Eserin tamamındaki en yoğun içeriği esas al. Bu bilgi okura yayın öncesinde gösterilir.
        </p>

        <label className="work-classification__rating">
          <span>Yaş sınıfı</span>
          <select
            aria-label="İçerik yaş sınıfı"
            value={state.rating}
            onChange={(event) => setNativeSelectValue(target.rating, event.target.value)}
          >
            <option value="" disabled>Sınıf seç</option>
            {workContentRatings.map((rating) => (
              <option value={rating} key={rating}>
                {workContentRatingDetails[rating].label}
                {rating === "adult_18" ? " — public yayın kapalı" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="work-classification__warnings" aria-label="İçerik uyarıları">
          {workContentWarnings.map((warning) => (
            <label key={warning}>
              <input
                type="checkbox"
                checked={state.warnings.includes(warning)}
                onChange={(event) => updateWarning(warning, event.target.checked)}
              />
              <span>{workContentWarningDetails[warning].label}</span>
            </label>
          ))}
        </div>

        <label className="work-classification__confirm">
          <input
            type="checkbox"
            checked={state.confirmed}
            onChange={(event) =>
              setNativeCheckboxValue(target.confirmation, event.target.checked)
            }
          />
          <span>
            Sınıfı eserin en yoğun bölümüne göre seçtiğimi ve eser değişirse güncelleyeceğimi onaylıyorum.
            {" "}
            <a href="/icerik-ve-yas-politikasi" target="_blank" rel="noreferrer">
              Politikayı oku
            </a>
          </span>
        </label>
      </fieldset>
    </details>,
    target.footer,
  );
}
