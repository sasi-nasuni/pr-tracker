from pydantic import BaseModel


class TeamMember(BaseModel):
    username: str
    avatar_url: str
