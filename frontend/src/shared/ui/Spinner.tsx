import { cn } from "@/shared/lib/cn";

export function Spinner({ className, label = "جاري التحميل…" }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-gold-400",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 rounded-full border-2 border-gold-600/30 border-t-gold-400 animate-spin"
        aria-hidden
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
