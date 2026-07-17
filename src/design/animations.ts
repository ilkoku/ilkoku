export const animationDuration = {
  fast: "120ms",
  normal: "180ms",
  slow: "280ms",
} as const;

export const animationEasing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  enter: "cubic-bezier(0, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export const animations = {
  fade: `fade-in ${animationDuration.normal} ${animationEasing.enter}`,
  scale: `scale-in ${animationDuration.normal} ${animationEasing.enter}`,
  slide: `slide-in ${animationDuration.slow} ${animationEasing.enter}`,
  hover: `transform ${animationDuration.fast} ${animationEasing.standard}`,
} as const;

export type AnimationToken = keyof typeof animations;
