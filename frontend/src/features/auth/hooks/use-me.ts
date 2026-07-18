"use client";

import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/features/auth/api/auth.api";
import { authKeys } from "@/features/auth/hooks/auth-keys";

export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: getMe,
    retry: false,
  });
}
