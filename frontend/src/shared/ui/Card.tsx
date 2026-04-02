import { cn } from "@/shared/lib/cn";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  title,
  subtitle,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  padding?: boolean;
}) {
  return (
    <section className={cn("glass-panel", padding && "p-5", className)}>
      {(title || subtitle) && (
        <header className="mb-4 space-y-1">
          {title && <h2 className="text-gold-300 font-semibold text-base">{title}</h2>}
          {subtitle && <p className="text-xs text-gold-600 leading-relaxed">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
