import { ApiError, apiFetch, parseDetail } from "@/lib/api-client";
import type {
  CreateLeadInput,
  Lead,
  LeadCreateResponse,
  LeadDetail,
  LeadListResponse,
  ListLeadsParams,
  ResumeLink,
} from "@/features/leads/types";

export async function createLead(
  input: CreateLeadInput,
): Promise<LeadCreateResponse> {
  const body = new FormData();
  body.set("first_name", input.first_name);
  body.set("last_name", input.last_name);
  body.set("email", input.email);
  body.set("resume", input.resume);

  const response = await apiFetch("/leads", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<LeadCreateResponse>;
}

export async function listLeads(
  params: ListLeadsParams,
): Promise<LeadListResponse> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.page_size ?? 20));
  if (params.status) {
    search.set("status", params.status);
  }

  const response = await apiFetch(`/leads?${search.toString()}`);

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<LeadListResponse>;
}

export async function getLead(id: string): Promise<LeadDetail> {
  const response = await apiFetch(`/leads/${id}`);

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<LeadDetail>;
}

export async function updateLeadStatus(
  id: string,
  status: "REACHED_OUT",
): Promise<Lead> {
  const response = await apiFetch(`/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<Lead>;
}

export async function getResumeLink(id: string): Promise<ResumeLink> {
  const response = await apiFetch(`/leads/${id}/resume`);

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<ResumeLink>;
}
