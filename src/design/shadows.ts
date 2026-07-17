export const shadows = {
  small: "0 1px 2px rgba(0, 0, 0, 0.24)",
  medium: "0 12px 32px rgba(0, 0, 0, 0.24)",
  large: "0 24px 64px rgba(0, 0, 0, 0.32)",
  focus: "0 0 0 3px rgba(212, 175, 55, 0.2)",
  dangerFocus: "0 0 0 3px rgba(239, 68, 68, 0.2)",
} as const;

export type ShadowToken = keyof typeof shadows;
