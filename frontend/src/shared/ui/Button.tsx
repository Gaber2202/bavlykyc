import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger:
    "rounded-lg border border-red-800/60 px-3 py-2 text-red-300 hover:bg-red-950/30 transition text-sm font-medium",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
