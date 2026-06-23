import { API_BASE_URL } from "@/lib/constants";
import type { PRListResponse, PullRequestDetail, TeamsResponse } from "@/types/pull-request";

async function apiClient<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchPullRequests(): Promise<PRListResponse> {
  return apiClient<PRListResponse>("/api/v1/pull-requests");
}

export async function fetchPRDetail(prNumber: number, repo?: string): Promise<PullRequestDetail> {
  const params = repo ? `?repo=${encodeURIComponent(repo)}` : "";
  return apiClient<PullRequestDetail>(`/api/v1/pull-requests/${prNumber}${params}`);
}

export async function fetchTeams(): Promise<TeamsResponse> {
  return apiClient<TeamsResponse>("/api/v1/teams");
}

export async function fetchHealthCheck(): Promise<{ status: string }> {
  return apiClient<{ status: string }>("/api/v1/health");
}
