from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.config import settings
from app.models.pr import PRListResponse, PullRequestDetail
from app.services.pr_service import get_team_pull_requests, get_pull_request_detail
from app.services.team_service import get_all_team_members, resolve_display_names

router = APIRouter(prefix="/api/v1", tags=["Pull Requests"])


@router.get("/teams")
async def list_teams():
    """Return configured team slugs and their members with display names."""
    team_map = await get_all_team_members()
    excluded = set(settings.excluded_members_list)

    # Collect all unique usernames across teams
    all_usernames = list({
        m.username for members in team_map.values() for m in members
        if m.username not in excluded
    })

    # Resolve display names
    display_names = await resolve_display_names(all_usernames)

    result = {}
    for slug, members in team_map.items():
        result[slug] = [
            {
                "username": m.username,
                "avatar_url": m.avatar_url,
                "display_name": display_names.get(m.username, m.username),
            }
            for m in members
            if m.username not in excluded
        ]

    return {"teams": result, "slugs": list(team_map.keys())}


@router.get("/pull-requests", response_model=PRListResponse)
async def list_pull_requests(
    branch_type: str = Query(default="all", pattern="^(all|main|feature)$"),
    sort_by: str = Query(default="age", pattern="^(age|author|reviewers)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    team: Optional[str] = Query(default=None, description="Team slug to filter by"),
) -> PRListResponse:
    """Fetch all open PRs for the team with filtering and sorting."""
    return await get_team_pull_requests(
        branch_type=branch_type,
        sort_by=sort_by,
        sort_order=sort_order,
        team_slug=team,
    )


@router.get("/pull-requests/{pr_number}", response_model=PullRequestDetail)
async def get_pr_detail(
    pr_number: int,
    repo: Optional[str] = Query(default=None, description="Repository name (required in multi-repo mode)"),
) -> PullRequestDetail:
    """Fetch detailed information for a specific PR."""
    try:
        return await get_pull_request_detail(pr_number, repo=repo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
