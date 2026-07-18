"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState } from "react";

import { ApiError } from "@/lib/api-client";

function handleAuthError(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    if (window.location.pathname.startsWith("/admin") && !window.location.pathname.startsWith("/admin/login")) {
      window.location.assign("/admin/login");
    }
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: handleAuthError,
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status === 401) {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsAdapter>
  );
}
