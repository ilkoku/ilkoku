import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "default" | "hover" | "interactive";

export type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: CardVariant;
};

export function Card({ children, className = "", variant = "default", ...props }: CardProps) {
  const classes = ["card", `card--${variant}`, className].filter(Boolean).join(" ");
  return <article {...props} className={classes}>{children}</article>;
}
