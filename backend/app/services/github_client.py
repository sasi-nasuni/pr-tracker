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
        """Fetch all open PRs for the configured single repo (handles pagination)."""
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

    async def search_team_pull_requests(self, team_usernames: list[str]) -> list[dict[str, Any]]:
        """Use GitHub Search API to find all open PRs by team members across the org."""
        author_clauses = " ".join(f"author:{u}" for u in team_usernames)
        query = f"is:pr is:open org:{settings.github_org} {author_clauses}"

        results: list[dict[str, Any]] = []
        page = 1

        async with self._client() as client:
            while True:
                response = await client.get(
                    "/search/issues",
                    params={"q": query, "per_page": 100, "page": page},
                )
                response.raise_for_status()
                data = response.json()
                results.extend(data.get("items", []))
                if len(results) >= data.get("total_count", 0):
                    break
                page += 1

        return results

    async def get_pull_request(self, owner: str, repo: str, pr_number: int) -> dict[str, Any]:
        """Fetch a single PR's full data from the REST API."""
        async with self._client() as client:
            response = await client.get(
                f"/repos/{owner}/{repo}/pulls/{pr_number}",
            )
            response.raise_for_status()
            return response.json()

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

    async def get_pr_reviews(self, owner: str, repo: str, pr_number: int) -> list[dict[str, Any]]:
        """Fetch reviews for a specific PR."""
        async with self._client() as client:
            response = await client.get(
                f"/repos/{owner}/{repo}/pulls/{pr_number}/reviews",
                params={"per_page": 100},
            )
            response.raise_for_status()
            return response.json()

    async def get_pr_comments(self, owner: str, repo: str, pr_number: int) -> list[dict[str, Any]]:
        """Fetch review comments for a specific PR."""
        async with self._client() as client:
            response = await client.get(
                f"/repos/{owner}/{repo}/pulls/{pr_number}/comments",
                params={"per_page": 100},
            )
            response.raise_for_status()
            return response.json()

    async def get_pr_files(self, owner: str, repo: str, pr_number: int) -> list[dict[str, Any]]:
        """Fetch changed files for a specific PR."""
        async with self._client() as client:
            response = await client.get(
                f"/repos/{owner}/{repo}/pulls/{pr_number}/files",
                params={"per_page": 100},
            )
            response.raise_for_status()
            return response.json()

    async def get_codeowners(self, owner: str, repo: str) -> str | None:
        """Fetch the CODEOWNERS file content for a repo. Returns None if not found."""
        async with self._client() as client:
            for path in [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"]:
                response = await client.get(
                    f"/repos/{owner}/{repo}/contents/{path}",
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

    async def get_review_threads(self, owner: str, repo: str, pr_number: int) -> list[dict[str, Any]]:
        """Fetch review threads for a PR using the GraphQL API."""
        query = """
        query($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $prNumber) {
              reviewThreads(first: 100, after: $cursor) {
                pageInfo { hasNextPage endCursor }
                nodes {
                  id
                  isResolved
                  comments(first: 1) {
                    nodes {
                      author { login }
                      body
                      path
                      line
                      url
                    }
                  }
                }
              }
            }
          }
        }
        """
        threads: list[dict[str, Any]] = []
        cursor: str | None = None

        async with self._client() as client:
            while True:
                variables = {
                    "owner": owner,
                    "repo": repo,
                    "prNumber": pr_number,
                    "cursor": cursor,
                }
                response = await client.post(
                    "https://api.github.com/graphql",
                    json={"query": query, "variables": variables},
                )
                response.raise_for_status()
                data = response.json()

                review_threads = (
                    data.get("data", {})
                    .get("repository", {})
                    .get("pullRequest", {})
                    .get("reviewThreads", {})
                )

                nodes = review_threads.get("nodes", [])
                threads.extend(nodes)

                page_info = review_threads.get("pageInfo", {})
                if page_info.get("hasNextPage"):
                    cursor = page_info["endCursor"]
                else:
                    break

        return threads


# Singleton instance
github_client = GitHubClient()
