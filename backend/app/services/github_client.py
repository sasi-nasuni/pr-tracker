import httpx
from typing import Any

from app.config import settings


class GitHubClient:
    """Async HTTP client for GitHub REST API."""

    BASE_URL = "https://api.github.com"

    def __init__(self) -> None:
        self._headers = {
            "Authorization": f"Bearer {settings.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers=self._headers,
            timeout=30.0,
        )

    async def get_open_pull_requests(self) -> list[dict[str, Any]]:
        """Fetch all open PRs for the repo (handles pagination)."""
        prs: list[dict[str, Any]] = []
        page = 1

        async with self._client() as client:
            while True:
                response = await client.get(
                    f"/repos/{settings.github_org}/{settings.github_repo}/pulls",
                    params={"state": "open", "per_page": 100, "page": page},
                )
                response.raise_for_status()
                data = response.json()
                if not data:
                    break
                prs.extend(data)
                page += 1

        return prs

    async def get_team_members(self) -> list[dict[str, Any]]:
        """Fetch members of the GitHub team."""
        members: list[dict[str, Any]] = []
        page = 1

        async with self._client() as client:
            while True:
                response = await client.get(
                    f"/orgs/{settings.github_org}/teams/{settings.github_team_slug}/members",
                    params={"per_page": 100, "page": page},
                )
                response.raise_for_status()
                data = response.json()
                if not data:
                    break
                members.extend(data)
                page += 1

        return members

    async def get_pr_reviews(self, pr_number: int) -> list[dict[str, Any]]:
        """Fetch reviews for a specific PR."""
        async with self._client() as client:
            response = await client.get(
                f"/repos/{settings.github_org}/{settings.github_repo}/pulls/{pr_number}/reviews",
                params={"per_page": 100},
            )
            response.raise_for_status()
            return response.json()

    async def get_pr_comments(self, pr_number: int) -> list[dict[str, Any]]:
        """Fetch review comments for a specific PR."""
        async with self._client() as client:
            response = await client.get(
                f"/repos/{settings.github_org}/{settings.github_repo}/pulls/{pr_number}/comments",
                params={"per_page": 100},
            )
            response.raise_for_status()
            return response.json()

    async def get_pr_files(self, pr_number: int) -> list[dict[str, Any]]:
        """Fetch changed files for a specific PR."""
        async with self._client() as client:
            response = await client.get(
                f"/repos/{settings.github_org}/{settings.github_repo}/pulls/{pr_number}/files",
                params={"per_page": 100},
            )
            response.raise_for_status()
            return response.json()

    async def get_codeowners(self) -> str | None:
        """Fetch the CODEOWNERS file content. Returns None if not found."""
        async with self._client() as client:
            # Try common locations
            for path in [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"]:
                response = await client.get(
                    f"/repos/{settings.github_org}/{settings.github_repo}/contents/{path}",
                    headers={**self._headers, "Accept": "application/vnd.github.raw+json"},
                )
                if response.status_code == 200:
                    return response.text
            return None

    async def get_rate_limit(self) -> dict[str, Any]:
        """Fetch current rate limit status."""
        async with self._client() as client:
            response = await client.get("/rate_limit")
            response.raise_for_status()
            return response.json()


# Singleton instance
github_client = GitHubClient()
