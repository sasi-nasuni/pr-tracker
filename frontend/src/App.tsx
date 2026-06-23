import { useState, useCallback, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TeamSelector } from "@/components/dashboard/TeamSelector";
import { BranchFilterTabs } from "@/components/dashboard/BranchFilterTabs";
import { RepoFilter } from "@/components/dashboard/RepoFilter";
import { PersonFilter } from "@/components/dashboard/PersonFilter";
import { KPIBar } from "@/components/dashboard/KPIBar";
import { FilterChips } from "@/components/dashboard/FilterChips";
import { PRTable } from "@/components/dashboard/PRTable";
import { Pagination } from "@/components/dashboard/Pagination";
import { PRDetailPanel } from "@/components/dashboard/PRDetailPanel";
import { usePullRequests } from "@/hooks/usePullRequests";
import { useTeams } from "@/hooks/useTeams";
import type { PRFilters, SortField, BranchFilter, PullRequest } from "@/types/pull-request";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

const DEFAULT_FILTERS: PRFilters = {
  branch_type: "all",
  repository: "all",
  team: "all",
  person: "all",
  sort_by: "age",
  sort_order: "desc",
};

function Dashboard() {
  const [filters, setFilters] = useState<PRFilters>(DEFAULT_FILTERS);
  const [selectedPR, setSelectedPR] = useState<{ number: number; repo: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isRefetching, dataUpdatedAt, refetch } = usePullRequests();
  const { data: teamsData } = useTeams();

  const handleTeamChange = useCallback((team: string) => {
    setFilters((prev) => ({ ...prev, team, person: "all" }));
    setCurrentPage(1);
  }, []);

  const handleTabChange = useCallback((tab: BranchFilter) => {
    setFilters((prev) => ({ ...prev, branch_type: tab }));
    setCurrentPage(1);
  }, []);

  const handleRepoChange = useCallback((repo: string) => {
    setFilters((prev) => ({ ...prev, repository: repo }));
    setCurrentPage(1);
  }, []);

  const handlePersonChange = useCallback((person: string) => {
    setFilters((prev) => ({ ...prev, person }));
    setCurrentPage(1);
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

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  const allPRs = useMemo(() => data?.pull_requests ?? [], [data]);

  // Team slugs from API
  const teamSlugs = useMemo(() => teamsData?.slugs ?? [], [teamsData]);

  // Team members lookup for person filter
  const teamMembersForFilter = useMemo(() => {
    if (!teamsData) return new Set<string>();
    if (filters.team === "all") {
      return new Set(
        Object.values(teamsData.teams).flatMap((members) => members.map((m) => m.username))
      );
    }
    return new Set(
      (teamsData.teams[filters.team] || []).map((m) => m.username)
    );
  }, [teamsData, filters.team]);

  // Client-side filtering pipeline
  const filteredPRs = useMemo(() => {
    let result: PullRequest[] = allPRs;

    // Filter by team (user belongs to team)
    if (filters.team !== "all" && teamMembersForFilter.size > 0) {
      result = result.filter((pr) => teamMembersForFilter.has(pr.author.username));
    }

    // Filter by repository
    if (filters.repository !== "all") {
      result = result.filter((pr) => pr.repository === filters.repository);
    }

    // Filter by person
    if (filters.person !== "all") {
      result = result.filter((pr) => pr.author.username === filters.person);
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
        const aName = a.author.display_name || a.author.username;
        const bName = b.author.display_name || b.author.username;
        cmp = aName.toLowerCase().localeCompare(bName.toLowerCase());
      } else if (filters.sort_by === "reviewers") {
        cmp = a.active_reviewers_count - b.active_reviewers_count;
      }
      return reverse ? -cmp : cmp;
    });

    return result;
  }, [allPRs, filters, teamMembersForFilter]);

  // Compute repo list from team-filtered dataset
  const repos = useMemo(() => {
    let base = allPRs;
    if (filters.team !== "all" && teamMembersForFilter.size > 0) {
      base = base.filter((pr) => teamMembersForFilter.has(pr.author.username));
    }
    const repoMap = new Map<string, number>();
    for (const pr of base) {
      repoMap.set(pr.repository, (repoMap.get(pr.repository) || 0) + 1);
    }
    return Array.from(repoMap, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allPRs, filters.team, teamMembersForFilter]);

  // Compute people list from team+repo filtered dataset
  const people = useMemo(() => {
    let base = allPRs;
    if (filters.team !== "all" && teamMembersForFilter.size > 0) {
      base = base.filter((pr) => teamMembersForFilter.has(pr.author.username));
    }
    if (filters.repository !== "all") {
      base = base.filter((pr) => pr.repository === filters.repository);
    }
    const personMap = new Map<string, { display_name: string; count: number }>();
    for (const pr of base) {
      const existing = personMap.get(pr.author.username);
      if (existing) {
        existing.count++;
      } else {
        personMap.set(pr.author.username, {
          display_name: pr.author.display_name || pr.author.username,
          count: 1,
        });
      }
    }
    return Array.from(personMap, ([username, data]) => ({
      username,
      display_name: data.display_name,
      count: data.count,
    })).sort((a, b) => b.count - a.count);
  }, [allPRs, filters.team, filters.repository, teamMembersForFilter]);

  // Branch tab counts (respect team + repo + person filters)
  const counts = useMemo(() => {
    let base = allPRs;
    if (filters.team !== "all" && teamMembersForFilter.size > 0) {
      base = base.filter((pr) => teamMembersForFilter.has(pr.author.username));
    }
    if (filters.repository !== "all") {
      base = base.filter((pr) => pr.repository === filters.repository);
    }
    if (filters.person !== "all") {
      base = base.filter((pr) => pr.author.username === filters.person);
    }
    return {
      all: base.length,
      main: base.filter((pr) => pr.branch_type === "main").length,
      feature: base.filter((pr) => pr.branch_type === "feature").length,
    };
  }, [allPRs, filters.team, filters.repository, filters.person, teamMembersForFilter]);

  // Pagination
  const paginatedPRs = useMemo(() => {
    if (pageSize >= 9999) return filteredPRs;
    const start = (currentPage - 1) * pageSize;
    return filteredPRs.slice(start, start + pageSize);
  }, [filteredPRs, currentPage, pageSize]);

  // Active filter chips
  const filterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (filters.team !== "all") {
      chips.push({
        label: `Team: ${filters.team}`,
        onRemove: () => { setFilters((prev) => ({ ...prev, team: "all", person: "all" })); setCurrentPage(1); },
      });
    }
    if (filters.repository !== "all") {
      chips.push({
        label: `Repo: ${filters.repository}`,
        onRemove: () => { setFilters((prev) => ({ ...prev, repository: "all" })); setCurrentPage(1); },
      });
    }
    if (filters.person !== "all") {
      const name = people.find((p) => p.username === filters.person)?.display_name || filters.person;
      chips.push({
        label: `Author: ${name}`,
        onRemove: () => { setFilters((prev) => ({ ...prev, person: "all" })); setCurrentPage(1); },
      });
    }
    if (filters.branch_type !== "all") {
      chips.push({
        label: `Branch: ${filters.branch_type}`,
        onRemove: () => { setFilters((prev) => ({ ...prev, branch_type: "all" })); setCurrentPage(1); },
      });
    }
    return chips;
  }, [filters, people]);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        isLoading={isRefetching}
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        onRefresh={() => refetch()}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-4">
        {/* Team selector */}
        {teamSlugs.length > 0 && (
          <TeamSelector
            slugs={teamSlugs}
            selected={filters.team}
            onChange={handleTeamChange}
          />
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <RepoFilter
            repos={repos}
            selected={filters.repository}
            onChange={handleRepoChange}
          />
          <PersonFilter
            people={people}
            selected={filters.person}
            onChange={handlePersonChange}
          />
          <BranchFilterTabs
            activeTab={filters.branch_type ?? "all"}
            counts={counts}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Filter chips */}
        <FilterChips chips={filterChips} onClearAll={handleClearFilters} />

        {/* KPI summary */}
        <KPIBar pullRequests={filteredPRs} />

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <PRTable
            pullRequests={paginatedPRs}
            isLoading={isLoading}
            sortBy={filters.sort_by ?? "age"}
            sortOrder={filters.sort_order ?? "desc"}
            onSort={handleSort}
            onRowClick={handleRowClick}
            selectedPR={selectedPR?.number ?? null}
          />

          {/* Pagination footer */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPRs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
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
