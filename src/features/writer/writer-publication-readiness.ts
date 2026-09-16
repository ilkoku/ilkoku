import {
  workContentRatings,
  type WorkContentRating,
  type WorkContentWarning,
} from "@/lib/work-content-classification";

export const WRITER_PUBLICATION_READINESS_EVENT =
  "ilkoku:writer-publication-readiness";

export type WriterPublicationRequirementKey =
  | "contentRating"
  | "contentWarnings"
  | "contentClassificationConfirmed"
  | "requiredField";

export type WriterPublicationRequirement = {
  key: WriterPublicationRequirementKey;
  label: string;
  fieldName?: string;
};

export type WriterClassificationReadiness = {
  confirmed: boolean;
  rating: string;
  warnings: readonly WorkContentWarning[];
};

const FIELD_LABELS: Record<string, string> = {
  workTitle: "Eser adı",
  chapterTitle: "Bölüm başlığı",
  genre: "Tür",
  summary: "Eser özeti",
  content: "Bölüm metni",
};

const CLASSIFICATION_FIELD_NAMES = new Set([
  "contentRating",
  "contentWarnings",
  "contentClassificationConfirmed",
]);

export function getMissingClassificationRequirements(
  state: WriterClassificationReadiness,
): WriterPublicationRequirement[] {
  const missing: WriterPublicationRequirement[] = [];
  const rating = workContentRatings.includes(state.rating as WorkContentRating)
    ? (state.rating as WorkContentRating)
    : null;

  if (!rating) {
    missing.push({
      key: "contentRating",
      label: "Yaş sınıfı",
      fieldName: "contentRating",
    });
  } else if (rating !== "all_ages" && state.warnings.length === 0) {
    missing.push({
      key: "contentWarnings",
      label: "İçerik uyarısı",
      fieldName: "contentWarnings",
    });
  }

  if (!state.confirmed) {
    missing.push({
      key: "contentClassificationConfirmed",
      label: "İçerik sınıflandırması onayı",
      fieldName: "contentClassificationConfirmed",
    });
  }

  return missing;
}

function controlLabel(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const mapped = control.name ? FIELD_LABELS[control.name] : "";
  if (mapped) return mapped;

  const ariaLabel = control.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  const label = Array.from(control.labels ?? [])
    .map((candidate) => candidate.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .find(Boolean);
  if (label) return label;

  return control.name ? control.name : "Zorunlu alan";
}

function checkedWarnings(form: HTMLFormElement) {
  return Array.from(
    form.querySelectorAll<HTMLInputElement>(
      'input[name="contentWarnings"]:checked',
    ),
  ).map((input) => input.value as WorkContentWarning);
}

export function getMissingPublicationRequirements(form: HTMLFormElement) {
  const rating =
    form.querySelector<HTMLSelectElement>('select[name="contentRating"]')?.value ??
    "";
  const confirmed =
    form.querySelector<HTMLInputElement>(
      'input[name="contentClassificationConfirmed"]',
    )?.checked ?? false;

  const missing = getMissingClassificationRequirements({
    confirmed,
    rating,
    warnings: checkedWarnings(form),
  });
  const seenLabels = new Set(missing.map((requirement) => requirement.label));

  for (const element of Array.from(form.elements)) {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) ||
      element.disabled ||
      CLASSIFICATION_FIELD_NAMES.has(element.name) ||
      element.validity.valid
    ) {
      continue;
    }

    const label = controlLabel(element);
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    missing.push({
      key: "requiredField",
      label,
      fieldName: element.name || undefined,
    });
  }

  return missing;
}

export function publicationReadinessMessage(
  missing: readonly WriterPublicationRequirement[],
) {
  return `Eksik: ${missing.map((requirement) => requirement.label).join(" · ")}`;
}

export type WriterPublicationReadinessEventDetail = {
  requirements: WriterPublicationRequirement[];
};

export function requestPublicationReadinessAttention(
  form: HTMLFormElement,
  requirements: WriterPublicationRequirement[],
) {
  form.dispatchEvent(
    new CustomEvent<WriterPublicationReadinessEventDetail>(
      WRITER_PUBLICATION_READINESS_EVENT,
      {
        bubbles: true,
        detail: { requirements },
      },
    ),
  );

  const first = requirements[0];
  if (!first || first.key !== "requiredField" || !first.fieldName) return;

  const field = Array.from(form.elements).find(
    (element) =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement) &&
      element.name === first.fieldName,
  );

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    window.requestAnimationFrame(() => field.focus({ preventScroll: true }));
  }
}
