export const radius = {
  small: "0.375rem",
  medium: "0.625rem",
  large: "1rem",
  xl: "1.5rem",
  full: "999px",
} as const;

export type RadiusToken = keyof typeof radius;
