from pydantic import BaseModel
from typing import Optional


class Author(BaseModel):
    username: str
    avatar_url: str
    display_name: Optional[str] = None


class AgeInfo(BaseModel):
    days: int
    hours: int
    display: str
    is_stale: bool
    threshold_days: int


class CodeOwnerStatus(BaseModel):
    required: bool
    approved: bool


class CodeOwnerDetail(BaseModel):
    required: bool
    approved: bool
    owners: list["CodeOwnerEntry"]


class CodeOwnerEntry(BaseModel):
    username: str
    has_approved: bool


class ReviewerInfo(BaseModel):
    username: str
    avatar_url: str
    state: str  # "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED"


class TeamApprovalEntry(BaseModel):
    username: str
    has_approved: bool


class TeamApprovals(BaseModel):
    required: int
    current: int
    approvers: list[TeamApprovalEntry]


class UnresolvedThread(BaseModel):
    id: str
    author: str
    body: str
    path: Optional[str] = None
    line: Optional[int] = None
    url: str


class FilesChanged(BaseModel):
    total: int
    additions: int
    deletions: int


class PullRequestSummary(BaseModel):
    """Summary model for the PR list endpoint."""

    number: int
    repository: str
    title: str
    author: Author
    base_branch: str
    head_branch: str
    branch_type: str  # "main" | "feature"
    created_at: str
    age: AgeInfo
    active_reviewers_count: int
    code_owner_status: Optional[CodeOwnerStatus] = None
    team_approvals: Optional[TeamApprovals] = None
    unresolved_comment_count: int = 0
    html_url: str
    labels: list[str]


class PullRequestDetail(BaseModel):
    """Detailed model for the single PR endpoint."""

    number: int
    repository: str
    title: str
    body: str
    author: Author
    base_branch: str
    head_branch: str
    branch_type: str
    created_at: str
    age: AgeInfo
    active_reviewers: list[ReviewerInfo]
    active_reviewers_count: int
    code_owner_status: Optional[CodeOwnerDetail] = None
    team_approvals: Optional[TeamApprovals] = None
    unresolved_comment_count: int = 0
    unresolved_threads: list[UnresolvedThread] = []
    files_changed: FilesChanged
    labels: list[str]
    html_url: str


class PRListResponse(BaseModel):
    """Response model for the PR list endpoint."""

    total_count: int
    filters_applied: dict
    pull_requests: list[PullRequestSummary]
