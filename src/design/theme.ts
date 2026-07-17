import { animations, animationDuration, animationEasing } from "./animations";
import { colors } from "./colors";
import { iconNames, iconSizes } from "./icons";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { fontFamilies, typography } from "./typography";

export const darkTheme = {
  mode: "dark",
  colors,
  typography,
  fontFamilies,
  spacing,
  radius,
  shadows,
  animations,
  animationDuration,
  animationEasing,
  icons: { names: iconNames, sizes: iconSizes },
} as const;

export type Theme = typeof darkTheme;
