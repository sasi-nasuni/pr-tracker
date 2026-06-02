from fastapi import APIRouter

from app.models.team import TeamMember
from app.services.team_service import get_team_members

router = APIRouter(prefix="/api/v1/team", tags=["Team"])


@router.get("/members", response_model=list[TeamMember])
async def list_team_members() -> list[TeamMember]:
    """Fetch the list of resolved team members."""
    return await get_team_members()
