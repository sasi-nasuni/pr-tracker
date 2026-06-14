import { useState, useCallback, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BranchFilterTabs } from "@/components/dashboard/BranchFilterTabs";
import { RepoFilter } from "@/components/dashboard/RepoFilter";
import { PRTable } from "@/components/dashboard/PRTable";
import { PRDetailPanel } from "@/components/dashboard/PRDetailPanel";
import { usePullRequests } from "@/hooks/usePullRequests";
import type { PRFilters, SortField, BranchFilter, PullRequest } from "@/types/pull-request";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

function Dashboard() {
  const [filters, setFilters] = useState<PRFilters>({
    branch_type: "all",
    repository: "all",
    sort_by: "age",
    sort_order: "desc",
  });
  const [selectedPR, setSelectedPR] = useState<{ number: number; repo: string } | null>(null);

  const { data, isLoading, isRefetching, dataUpdatedAt, refetch } = usePullRequests();

  const handleTabChange = useCallback((tab: BranchFilter) => {
    setFilters((prev) => ({ ...prev, branch_type: tab }));
  }, []);

  const handleRepoChange = useCallback((repo: string) => {
    setFilters((prev) => ({ ...prev, repository: repo }));
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setFilters((prev) => {
      if (prev.sort_by === field) {
        return { ...prev, sort_order: prev.sort_order === "asc" ? "desc" : "asc" };
      }
      return { ...prev, sort_by: field, sort_order: "desc" };
    });
  }, []);

  const handleRowClick = useCallback((prNumber: number, repo: string) => {
    setSelectedPR({ number: prNumber, repo });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedPR(null);
  }, []);

  const allPRs = useMemo(() => data?.pull_requests ?? [], [data]);

  // Compute repo list from full dataset
  const repos = useMemo(() => {
    const repoMap = new Map<string, number>();
    for (const pr of allPRs) {
      repoMap.set(pr.repository, (repoMap.get(pr.repository) || 0) + 1);
    }
    return Array.from(repoMap, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allPRs]);

  // Client-side filtering
  const filteredPRs = useMemo(() => {
    let result: PullRequest[] = allPRs;

    // Filter by repository
    if (filters.repository !== "all") {
      result = result.filter((pr) => pr.repository === filters.repository);
    }

    // Filter by branch type
    if (filters.branch_type !== "all") {
      result = result.filter((pr) => pr.branch_type === filters.branch_type);
    }

    // Sort
    const reverse = filters.sort_order === "desc";
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (filters.sort_by === "age") {
        cmp = (a.age.days * 24 + a.age.hours) - (b.age.days * 24 + b.age.hours);
      } else if (filters.sort_by === "author") {
        cmp = a.author.username.toLowerCase().localeCompare(b.author.username.toLowerCase());
      } else if (filters.sort_by === "reviewers") {
        cmp = a.active_reviewers_count - b.active_reviewers_count;
      }
      return reverse ? -cmp : cmp;
    });

    return result;
  }, [allPRs, filters]);

  // Counts reflect repo filter
  const counts = useMemo(() => {
    const repoFiltered = filters.repository === "all"
      ? allPRs
      : allPRs.filter((pr) => pr.repository === filters.repository);
    return {
      all: repoFiltered.length,
      main: repoFiltered.filter((pr) => pr.branch_type === "main").length,
      feature: repoFiltered.filter((pr) => pr.branch_type === "feature").length,
    };
  }, [allPRs, filters.repository]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardHeader
          isLoading={isRefetching}
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          onRefresh={() => refetch()}
        />

        <div className="mb-4 flex items-center gap-4">
          <RepoFilter
            repos={repos}
            selected={filters.repository}
            onChange={handleRepoChange}
          />
          <BranchFilterTabs
            activeTab={filters.branch_type ?? "all"}
            counts={counts}
            onTabChange={handleTabChange}
          />
        </div>

        <PRTable
          pullRequests={filteredPRs}
          isLoading={isLoading}
          sortBy={filters.sort_by ?? "age"}
          sortOrder={filters.sort_order ?? "desc"}
          onSort={handleSort}
          onRowClick={handleRowClick}
          selectedPR={selectedPR?.number ?? null}
        />
      </div>

      <PRDetailPanel
        prNumber={selectedPR?.number ?? null}
        repo={selectedPR?.repo}
        onClose={handleClosePanel}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
