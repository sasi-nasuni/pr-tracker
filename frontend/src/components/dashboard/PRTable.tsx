import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import type { PullRequest, SortField, SortOrder } from "@/types/pull-request";
import { AgeBadge } from "./AgeBadge";
import { BranchTypeBadge } from "./BranchTypeBadge";
import { CodeOwnerBadge } from "./CodeOwnerBadge";
import { TeamApprovalsBadge } from "./TeamApprovalsBadge";
import { TableSkeleton } from "./TableSkeleton";

interface PRTableProps {
  pullRequests: PullRequest[];
  isLoading: boolean;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onRowClick: (prNumber: number, repo: string) => void;
  selectedPR: number | null;
}

export function PRTable({
  pullRequests,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  selectedPR,
}: PRTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (pullRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-gray-500">No open PRs found for your team 🎉</p>
        <p className="mt-1 text-sm text-gray-400">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Repo</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
            <SortableHeader
              label="Author"
              field="author"
              currentSort={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <th className="px-4 py-3 text-left font-medium text-gray-600">Branch</th>
            <SortableHeader
              label="Age"
              field="age"
              currentSort={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              label="Reviewers"
              field="reviewers"
              currentSort={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <th className="px-4 py-3 text-left font-medium text-gray-600">Code Owner</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Team Approvals</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Link</th>
          </tr>
        </thead>
        <tbody>
          {pullRequests.map((pr) => (
            <tr
              key={`${pr.repository}-${pr.number}`}
              onClick={() => onRowClick(pr.number, pr.repository)}
              className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                selectedPR === pr.number ? "bg-purple-50" : ""
              }`}
            >
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                #{pr.number}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                {pr.repository}
              </td>
              <td className="max-w-xs px-4 py-3 font-medium text-gray-900">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{pr.title}</span>
                  {pr.unresolved_comment_count > 0 && (
                    <span
                      className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-medium ${
                        pr.unresolved_comment_count >= 5
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      💬 {pr.unresolved_comment_count}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <img
                    src={pr.author.avatar_url}
                    alt={pr.author.username}
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="text-gray-700">{pr.author.username}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <BranchTypeBadge branchType={pr.branch_type} />
              </td>
              <td className="px-4 py-3">
                <AgeBadge age={pr.age} />
              </td>
              <td className="px-4 py-3 text-center text-gray-700">
                {pr.active_reviewers_count}
              </td>
              <td className="px-4 py-3">
                <CodeOwnerBadge status={pr.code_owner_status} branchType={pr.branch_type} />
              </td>
              <td className="px-4 py-3">
                <TeamApprovalsBadge teamApprovals={pr.team_approvals} />
              </td>
              <td className="px-4 py-3">
                <a
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 hover:text-purple-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentSort: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

function SortableHeader({ label, field, currentSort, sortOrder, onSort }: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <th
      className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600 hover:text-gray-900"
      onClick={() => onSort(field)}
    >
      <div className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          sortOrder === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    </th>
  );
}
