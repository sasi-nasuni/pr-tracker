import { useQuery } from "@tanstack/react-query";
import { fetchTeams } from "@/api/client";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
