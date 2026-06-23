import { useCallback, useEffect, useState } from "react";
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

type ColumnKey =
  | "number"
  | "repo"
  | "title"
  | "author"
  | "branch"
  | "age"
  | "reviewers"
  | "codeOwner"
  | "teamApprovals"
  | "link";

const COLUMN_MIN_WIDTHS: Record<ColumnKey, number> = {
  number: 84,
  repo: 180,
  title: 380,
  author: 220,
  branch: 120,
  age: 120,
  reviewers: 120,
  codeOwner: 160,
  teamApprovals: 170,
  link: 80,
};

const COLUMN_DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  number: 84,
  repo: 180,
  title: 480,
  author: 240,
  branch: 130,
  age: 120,
  reviewers: 120,
  codeOwner: 180,
  teamApprovals: 190,
  link: 80,
};

const RESIZABLE_COLUMNS: ColumnKey[] = ["repo", "title", "author", "codeOwner", "teamApprovals"];

export function PRTable({
  pullRequests,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  selectedPR,
}: PRTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(COLUMN_DEFAULT_WIDTHS);
  const [resizing, setResizing] = useState<{
    column: ColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = useCallback(
    (column: ColumnKey, event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setResizing({
        column,
        startX: event.clientX,
        startWidth: columnWidths[column],
      });
    },
    [columnWidths]
  );

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - resizing.startX;
      setColumnWidths((prev) => ({
        ...prev,
        [resizing.column]: Math.max(
          COLUMN_MIN_WIDTHS[resizing.column],
          resizing.startWidth + deltaX
        ),
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing]);

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
      <table className="min-w-[1660px] text-sm">
        <colgroup>
          <col style={{ width: columnWidths.number, minWidth: COLUMN_MIN_WIDTHS.number }} />
          <col style={{ width: columnWidths.repo, minWidth: COLUMN_MIN_WIDTHS.repo }} />
          <col style={{ width: columnWidths.title, minWidth: COLUMN_MIN_WIDTHS.title }} />
          <col style={{ width: columnWidths.author, minWidth: COLUMN_MIN_WIDTHS.author }} />
          <col style={{ width: columnWidths.branch, minWidth: COLUMN_MIN_WIDTHS.branch }} />
          <col style={{ width: columnWidths.age, minWidth: COLUMN_MIN_WIDTHS.age }} />
          <col style={{ width: columnWidths.reviewers, minWidth: COLUMN_MIN_WIDTHS.reviewers }} />
          <col style={{ width: columnWidths.codeOwner, minWidth: COLUMN_MIN_WIDTHS.codeOwner }} />
          <col
            style={{
              width: columnWidths.teamApprovals,
              minWidth: COLUMN_MIN_WIDTHS.teamApprovals,
            }}
          />
          <col style={{ width: columnWidths.link, minWidth: COLUMN_MIN_WIDTHS.link }} />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="relative whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
              <div className="flex items-center justify-between gap-2">
                #
                <ResizeHandle
                  enabled={RESIZABLE_COLUMNS.includes("number")}
                  onMouseDown={(e) => startResize("number", e)}
                />
              </div>
            </th>
            <th className="relative whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
              <div className="flex items-center justify-between gap-2">
                Repo
                <ResizeHandle
                  enabled={RESIZABLE_COLUMNS.includes("repo")}
                  onMouseDown={(e) => startResize("repo", e)}
                />
              </div>
            </th>
            <th className="relative whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
              <div className="flex items-center justify-between gap-2">
                Title
                <ResizeHandle
                  enabled={RESIZABLE_COLUMNS.includes("title")}
                  onMouseDown={(e) => startResize("title", e)}
                />
              </div>
            </th>
            <SortableHeader
              label="Author"
              column="author"
              field="author"
              currentSort={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              onResizeStart={startResize}
            />
            <th className="relative whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
              <div className="flex items-center justify-between gap-2">
                Branch
                <ResizeHandle
                  enabled={RESIZABLE_COLUMNS.includes("branch")}
                  onMouseDown={(e) => startResize("branch", e)}
                />
              </div>
            </th>
            <SortableHeader
              label="Age"
              column="age"
              field="age"
              currentSort={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              onResizeStart={startResize}
            />
            <SortableHeader
              label="Reviewers"
              column="reviewers"
              field="reviewers"
              currentSort={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              onResizeStart={startResize}
            />
            <th className="relative whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
              <div className="flex items-center justify-between gap-2">
                Code Owner
                <ResizeHandle
                  enabled={RESIZABLE_COLUMNS.includes("codeOwner")}
                  onMouseDown={(e) => startResize("codeOwner", e)}
                />
              </div>
            </th>
            <th className="relative whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
              <div className="flex items-center justify-between gap-2">
                Team Approvals
                <ResizeHandle
                  enabled={RESIZABLE_COLUMNS.includes("teamApprovals")}
                  onMouseDown={(e) => startResize("teamApprovals", e)}
                />
              </div>
            </th>
            <th className="relative whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
              <div className="flex items-center justify-between gap-2">
                Link
                <ResizeHandle
                  enabled={RESIZABLE_COLUMNS.includes("link")}
                  onMouseDown={(e) => startResize("link", e)}
                />
              </div>
            </th>
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
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                #{pr.number}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                {pr.repository}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">
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
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <img
                    src={pr.author.avatar_url}
                    alt={pr.author.username}
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="truncate text-gray-700" title={pr.author.display_name || pr.author.username}>
                    {pr.author.display_name || pr.author.username}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <BranchTypeBadge branchType={pr.branch_type} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <AgeBadge age={pr.age} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center text-gray-700">
                {pr.active_reviewers_count}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <CodeOwnerBadge status={pr.code_owner_status} branchType={pr.branch_type} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <TeamApprovalsBadge teamApprovals={pr.team_approvals} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
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
  column: ColumnKey;
  field: SortField;
  currentSort: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onResizeStart: (column: ColumnKey, event: React.MouseEvent<HTMLSpanElement>) => void;
}

function SortableHeader({
  label,
  column,
  field,
  currentSort,
  sortOrder,
  onSort,
  onResizeStart,
}: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <th
      className="relative cursor-pointer whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600 hover:text-gray-900"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-between gap-2">
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
        <ResizeHandle
          enabled={RESIZABLE_COLUMNS.includes(column)}
          onMouseDown={(event) => onResizeStart(column, event)}
        />
      </div>
    </th>
  );
}

interface ResizeHandleProps {
  enabled: boolean;
  onMouseDown: (event: React.MouseEvent<HTMLSpanElement>) => void;
}

function ResizeHandle({ enabled, onMouseDown }: ResizeHandleProps) {
  if (!enabled) {
    return null;
  }

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      className="-mr-2 h-5 w-2 cursor-col-resize rounded-sm bg-transparent transition-colors hover:bg-slate-300"
      onMouseDown={onMouseDown}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
