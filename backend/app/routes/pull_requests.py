from fastapi import APIRouter, Query, HTTPException

from app.models.pr import PRListResponse, PullRequestDetail
from app.services.pr_service import get_team_pull_requests, get_pull_request_detail

router = APIRouter(prefix="/api/v1/pull-requests", tags=["Pull Requests"])


@router.get("", response_model=PRListResponse)
async def list_pull_requests(
    branch_type: str = Query(default="all", pattern="^(all|main|feature)$"),
    sort_by: str = Query(default="age", pattern="^(age|author|reviewers)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> PRListResponse:
    """Fetch all open PRs for the team with filtering and sorting."""
    return await get_team_pull_requests(
        branch_type=branch_type,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{pr_number}", response_model=PullRequestDetail)
async def get_pr_detail(pr_number: int) -> PullRequestDetail:
    """Fetch detailed information for a specific PR."""
    try:
        return await get_pull_request_detail(pr_number)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
