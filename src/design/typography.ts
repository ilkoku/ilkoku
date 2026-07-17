export const fontFamilies = {
  sans: "var(--font-inter), sans-serif",
  serif: "var(--font-playfair), serif",
} as const;

export const typography = {
  display: { fontFamily: fontFamilies.serif, fontSize: "clamp(3rem, 7vw, 6rem)", lineHeight: 0.96, fontWeight: 500, letterSpacing: "-0.045em" },
  heading: { fontFamily: fontFamilies.serif, fontSize: "clamp(2.25rem, 4vw, 3.5rem)", lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.035em" },
  title: { fontFamily: fontFamilies.sans, fontSize: "1.25rem", lineHeight: 1.4, fontWeight: 600, letterSpacing: "-0.015em" },
  body: { fontFamily: fontFamilies.sans, fontSize: "1rem", lineHeight: 1.65, fontWeight: 400, letterSpacing: "0" },
  small: { fontFamily: fontFamilies.sans, fontSize: "0.875rem", lineHeight: 1.5, fontWeight: 400, letterSpacing: "0" },
  caption: { fontFamily: fontFamilies.sans, fontSize: "0.75rem", lineHeight: 1.4, fontWeight: 500, letterSpacing: "0.08em" },
} as const;

export type TypographyToken = keyof typeof typography;
