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
)
from app.services.codeowners import get_code_owners_for_files
from app.services.github_client import github_client
from app.services.team_service import get_team_usernames
from app.utils.time_helpers import calculate_age, check_staleness, classify_branch

logger = logging.getLogger(__name__)


async def get_team_pull_requests(
    branch_type: str = "all",
    sort_by: str = "age",
    sort_order: str = "desc",
) -> PRListResponse:
    """Fetch, filter, enrich, and sort team PRs.

    Args:
        branch_type: Filter by 'all', 'main', or 'feature'.
        sort_by: Sort field ('age', 'author', 'reviewers').
        sort_order: Sort direction ('asc' or 'desc').

    Returns:
        PRListResponse with filtered/sorted pull requests.
    """
    # Fetch team members and PRs concurrently
    team_usernames, all_prs = await asyncio.gather(
        get_team_usernames(),
        github_client.get_open_pull_requests(),
    )

    # Filter out draft PRs
    all_prs = [pr for pr in all_prs if not pr.get("draft", False)]

    # Filter by team members
    team_prs = [pr for pr in all_prs if pr["user"]["login"] in team_usernames]

    # Filter by branch type
    if branch_type != "all":
        team_prs = [
            pr for pr in team_prs
            if classify_branch(pr["base"]["ref"]) == branch_type
        ]

    # Enrich PRs concurrently
    enriched_prs = await asyncio.gather(
        *[_enrich_pr_summary(pr) for pr in team_prs]
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


async def get_pull_request_detail(pr_number: int) -> PullRequestDetail:
    """Fetch detailed information for a single PR.

    Args:
        pr_number: The PR number to fetch details for.

    Returns:
        PullRequestDetail with full enrichment.
    """
    # Fetch all data concurrently
    reviews, comments, files, codeowners_content = await asyncio.gather(
        github_client.get_pr_reviews(pr_number),
        github_client.get_pr_comments(pr_number),
        github_client.get_pr_files(pr_number),
        github_client.get_codeowners(),
    )

    # We need the PR data itself - find it from the open PRs list
    all_prs = await github_client.get_open_pull_requests()
    pr_data = next((pr for pr in all_prs if pr["number"] == pr_number), None)

    if pr_data is None:
        raise ValueError(f"PR #{pr_number} not found or not open")

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
    if codeowners_content and branch_type == "main":
        file_paths = [f["filename"] for f in files]
        code_owner_status = await _get_code_owner_detail(
            codeowners_content, file_paths, reviews
        )

    # Calculate files changed stats
    files_changed = FilesChanged(
        total=len(files),
        additions=sum(f.get("additions", 0) for f in files),
        deletions=sum(f.get("deletions", 0) for f in files),
    )

    return PullRequestDetail(
        number=pr_data["number"],
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
        files_changed=files_changed,
        labels=[label["name"] for label in pr_data.get("labels", [])],
        html_url=pr_data["html_url"],
    )


async def _enrich_pr_summary(pr_data: dict[str, Any]) -> PullRequestSummary:
    """Enrich a raw GitHub PR with age, reviewer count, and code owner status."""
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

    # Fetch reviews and comments for active reviewer count
    reviews, comments = await asyncio.gather(
        github_client.get_pr_reviews(pr_data["number"]),
        github_client.get_pr_comments(pr_data["number"]),
    )

    active_reviewers = _get_active_reviewers(reviews, comments, pr_data["user"]["login"])

    # Determine code owner status (summary level — just approved/pending)
    code_owner_status: Optional[CodeOwnerStatus] = None
    if branch_type == "main":
        codeowners_content = await github_client.get_codeowners()
        if codeowners_content:
            files = await github_client.get_pr_files(pr_data["number"])
            file_paths = [f["filename"] for f in files]
            detail = await _get_code_owner_detail(codeowners_content, file_paths, reviews)
            if detail:
                code_owner_status = CodeOwnerStatus(
                    required=detail.required,
                    approved=detail.approved,
                )

    return PullRequestSummary(
        number=pr_data["number"],
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
        html_url=pr_data["html_url"],
        labels=[label["name"] for label in pr_data.get("labels", [])],
    )


def _get_active_reviewers(
    reviews: list[dict], comments: list[dict], pr_author: str
) -> list[ReviewerInfo]:
    """Extract unique active reviewers from reviews and comments.

    Active = has reviewed (APPROVED/CHANGES_REQUESTED) or commented (excluding author).
    For users with multiple reviews, use their latest review state.
    """
    reviewer_map: dict[str, ReviewerInfo] = {}

    # Process reviews — latest review per user wins
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

    # Process review comments — add users not already tracked
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
    """Determine code owner approval status for a PR.

    Args:
        codeowners_content: Raw CODEOWNERS file content.
        file_paths: List of files changed in the PR.
        reviews: List of review data from GitHub.

    Returns:
        CodeOwnerDetail or None if no owners match.
    """
    owners = get_code_owners_for_files(codeowners_content, file_paths)
    if not owners:
        return None

    # Get set of users who approved
    approved_users = {
        review["user"]["login"]
        for review in reviews
        if review["state"] == "APPROVED"
    }

    # Build owner entries
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
