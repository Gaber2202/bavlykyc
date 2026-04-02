import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        richColors
        position="top-center"
        dir="rtl"
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "!bg-ink !border !border-gold-600/35 !text-gold-100 shadow-xl shadow-black/60",
            title: "!text-gold-100",
            description: "!text-gold-400",
            success: "!border-emerald-700/50",
            error: "!border-red-800/60",
          },
        }}
      />
    </QueryClientProvider>
  );
}
