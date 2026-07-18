"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateLeadStatus } from "@/features/leads/api/leads.api";
import { leadKeys } from "@/features/leads/hooks/lead-keys";
import type { LeadDetail } from "@/features/leads/types";

export function useMarkLeadReachedOut(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => updateLeadStatus(id, "REACHED_OUT"),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        leadKeys.detail(id),
        (current: LeadDetail | undefined) =>
          current ? { ...current, ...updated } : current,
      );
      void queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
