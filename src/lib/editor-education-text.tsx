import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

export type EditorEducationTextOverrides = Record<string, string>;

export type EditorEducationTextField = {
  key: string;
  value: string;
  kind: "heading" | "paragraph" | "label" | "link" | "text";
  label: string;
};

type ParentMeta = {
  tag: string | null;
  href: string | null;
};

function textFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function fieldKey(path: readonly string[], value: string) {
  return `t-${path.join("-")}-${textFingerprint(value)}`;
}

function textKind(meta: ParentMeta): EditorEducationTextField["kind"] {
  if (meta.href) return "link";
  if (meta.tag && /^h[1-6]$/.test(meta.tag)) return "heading";
  if (meta.tag === "p" || meta.tag === "li") return "paragraph";
  if (["span", "strong", "small", "button"].includes(meta.tag ?? "")) return "label";
  return "text";
}

function fieldLabel(meta: ParentMeta, value: string) {
  const prefix = meta.href
    ? "Bağlantı / CTA"
    : meta.tag && /^h[1-6]$/.test(meta.tag)
      ? meta.tag.toUpperCase()
      : meta.tag === "p"
        ? "Paragraf"
        : meta.tag === "li"
          ? "Liste maddesi"
          : meta.tag === "span"
            ? "Etiket"
            : meta.tag === "strong"
              ? "Vurgu"
              : meta.tag === "small"
                ? "Kısa not"
                : "Metin";
  const preview = value.length > 72 ? `${value.slice(0, 69)}…` : value;
  return `${prefix} · ${preview}`;
}

function metaForElement(element: ReactElement<Record<string, unknown>>): ParentMeta {
  const tag = typeof element.type === "string" ? element.type : null;
  const href = typeof element.props.href === "string" ? element.props.href : null;
  return { tag, href };
}

function preservedWhitespace(original: string, replacement: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${replacement}${trailing}`;
}

function collectNode(
  node: ReactNode,
  path: string[],
  parent: ParentMeta,
  fields: EditorEducationTextField[],
) {
  if (typeof node === "string" || typeof node === "number") {
    const value = String(node).trim();
    if (!value) return;
    fields.push({
      key: fieldKey(path, value),
      value,
      kind: textKind(parent),
      label: fieldLabel(parent, value),
    });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, index) => collectNode(child, [...path, `a${index}`], parent, fields));
    return;
  }
  if (!isValidElement(node)) return;
  const element = node as ReactElement<Record<string, unknown>>;
  const nextParent = metaForElement(element);
  const children = element.props.children as ReactNode;
  collectNode(children, [...path, "c"], nextParent, fields);
}

export function collectEditorEducationTextFields(node: ReactNode) {
  const fields: EditorEducationTextField[] = [];
  collectNode(node, ["root"], { tag: null, href: null }, fields);
  return fields;
}

function applyNode(
  node: ReactNode,
  path: string[],
  parent: ParentMeta,
  overrides: EditorEducationTextOverrides,
): ReactNode {
  if (typeof node === "string" || typeof node === "number") {
    const raw = String(node);
    const value = raw.trim();
    if (!value) return node;
    const replacement = overrides[fieldKey(path, value)];
    if (typeof replacement !== "string" || !replacement.trim()) return node;
    return preservedWhitespace(raw, replacement.trim());
  }
  if (Array.isArray(node)) {
    return node.map((child, index) => applyNode(child, [...path, `a${index}`], parent, overrides));
  }
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const children = element.props.children as ReactNode;
  if (typeof children === "undefined") return node;
  const nextParent = metaForElement(element);
  const transformed = applyNode(children, [...path, "c"], nextParent, overrides);
  return cloneElement(element, undefined, transformed);
}

export function applyEditorEducationTextOverrides(
  node: ReactNode,
  overrides: EditorEducationTextOverrides | null | undefined,
) {
  if (!overrides || Object.keys(overrides).length === 0) return node;
  return applyNode(node, ["root"], { tag: null, href: null }, overrides);
}
