"use client";

import {
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import {
  workContentRatingDetails,
  workContentRatings,
  workContentWarningDetails,
  workContentWarnings,
  type WorkContentRating,
  type WorkContentWarning,
} from "@/lib/work-content-classification";
import {
  getMissingClassificationRequirements,
  getMissingPublicationRequirements,
  publicationReadinessMessage,
  requestPublicationReadinessAttention,
  WRITER_PUBLICATION_READINESS_EVENT,
  type WriterPublicationReadinessEventDetail,
  type WriterPublicationRequirementKey,
} from "../writer-publication-readiness";

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
  document.addEventListener("input", handleChange, true);

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    document.removeEventListener("change", handleChange, true);
    document.removeEventListener("input", handleChange, true);
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

function publishButtonFromEvent(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  const form = target.closest<HTMLFormElement>("form.writer-screen");
  if (!form) return null;

  const button = target.closest<HTMLButtonElement>(
    '.writer-toolbar__actions button[type="submit"]:not(.writer-save-button)',
  );
  if (!button) return null;

  return { form };
}

function writerPublishFormFromSubmit(event: SubmitEvent) {
  if (
    !(event.target instanceof HTMLFormElement) ||
    !event.target.matches("form.writer-screen") ||
    !(event.submitter instanceof HTMLButtonElement) ||
    event.submitter.classList.contains("writer-save-button")
  ) {
    return null;
  }

  return event.target;
}

function blockPublishWhenRequirementsAreMissing(
  event: MouseEvent | SubmitEvent,
  form: HTMLFormElement,
) {
  const missing = getMissingPublicationRequirements(form);
  if (missing.length === 0) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  requestPublicationReadinessAttention(form, missing);
  window.alert(publicationReadinessMessage(missing));
  return true;
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
  const panelRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [attentionKey, setAttentionKey] =
    useState<WriterPublicationRequirementKey | null>(null);

  // Publish readiness must run before the passive full-book publish enhancer.
  // This keeps all works on one rule while giving exact missing-field feedback.
  useInsertionEffect(() => {
    function handlePublishClick(event: MouseEvent) {
      const match = publishButtonFromEvent(event);
      if (!match) return;
      blockPublishWhenRequirementsAreMissing(event, match.form);
    }

    function handlePublishSubmit(event: SubmitEvent) {
      const form = writerPublishFormFromSubmit(event);
      if (!form) return;
      blockPublishWhenRequirementsAreMissing(event, form);
    }

    document.addEventListener("click", handlePublishClick, true);
    document.addEventListener("submit", handlePublishSubmit, true);

    return () => {
      document.removeEventListener("click", handlePublishClick, true);
      document.removeEventListener("submit", handlePublishSubmit, true);
    };
  }, []);

  useEffect(() => {
    if (!screen) return;

    screen.classList.add("writer-classification-in-stats");
    return () => screen.classList.remove("writer-classification-in-stats");
  }, [screen]);

  useEffect(() => {
    function handleReadinessAttention(event: Event) {
      const detail = (event as CustomEvent<WriterPublicationReadinessEventDetail>)
        .detail;
      const firstClassificationRequirement = detail?.requirements.find(
        (requirement) => requirement.key !== "requiredField",
      );
      if (!firstClassificationRequirement) return;

      setExpanded(true);
      setAttentionKey(firstClassificationRequirement.key);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const panel = panelRef.current;
          if (!panel) return;

          const field = panel.querySelector<HTMLElement>(
            `[data-publication-readiness-key="${firstClassificationRequirement.key}"]`,
          );
          if (!field) return;

          field.scrollIntoView({ behavior: "smooth", block: "center" });
          const focusTarget =
            field instanceof HTMLInputElement || field instanceof HTMLSelectElement
              ? field
              : field.querySelector<HTMLElement>("input, select, button");
          focusTarget?.focus({ preventScroll: true });
        });
      });
    }

    document.addEventListener(
      WRITER_PUBLICATION_READINESS_EVENT,
      handleReadinessAttention,
    );
    return () =>
      document.removeEventListener(
        WRITER_PUBLICATION_READINESS_EVENT,
        handleReadinessAttention,
      );
  }, []);

  if (!target || snapshot === UNAVAILABLE) return null;

  const activeTarget = target;
  const state = JSON.parse(snapshot) as ClassificationSnapshot;
  const writerForm = activeTarget.originalPanel.closest<HTMLFormElement>(
    "form.writer-screen",
  );
  const classificationMissing = getMissingClassificationRequirements(state);
  const allMissing = writerForm
    ? getMissingPublicationRequirements(writerForm)
    : classificationMissing;
  const ready = allMissing.length === 0;
  const selectedRating = workContentRatings.includes(
    state.rating as WorkContentRating,
  )
    ? state.rating
    : "";

  function updateWarning(warning: WorkContentWarning, checked: boolean) {
    const original = activeTarget.originalPanel.querySelector<HTMLInputElement>(
      `input[name="contentWarnings"][value="${warning}"]`,
    );
    if (original) setNativeCheckboxValue(original, checked);
  }

  function toggleExpanded() {
    setExpanded((current) => !current);
    setAttentionKey(null);
  }

  return createPortal(
    <section
      className="writer-classification-panel writer-classification-panel--statistics"
      data-attention={attentionKey ? "true" : "false"}
      data-state={ready ? "ready" : "missing"}
      ref={panelRef}
    >
      <div className="writer-publication-readiness__summary">
        <div className="writer-publication-readiness__copy">
          <span>Yayın Durumu</span>
          <small>
            {ready
              ? `Hazır · İçerik sınıfı ${ratingLabel(state.rating)}`
              : publicationReadinessMessage(allMissing)}
          </small>
        </div>
        <strong>{ready ? "Hazır ✓" : "Eksik"}</strong>
      </div>

      <button
        aria-expanded={expanded}
        className="writer-publication-readiness__toggle"
        onClick={toggleExpanded}
        type="button"
      >
        {expanded ? "Kapat" : ready ? "Düzenle" : "Tamamla"}
      </button>

      {expanded ? (
        <fieldset className="work-classification work-classification--compact">
          <legend>İçerik ve yaş sınıfı</legend>
          <p>
            Eserin tamamındaki en yoğun içeriği esas al. Bu bilgi okura yayın öncesinde gösterilir.
          </p>

          <label
            className="work-classification__rating"
            data-publication-readiness-key="contentRating"
          >
            <span>Yaş sınıfı</span>
            <select
              aria-label="İçerik yaş sınıfı"
              value={selectedRating}
              onChange={(event) => {
                setAttentionKey(null);
                setNativeSelectValue(activeTarget.rating, event.target.value);
              }}
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

          <div
            className="work-classification__warnings"
            aria-label="İçerik uyarıları"
            data-publication-readiness-key="contentWarnings"
          >
            {workContentWarnings.map((warning) => (
              <label key={warning}>
                <input
                  type="checkbox"
                  checked={state.warnings.includes(warning)}
                  onChange={(event) => {
                    setAttentionKey(null);
                    updateWarning(warning, event.target.checked);
                  }}
                />
                <span>{workContentWarningDetails[warning].label}</span>
              </label>
            ))}
          </div>

          <label
            className="work-classification__confirm"
            data-publication-readiness-key="contentClassificationConfirmed"
          >
            <input
              type="checkbox"
              checked={state.confirmed}
              onChange={(event) => {
                setAttentionKey(null);
                setNativeCheckboxValue(
                  activeTarget.confirmation,
                  event.target.checked,
                );
              }}
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
      ) : null}
    </section>,
    activeTarget.footer,
  );
}
