import logging

from app.config import settings
from app.services.github_client import github_client
from app.models.team import TeamMember

logger = logging.getLogger(__name__)


async def get_team_members() -> list[TeamMember]:
    """Fetch team members from GitHub Teams API.

    Falls back to FALLBACK_TEAM_MEMBERS if the API call fails.
    """
    try:
        members_data = await github_client.get_team_members()
        return [
            TeamMember(
                username=member["login"],
                avatar_url=member["avatar_url"],
            )
            for member in members_data
        ]
    except Exception as e:
        logger.warning(f"Failed to fetch team members from GitHub: {e}")
        # Fallback to configured members
        fallback = settings.fallback_members_list
        if fallback:
            logger.info(f"Using fallback team members: {fallback}")
            return [
                TeamMember(username=username, avatar_url="")
                for username in fallback
            ]
        raise


async def get_team_usernames() -> set[str]:
    """Get a set of team member usernames for quick lookup."""
    members = await get_team_members()
    excluded = set(settings.excluded_members_list)
    return {m.username for m in members if m.username not in excluded}
