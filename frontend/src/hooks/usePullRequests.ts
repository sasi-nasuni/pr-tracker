import { useQuery } from "@tanstack/react-query";
import { fetchPullRequests } from "@/api/client";
import { REFETCH_INTERVAL_MS } from "@/lib/constants";
import type { PRFilters } from "@/types/pull-request";

export function usePullRequests(filters: PRFilters) {
  return useQuery({
    queryKey: ["pull-requests", filters],
    queryFn: () => fetchPullRequests(filters),
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: 60 * 1000,
  });
}
