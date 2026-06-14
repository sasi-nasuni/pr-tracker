import { useQuery } from "@tanstack/react-query";
import { fetchPRDetail } from "@/api/client";

export function usePRDetail(prNumber: number | null, repo?: string) {
  return useQuery({
    queryKey: ["pull-request-detail", prNumber, repo],
    queryFn: () => fetchPRDetail(prNumber!, repo),
    enabled: !!prNumber,
  });
}
