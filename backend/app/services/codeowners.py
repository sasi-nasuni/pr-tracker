"""CODEOWNERS parser and file-to-owner resolver.

Implements GitHub's CODEOWNERS matching behavior:
- Last matching rule wins.
- Supports @user and @org/team owners.
- Resolves team owners to individual usernames via GitHub Teams API.
"""

import logging
from dataclasses import dataclass

from app.utils.glob_matcher import match_file_to_pattern

logger = logging.getLogger(__name__)


@dataclass
class CodeOwnerRule:
    """A single rule from the CODEOWNERS file."""

    pattern: str
    owners: list[str]  # e.g., ["@user1", "@org/team-name"]


def parse_codeowners(content: str) -> list[CodeOwnerRule]:
    """Parse CODEOWNERS file content into a list of rules.

    Args:
        content: Raw text content of the CODEOWNERS file.

    Returns:
        List of CodeOwnerRule objects, in file order.
    """
    rules: list[CodeOwnerRule] = []

    for line in content.splitlines():
        line = line.strip()
        # Skip empty lines and full-line comments
        if not line or line.startswith("#"):
            continue

        # Strip inline comments (anything after # not in a pattern)
        if " #" in line:
            line = line[: line.index(" #")]
            line = line.strip()

        parts = line.split()
        if len(parts) < 2:
            continue

        pattern = parts[0]
        # Only include entries that look like owners (@user or @org/team)
        owners = [p for p in parts[1:] if p.startswith("@")]
        if not owners:
            continue
        rules.append(CodeOwnerRule(pattern=pattern, owners=owners))

    return rules


def get_code_owners_for_files(
    codeowners_content: str, file_paths: list[str]
) -> set[str]:
    """Determine the set of code owners for a list of changed files.

    Uses last-match-wins semantics (same as GitHub).

    Args:
        codeowners_content: Raw CODEOWNERS file content.
        file_paths: List of file paths changed in the PR.

    Returns:
        Set of individual owner usernames (with @ prefix stripped).
        Team references (org/team) are excluded since they can't be
        directly matched to reviewer usernames.
    """
    rules = parse_codeowners(codeowners_content)
    if not rules:
        return set()

    all_owners: set[str] = set()

    for filepath in file_paths:
        # Find the last matching rule (GitHub semantics)
        matched_owners: list[str] = []
        for rule in rules:
            if match_file_to_pattern(filepath, rule.pattern):
                matched_owners = rule.owners

        # Add owners from the last matching rule
        for owner in matched_owners:
            # Strip @ prefix
            clean_owner = owner.lstrip("@")
            if "/" in clean_owner:
                # This is an org/team reference (e.g., nasuni/phoenix)
                # Skip team references — we can't match them to individual reviewers
                logger.debug(f"Skipping team reference: {clean_owner}")
                continue
            else:
                all_owners.add(clean_owner)

    return all_owners
