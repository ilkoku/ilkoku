import type { ButtonHTMLAttributes, ReactNode } from "react";
import { notificationContent } from "@/content";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

export function Button({ children, className = "", disabled, loading = false, type = "button", variant = "primary", ...props }: ButtonProps) {
  const classes = ["button", `button--${variant}`, className].filter(Boolean).join(" ");

  return (
    <button {...props} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} type={type}>
      {loading && <span className="button__spinner" aria-hidden="true" />}
      <span className={loading ? "button__label button__label--loading" : "button__label"}>{children}</span>
      {loading && <span className="sr-only">{notificationContent.loading}</span>}
    </button>
  );
}
