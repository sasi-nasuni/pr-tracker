import asyncio
import logging
from typing import Any, Optional

from app.config import settings
from app.models.pr import (
    AgeInfo,
    Author,
    CodeOwnerDetail,
    CodeOwnerEntry,
    CodeOwnerStatus,
    FilesChanged,
    PRListResponse,
    PullRequestDetail,
    PullRequestSummary,
    ReviewerInfo,
    TeamApprovalEntry,
    TeamApprovals,
    UnresolvedThread,
)
from app.services.codeowners import get_code_owners_for_files
from app.services.github_client import github_client
from app.services.team_service import get_team_usernames
from app.utils.time_helpers import calculate_age, check_staleness, classify_branch

logger = logging.getLogger(__name__)


def _extract_repo_info(pr_data: dict[str, Any]) -> tuple[str, str]:
    """Extract owner and repo name from a PR data dict."""
    repo_url = pr_data.get("base", {}).get("repo", {}).get("full_name", "")
    if "/" in repo_url:
        owner, repo = repo_url.split("/", 1)
        return owner, repo
    return settings.github_org, settings.github_repo or ""


async def get_team_pull_requests(
    branch_type: str = "all",
    sort_by: str = "age",
    sort_order: str = "desc",
) -> PRListResponse:
    """Fetch, filter, enrich, and sort team PRs.

    Supports both single-repo mode (GITHUB_REPO set) and
    multi-repo mode (GITHUB_REPO unset — discovers via Search API).
    """
    team_usernames = await get_team_usernames()

    if settings.github_repo:
        # Single-repo mode (legacy)
        all_prs = await github_client.get_open_pull_requests()
        team_prs = [pr for pr in all_prs if pr["user"]["login"] in team_usernames]
    else:
        # Multi-repo mode — use Search API
        search_results = await github_client.search_team_pull_requests(list(team_usernames))
        # Fetch full PR data for each search result (search doesn't include branch info)
        team_prs = await _fetch_full_pr_data(search_results)

    # Filter out draft PRs
    team_prs = [pr for pr in team_prs if not pr.get("draft", False)]

    # Filter by branch type
    if branch_type != "all":
        team_prs = [
            pr for pr in team_prs
            if classify_branch(pr["base"]["ref"]) == branch_type
        ]

    # Enrich PRs concurrently
    enriched_prs = await asyncio.gather(
        *[_enrich_pr_summary(pr, team_usernames) for pr in team_prs]
    )

    # Sort
    enriched_prs = _sort_prs(list(enriched_prs), sort_by, sort_order)

    return PRListResponse(
        total_count=len(enriched_prs),
        filters_applied={
            "branch_type": branch_type,
            "sort_by": sort_by,
            "sort_order": sort_order,
        },
        pull_requests=enriched_prs,
    )


async def _fetch_full_pr_data(search_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fetch full PR data from REST API for each search result."""
    async def fetch_one(item: dict[str, Any]) -> dict[str, Any] | None:
        try:
            repo_url = item.get("repository_url", "")
            # repository_url: "https://api.github.com/repos/nasuni/portal"
            parts = repo_url.rstrip("/").split("/repos/")
            if len(parts) < 2:
                return None
            owner_repo = parts[-1]  # "nasuni/portal"
            owner, repo = owner_repo.split("/", 1)
            pr_number = item["number"]
            return await github_client.get_pull_request(owner, repo, pr_number)
        except Exception as e:
            logger.warning(f"Failed to fetch PR data: {e}")
            return None

    results = await asyncio.gather(*[fetch_one(item) for item in search_results])
    return [r for r in results if r is not None]


async def get_pull_request_detail(pr_number: int, repo: str | None = None) -> PullRequestDetail:
    """Fetch detailed information for a single PR.

    Args:
        pr_number: The PR number to fetch details for.
        repo: The repository name (e.g., "portal"). Required in multi-repo mode.
    """
    # Determine owner/repo
    owner = settings.github_org
    repo_name = repo or settings.github_repo
    if not repo_name:
        raise ValueError("Repository name is required in multi-repo mode")

    # Fetch all data concurrently
    reviews, comments, files, codeowners_content, threads_data, team_usernames = await asyncio.gather(
        github_client.get_pr_reviews(owner, repo_name, pr_number),
        github_client.get_pr_comments(owner, repo_name, pr_number),
        github_client.get_pr_files(owner, repo_name, pr_number),
        github_client.get_codeowners(owner, repo_name),
        github_client.get_review_threads(owner, repo_name, pr_number),
        get_team_usernames(),
    )

    # Fetch the PR data itself
    pr_data = await github_client.get_pull_request(owner, repo_name, pr_number)

    # Classify branch
    base_branch = pr_data["base"]["ref"]
    branch_type = classify_branch(base_branch)

    # Calculate age
    age_data = calculate_age(pr_data["created_at"])
    is_stale, threshold = check_staleness(
        age_data["days"],
        branch_type,
        settings.aging_threshold_main,
        settings.aging_threshold_feature,
    )

    # Get active reviewers
    active_reviewers = _get_active_reviewers(reviews, comments, pr_data["user"]["login"])

    # Get code owner status
    code_owner_status = None
    code_owners: list[str] | None = None
    if codeowners_content and branch_type == "main":
        file_paths = [f["filename"] for f in files]
        code_owner_status = await _get_code_owner_detail(
            codeowners_content, file_paths, reviews
        )
        if code_owner_status:
            code_owners = [e.username for e in code_owner_status.owners]

    # Compute team approvals
    team_approvals = _compute_team_approvals(
        reviews, team_usernames, pr_data["user"]["login"], code_owners
    )

    # Compute unresolved threads
    unresolved_count, unresolved_threads = _extract_unresolved_threads(threads_data)

    # Calculate files changed stats
    files_changed = FilesChanged(
        total=len(files),
        additions=sum(f.get("additions", 0) for f in files),
        deletions=sum(f.get("deletions", 0) for f in files),
    )

    return PullRequestDetail(
        number=pr_data["number"],
        repository=repo_name,
        title=pr_data["title"],
        body=pr_data.get("body") or "",
        author=Author(
            username=pr_data["user"]["login"],
            avatar_url=pr_data["user"]["avatar_url"],
        ),
        base_branch=base_branch,
        head_branch=pr_data["head"]["ref"],
        branch_type=branch_type,
        created_at=pr_data["created_at"],
        age=AgeInfo(
            days=age_data["days"],
            hours=age_data["hours"],
            display=age_data["display"],
            is_stale=is_stale,
            threshold_days=threshold,
        ),
        active_reviewers=active_reviewers,
        active_reviewers_count=len(active_reviewers),
        code_owner_status=code_owner_status,
        team_approvals=team_approvals,
        unresolved_comment_count=unresolved_count,
        unresolved_threads=unresolved_threads,
        files_changed=files_changed,
        labels=[label["name"] for label in pr_data.get("labels", [])],
        html_url=pr_data["html_url"],
    )


async def _enrich_pr_summary(pr_data: dict[str, Any], team_usernames: set[str]) -> PullRequestSummary:
    """Enrich a raw GitHub PR with age, reviewer count, code owner status, team approvals, and unresolved count."""
    owner, repo = _extract_repo_info(pr_data)
    base_branch = pr_data["base"]["ref"]
    branch_type = classify_branch(base_branch)

    # Calculate age
    age_data = calculate_age(pr_data["created_at"])
    is_stale, threshold = check_staleness(
        age_data["days"],
        branch_type,
        settings.aging_threshold_main,
        settings.aging_threshold_feature,
    )

    # Fetch reviews, comments, and review threads concurrently
    reviews, comments, threads_data = await asyncio.gather(
        github_client.get_pr_reviews(owner, repo, pr_data["number"]),
        github_client.get_pr_comments(owner, repo, pr_data["number"]),
        github_client.get_review_threads(owner, repo, pr_data["number"]),
    )

    active_reviewers = _get_active_reviewers(reviews, comments, pr_data["user"]["login"])

    # Determine code owner status (summary level — just approved/pending)
    code_owner_status: Optional[CodeOwnerStatus] = None
    code_owners: list[str] | None = None
    if branch_type == "main":
        codeowners_content = await github_client.get_codeowners(owner, repo)
        if codeowners_content:
            files = await github_client.get_pr_files(owner, repo, pr_data["number"])
            file_paths = [f["filename"] for f in files]
            detail = await _get_code_owner_detail(codeowners_content, file_paths, reviews)
            if detail:
                code_owner_status = CodeOwnerStatus(
                    required=detail.required,
                    approved=detail.approved,
                )
                code_owners = [e.username for e in detail.owners]

    # Compute team approvals
    team_approvals = _compute_team_approvals(
        reviews, team_usernames, pr_data["user"]["login"], code_owners
    )

    # Compute unresolved comment count
    unresolved_count, _ = _extract_unresolved_threads(threads_data)

    return PullRequestSummary(
        number=pr_data["number"],
        repository=repo,
        title=pr_data["title"],
        author=Author(
            username=pr_data["user"]["login"],
            avatar_url=pr_data["user"]["avatar_url"],
        ),
        base_branch=base_branch,
        head_branch=pr_data["head"]["ref"],
        branch_type=branch_type,
        created_at=pr_data["created_at"],
        age=AgeInfo(
            days=age_data["days"],
            hours=age_data["hours"],
            display=age_data["display"],
            is_stale=is_stale,
            threshold_days=threshold,
        ),
        active_reviewers_count=len(active_reviewers),
        code_owner_status=code_owner_status,
        team_approvals=team_approvals,
        unresolved_comment_count=unresolved_count,
        html_url=pr_data["html_url"],
        labels=[label["name"] for label in pr_data.get("labels", [])],
    )


def _get_active_reviewers(
    reviews: list[dict], comments: list[dict], pr_author: str
) -> list[ReviewerInfo]:
    """Extract unique active reviewers from reviews and comments."""
    reviewer_map: dict[str, ReviewerInfo] = {}

    for review in reviews:
        user = review["user"]["login"]
        state = review["state"]
        if user == pr_author:
            continue
        if state in ("APPROVED", "CHANGES_REQUESTED", "COMMENTED"):
            reviewer_map[user] = ReviewerInfo(
                username=user,
                avatar_url=review["user"]["avatar_url"],
                state=state,
            )

    for comment in comments:
        user = comment["user"]["login"]
        if user == pr_author:
            continue
        if user not in reviewer_map:
            reviewer_map[user] = ReviewerInfo(
                username=user,
                avatar_url=comment["user"]["avatar_url"],
                state="COMMENTED",
            )

    return list(reviewer_map.values())


async def _get_code_owner_detail(
    codeowners_content: str,
    file_paths: list[str],
    reviews: list[dict],
) -> Optional[CodeOwnerDetail]:
    """Determine code owner approval status for a PR."""
    owners = get_code_owners_for_files(codeowners_content, file_paths)
    if not owners:
        return None

    approved_users = {
        review["user"]["login"]
        for review in reviews
        if review["state"] == "APPROVED"
    }

    owner_entries = []
    all_approved = True
    for owner in owners:
        has_approved = owner in approved_users
        if not has_approved:
            all_approved = False
        owner_entries.append(CodeOwnerEntry(username=owner, has_approved=has_approved))

    return CodeOwnerDetail(
        required=True,
        approved=all_approved,
        owners=owner_entries,
    )


def _sort_prs(
    prs: list[PullRequestSummary], sort_by: str, sort_order: str
) -> list[PullRequestSummary]:
    """Sort PRs by the specified field and order."""
    reverse = sort_order == "desc"

    if sort_by == "age":
        prs.sort(key=lambda p: (p.age.days * 24 + p.age.hours), reverse=reverse)
    elif sort_by == "author":
        prs.sort(key=lambda p: p.author.username.lower(), reverse=reverse)
    elif sort_by == "reviewers":
        prs.sort(key=lambda p: p.active_reviewers_count, reverse=reverse)

    return prs


def _compute_team_approvals(
    reviews: list[dict],
    team_usernames: set[str],
    pr_author: str,
    code_owners: list[str] | None = None,
) -> TeamApprovals:
    """Compute team approval status for a PR."""
    excluded = {pr_author}
    if code_owners:
        excluded.update(code_owners)

    eligible = team_usernames - excluded

    latest_review: dict[str, str] = {}
    for review in reviews:
        user = review["user"]["login"]
        if user in eligible:
            latest_review[user] = review["state"]

    entries = []
    approved_count = 0
    for username in sorted(eligible):
        has_approved = latest_review.get(username) == "APPROVED"
        if has_approved:
            approved_count += 1
        entries.append(TeamApprovalEntry(username=username, has_approved=has_approved))

    return TeamApprovals(
        required=settings.required_team_approvals,
        current=approved_count,
        approvers=entries,
    )


def _extract_unresolved_threads(
    threads_data: list[dict],
) -> tuple[int, list[UnresolvedThread]]:
    """Extract unresolved threads from GraphQL response."""
    unresolved: list[UnresolvedThread] = []

    for thread in threads_data:
        if thread.get("isResolved"):
            continue

        comments = thread.get("comments", {}).get("nodes", [])
        if not comments:
            continue

        first_comment = comments[0]
        author = first_comment.get("author", {}).get("login", "unknown")
        body = first_comment.get("body", "")
        path = first_comment.get("path")
        line = first_comment.get("line")
        url = first_comment.get("url", "")

        unresolved.append(
            UnresolvedThread(
                id=thread.get("id", ""),
                author=author,
                body=body[:200] if body else "",
                path=path,
                line=line,
                url=url,
            )
        )

    return len(unresolved), unresolved
