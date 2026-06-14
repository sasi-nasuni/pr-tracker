export interface Author {
  username: string;
  avatar_url: string;
}

export interface AgeInfo {
  days: number;
  hours: number;
  display: string;
  is_stale: boolean;
  threshold_days: number;
}

export interface CodeOwnerStatus {
  required: boolean;
  approved: boolean;
}

export interface CodeOwnerDetail {
  required: boolean;
  approved: boolean;
  owners: CodeOwnerEntry[];
}

export interface CodeOwnerEntry {
  username: string;
  has_approved: boolean;
}

export interface ReviewerInfo {
  username: string;
  avatar_url: string;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
}

export interface TeamApprovalEntry {
  username: string;
  has_approved: boolean;
}

export interface TeamApprovals {
  required: number;
  current: number;
  approvers: TeamApprovalEntry[];
}

export interface UnresolvedThread {
  id: string;
  author: string;
  body: string;
  path: string | null;
  line: number | null;
  url: string;
}

export interface FilesChanged {
  total: number;
  additions: number;
  deletions: number;
}

export interface PullRequest {
  number: number;
  repository: string;
  title: string;
  author: Author;
  base_branch: string;
  head_branch: string;
  branch_type: "main" | "feature";
  created_at: string;
  age: AgeInfo;
  active_reviewers_count: number;
  code_owner_status: CodeOwnerStatus | null;
  team_approvals: TeamApprovals | null;
  unresolved_comment_count: number;
  html_url: string;
  labels: string[];
}

export interface PullRequestDetail extends Omit<PullRequest, "code_owner_status"> {
  body: string;
  active_reviewers: ReviewerInfo[];
  code_owner_status: CodeOwnerDetail | null;
  team_approvals: TeamApprovals | null;
  unresolved_comment_count: number;
  unresolved_threads: UnresolvedThread[];
  files_changed: FilesChanged;
}

export interface PRListResponse {
  total_count: number;
  filters_applied: {
    branch_type: string;
    sort_by: string;
    sort_order: string;
  };
  pull_requests: PullRequest[];
}

export type BranchFilter = "all" | "main" | "feature";
export type SortField = "age" | "author" | "reviewers";
export type SortOrder = "asc" | "desc";

export interface PRFilters {
  branch_type: BranchFilter;
  repository: string;
  sort_by: SortField;
  sort_order: SortOrder;
}
