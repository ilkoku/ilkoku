export const iconSizes = {
  small: 16,
  medium: 20,
  large: 24,
} as const;

export const iconNames = [
  "arrowRight",
  "check",
  "chevronDown",
  "close",
  "eye",
  "eyeOff",
  "search",
  "warning",
] as const;

export type IconName = (typeof iconNames)[number];
export type IconSize = keyof typeof iconSizes;
