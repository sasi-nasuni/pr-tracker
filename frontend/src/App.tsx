import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BranchFilterTabs } from "@/components/dashboard/BranchFilterTabs";
import { PRTable } from "@/components/dashboard/PRTable";
import { PRDetailPanel } from "@/components/dashboard/PRDetailPanel";
import { usePullRequests } from "@/hooks/usePullRequests";
import type { PRFilters, SortField, BranchFilter } from "@/types/pull-request";

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
    sort_by: "age",
    sort_order: "desc",
  });
  const [selectedPR, setSelectedPR] = useState<number | null>(null);

  const { data, isLoading, isRefetching, dataUpdatedAt, refetch } = usePullRequests(filters);

  const handleTabChange = useCallback((tab: BranchFilter) => {
    setFilters((prev) => ({ ...prev, branch_type: tab }));
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setFilters((prev) => {
      if (prev.sort_by === field) {
        return { ...prev, sort_order: prev.sort_order === "asc" ? "desc" : "asc" };
      }
      return { ...prev, sort_by: field, sort_order: "desc" };
    });
  }, []);

  const handleRowClick = useCallback((prNumber: number) => {
    setSelectedPR(prNumber);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedPR(null);
  }, []);

  const pullRequests = data?.pull_requests ?? [];
  const counts = {
    all: data?.total_count ?? 0,
    main: pullRequests.filter((pr) => pr.branch_type === "main").length,
    feature: pullRequests.filter((pr) => pr.branch_type === "feature").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardHeader
          isLoading={isRefetching}
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          onRefresh={() => refetch()}
        />

        <BranchFilterTabs
          activeTab={filters.branch_type ?? "all"}
          counts={counts}
          onTabChange={handleTabChange}
        />

        <PRTable
          pullRequests={pullRequests}
          isLoading={isLoading}
          sortBy={filters.sort_by ?? "age"}
          sortOrder={filters.sort_order ?? "desc"}
          onSort={handleSort}
          onRowClick={handleRowClick}
          selectedPR={selectedPR}
        />
      </div>

      <PRDetailPanel prNumber={selectedPR} onClose={handleClosePanel} />
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
