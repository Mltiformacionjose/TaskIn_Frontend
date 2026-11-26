import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[9px] px-[17px] py-3 text-xs font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent-strong text-on-accent hover:bg-accent-strong-hover",
  secondary: "border border-line bg-panel-2 text-fg hover:bg-line",
  ghost: "border border-line bg-transparent text-muted hover:text-fg",
  danger: "bg-danger-soft text-danger-text hover:brightness-125",
};

/** Clases de un botón; permite dar el mismo aspecto a un enlace. */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

/** Enlace de navegación con aspecto de botón. */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
