import { useQuery } from "@tanstack/react-query";
import { fetchPRDetail } from "@/api/client";

export function usePRDetail(prNumber: number | null) {
  return useQuery({
    queryKey: ["pull-request-detail", prNumber],
    queryFn: () => fetchPRDetail(prNumber!),
    enabled: !!prNumber,
  });
}
