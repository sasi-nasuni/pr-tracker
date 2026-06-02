from datetime import datetime, timezone


def calculate_age(created_at: str) -> dict:
    """Calculate the age of a PR from its creation time.

    Args:
        created_at: ISO 8601 timestamp string.

    Returns:
        Dictionary with days, hours, display string, and raw total hours.
    """
    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    delta = now - created

    total_seconds = int(delta.total_seconds())
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600

    if days > 0:
        display = f"{days}d {hours}h"
    else:
        display = f"{hours}h"

    return {
        "days": days,
        "hours": hours,
        "display": display,
        "total_hours": days * 24 + hours,
    }


def check_staleness(age_days: int, branch_type: str, threshold_main: int, threshold_feature: int) -> tuple[bool, int]:
    """Check if a PR is stale based on branch-specific thresholds.

    Returns:
        Tuple of (is_stale, threshold_days).
    """
    threshold = threshold_main if branch_type == "main" else threshold_feature
    return age_days >= threshold, threshold


def classify_branch(base_branch: str) -> str:
    """Classify a PR as targeting 'main' or 'feature' based on base branch.

    Args:
        base_branch: The base branch name the PR is targeting.

    Returns:
        'main' if targeting main/master, 'feature' otherwise.
    """
    main_branches = {"main", "master"}
    return "main" if base_branch.lower() in main_branches else "feature"
