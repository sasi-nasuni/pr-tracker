from fastapi import APIRouter

from app.services.github_client import github_client

router = APIRouter(prefix="/api/v1", tags=["Health"])


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint with GitHub API rate limit status."""
    try:
        rate_limit_data = await github_client.get_rate_limit()
        core = rate_limit_data.get("resources", {}).get("core", {})
        return {
            "status": "healthy",
            "github_api": {
                "rate_limit": core.get("limit"),
                "remaining": core.get("remaining"),
                "reset_at": core.get("reset"),
            },
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
        }
