from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # GitHub
    github_token: str
    github_org: str
    github_repo: Optional[str] = None  # Optional: if set, single-repo mode; if unset, multi-repo
    github_team_slug: str

    # Aging Thresholds (days)
    aging_threshold_main: int = 3
    aging_threshold_feature: int = 2

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173"

    # Optional: Fallback team members (comma-separated)
    fallback_team_members: Optional[str] = None

    # Optional: Excluded members (comma-separated) — people on GitHub team but not on project team
    excluded_team_members: Optional[str] = None

    # Phase 2: Team approvals
    required_team_approvals: int = 2

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def fallback_members_list(self) -> list[str]:
        if not self.fallback_team_members:
            return []
        return [m.strip() for m in self.fallback_team_members.split(",")]

    @property
    def excluded_members_list(self) -> list[str]:
        if not self.excluded_team_members:
            return []
        return [m.strip() for m in self.excluded_team_members.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
