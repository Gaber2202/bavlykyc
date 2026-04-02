import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gold-800/50 bg-ink/40 px-6 py-14 text-center">
      <p className="text-gold-300 font-medium">{title}</p>
      {description && <p className="text-gold-600 text-sm mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
