import { cn } from "@/shared/lib/cn";
import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block text-sm w-full" htmlFor={inputId}>
      {label && (
        <span className="text-gold-300/90 mb-1.5 block font-medium">{label}</span>
      )}
      <input id={inputId} className={cn("input-field", className)} {...props} />
      {error && <span className="text-red-400/90 text-xs mt-1.5 block">{error}</span>}
    </label>
  );
}
