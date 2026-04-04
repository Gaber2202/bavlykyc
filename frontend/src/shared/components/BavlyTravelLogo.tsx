import logoSrc from "@/assets/branding/bavly-travel-logo.png";
import { cn } from "@/shared/lib/cn";

const LOGO_ALT = "Bavly Travel Logo — Discover the world with us";

type Variant = "login" | "sidebar";

interface BavlyTravelLogoProps {
  variant?: Variant;
  className?: string;
}

export function BavlyTravelLogo({ variant = "login", className }: BavlyTravelLogoProps) {
  const isLogin = variant === "login";
  return (
    <div
      className={cn(
        "flex justify-center rounded-xl bg-white shadow-md shadow-black/20",
        isLogin ? "p-4 sm:p-5" : "p-2 rounded-lg",
        className,
      )}
    >
      <img
        src={logoSrc}
        alt={LOGO_ALT}
        className={cn(
          "object-contain object-center",
          isLogin
            ? "h-36 w-auto max-h-44 sm:h-40 sm:max-h-48 max-w-[min(100%,260px)]"
            : "h-12 w-auto max-h-14 max-w-full",
        )}
        decoding="async"
        fetchPriority={isLogin ? "high" : undefined}
      />
    </div>
  );
}
