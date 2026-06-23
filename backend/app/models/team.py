from pydantic import BaseModel
from typing import Optional


class TeamMember(BaseModel):
    username: str
    avatar_url: str
    display_name: Optional[str] = None
    team_slug: Optional[str] = None
