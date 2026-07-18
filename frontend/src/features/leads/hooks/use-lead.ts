"use client";

import { useQuery } from "@tanstack/react-query";

import { getLead } from "@/features/leads/api/leads.api";
import { leadKeys } from "@/features/leads/hooks/lead-keys";

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? ""),
    queryFn: () => getLead(id!),
    enabled: Boolean(id),
  });
}
