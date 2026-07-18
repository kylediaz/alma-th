"use client";

import { useMutation } from "@tanstack/react-query";

import { createLead } from "@/features/leads/api/leads.api";
import type { CreateLeadInput } from "@/features/leads/types";

export function useCreateLead() {
  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
  });
}
