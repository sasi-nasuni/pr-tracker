import asyncio
import logging
import time
from typing import Optional

from app.config import settings
from app.services.github_client import github_client
from app.models.team import TeamMember

logger = logging.getLogger(__name__)

# In-memory cache for display names (username -> display_name)
_display_name_cache: dict[str, str] = {}
_display_name_cache_ts: float = 0
_DISPLAY_NAME_TTL = 3600  # 1 hour

# In-memory cache for team members per slug
_team_members_cache: dict[str, list[TeamMember]] = {}
_team_members_cache_ts: float = 0
_TEAM_MEMBERS_TTL = 300  # 5 minutes


async def get_team_members(team_slug: Optional[str] = None) -> list[TeamMember]:
    """Fetch team members from GitHub Teams API for a specific team slug.

    Falls back to FALLBACK_TEAM_MEMBERS if the API call fails.
    """
    slug = team_slug or settings.github_team_slug
    try:
        members_data = await github_client.get_team_members_for_slug(slug)
        return [
            TeamMember(
                username=member["login"],
                avatar_url=member["avatar_url"],
                display_name=None,  # Populated lazily
                team_slug=slug,
            )
            for member in members_data
        ]
    except Exception as e:
        logger.warning(f"Failed to fetch team members for {slug}: {e}")
        fallback = settings.fallback_members_list
        if fallback:
            logger.info(f"Using fallback team members: {fallback}")
            return [
                TeamMember(username=username, avatar_url="", team_slug=slug)
                for username in fallback
            ]
        raise


async def get_all_team_members() -> dict[str, list[TeamMember]]:
    """Fetch members for all configured team slugs. Returns {slug: [members]}."""
    global _team_members_cache, _team_members_cache_ts

    now = time.time()
    if _team_members_cache and (now - _team_members_cache_ts) < _TEAM_MEMBERS_TTL:
        return _team_members_cache

    slugs = settings.team_slugs_list
    results = await asyncio.gather(
        *[get_team_members(slug) for slug in slugs],
        return_exceptions=True,
    )

    team_map: dict[str, list[TeamMember]] = {}
    for slug, result in zip(slugs, results):
        if isinstance(result, Exception):
            logger.warning(f"Failed to get members for team {slug}: {result}")
            team_map[slug] = []
        else:
            team_map[slug] = result

    _team_members_cache = team_map
    _team_members_cache_ts = now
    return team_map


async def get_team_usernames(team_slug: Optional[str] = None) -> set[str]:
    """Get a set of team member usernames for quick lookup.

    If team_slug is provided, returns only that team's members.
    Otherwise returns members from all configured teams.
    """
    excluded = set(settings.excluded_members_list)

    if team_slug:
        members = await get_team_members(team_slug)
        return {m.username for m in members if m.username not in excluded}

    # All teams
    team_map = await get_all_team_members()
    all_usernames: set[str] = set()
    for members in team_map.values():
        for m in members:
            if m.username not in excluded:
                all_usernames.add(m.username)
    return all_usernames


async def resolve_display_names(usernames: list[str]) -> dict[str, str]:
    """Resolve GitHub usernames to display names with caching."""
    global _display_name_cache, _display_name_cache_ts

    now = time.time()
    if (now - _display_name_cache_ts) > _DISPLAY_NAME_TTL:
        _display_name_cache.clear()
        _display_name_cache_ts = now

    missing = [u for u in usernames if u not in _display_name_cache]

    if missing:
        async def fetch_name(username: str) -> tuple[str, str]:
            try:
                profile = await github_client.get_user_profile(username)
                name = profile.get("name") or username
                return username, name
            except Exception:
                return username, username

        results = await asyncio.gather(*[fetch_name(u) for u in missing])
        for username, name in results:
            _display_name_cache[username] = name

    return {u: _display_name_cache.get(u, u) for u in usernames}
