export const colors = {
  background: "#0B0D10",
  surface: "#13161B",
  card: "#1A1F27",
  primary: "#D4AF37",
  primaryHover: "#E5C75A",
  danger: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  border: "rgba(255, 255, 255, 0.08)",
} as const;

export type ColorToken = keyof typeof colors;
