/**
 * Keep independently approved SEO metadata when a legal document is republished
 * with its visible "Kısa açıklama" left unchanged. A deliberate change to that
 * visible summary retains the existing CMS behavior and updates both fields.
 *
 * This is a pure decision helper: it never modifies body, publication status,
 * title, canonical, locale or other stored fields.
 *
 * @param {{
 *   submittedDescription: string,
 *   existingBodyJson?: string | null,
 *   existingSeoDescription?: string | null,
 * }} input
 * @returns {string | null}
 */
export function resolveLegalSeoDescription({ submittedDescription, existingBodyJson, existingSeoDescription }) {
  const submitted = submittedDescription.trim();
  const fallback = submitted || null;
  const existingSeo = existingSeoDescription?.trim();

  if (!existingSeo || !existingBodyJson) return fallback;

  try {
    const parsed = JSON.parse(existingBodyJson);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof parsed.description === "string" &&
      parsed.description.trim() === submitted
    ) {
      return existingSeo;
    }
  } catch {
    // If the stored JSON cannot be read, do not assume that the summary
    // was unchanged. Retain the original document save behavior.
  }

  return fallback;
}
