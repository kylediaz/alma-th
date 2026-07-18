import type { Lead, LeadListResponse, User } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseDetail(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      return data.detail;
    }
  } catch {
    // ignore
  }
  return response.statusText || "Request failed";
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: init?.headers,
  });
}

export async function login(username: string, password: string): Promise<User> {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<User>;
}

export async function getMe(): Promise<User> {
  const response = await apiFetch("/auth/me");

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<User>;
}

export async function logout(): Promise<void> {
  const response = await apiFetch("/auth/logout", { method: "POST" });

  if (!response.ok && response.status !== 401) {
    throw new ApiError(response.status, await parseDetail(response));
  }
}

export async function listLeads(params: {
  limit?: number;
  cursor?: string | null;
}): Promise<LeadListResponse> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  if (params.cursor) {
    search.set("cursor", params.cursor);
  }

  const response = await apiFetch(`/leads?${search.toString()}`);

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  return response.json() as Promise<LeadListResponse>;
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

export async function fetchResumeBlob(
  id: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiFetch(`/leads/${id}/resume`);

  if (!response.ok) {
    throw new ApiError(response.status, await parseDetail(response));
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  const filename = utf8Match
    ? decodeURIComponent(utf8Match[1])
    : (plainMatch?.[1] ?? "resume");

  return { blob: await response.blob(), filename };
}
