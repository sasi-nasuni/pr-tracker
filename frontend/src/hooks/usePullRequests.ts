import { useQuery } from "@tanstack/react-query";
import { fetchPullRequests } from "@/api/client";
import { REFETCH_INTERVAL_MS } from "@/lib/constants";

export function usePullRequests() {
  return useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: 60 * 1000,
  });
}
