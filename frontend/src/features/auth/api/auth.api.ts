import { ApiError, apiFetch, parseDetail } from "@/lib/api-client";
import type { User } from "@/features/auth/types";

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
