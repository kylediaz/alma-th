"use client";

import { useQuery } from "@tanstack/react-query";

import { listLeads } from "@/features/leads/api/leads.api";
import { leadKeys } from "@/features/leads/hooks/lead-keys";
import type { ListLeadsParams } from "@/features/leads/types";

export function useLeads(params: ListLeadsParams) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: () => listLeads(params),
  });
}
