import fnmatch
from pathlib import PurePosixPath


def match_file_to_pattern(filepath: str, pattern: str) -> bool:
    """Match a file path against a CODEOWNERS glob pattern.

    Implements GitHub's CODEOWNERS matching rules:
    - Patterns without a slash are matched against the filename.
    - Patterns with a slash are matched against the full path.
    - Leading slash anchors to the root.
    - Trailing slash matches directories.
    - `*` matches within a single directory level.
    - `**` matches across directory levels.

    Args:
        filepath: The file path to check (e.g., "src/api/handler.py").
        pattern: The CODEOWNERS glob pattern (e.g., "*.py", "/src/api/").

    Returns:
        True if the file matches the pattern.
    """
    filepath = filepath.lstrip("/")

    # Trailing slash means match anything inside that directory
    if pattern.endswith("/"):
        dir_pattern = pattern.rstrip("/")
        dir_pattern = dir_pattern.lstrip("/")
        return filepath.startswith(dir_pattern + "/") or filepath == dir_pattern

    # Leading slash anchors to root
    if pattern.startswith("/"):
        pattern = pattern.lstrip("/")
        return fnmatch.fnmatch(filepath, pattern) or _match_with_doublestar(filepath, pattern)

    # No slash in pattern → match against basename only
    if "/" not in pattern:
        basename = PurePosixPath(filepath).name
        return fnmatch.fnmatch(basename, pattern)

    # Pattern with slash but no leading slash → match from any depth
    return _match_with_doublestar(filepath, pattern) or fnmatch.fnmatch(filepath, pattern)


def _match_with_doublestar(filepath: str, pattern: str) -> bool:
    """Handle ** patterns for matching across directories."""
    if "**" in pattern:
        # Replace ** with a regex-like match
        parts = pattern.split("**")
        if len(parts) == 2:
            prefix, suffix = parts
            prefix = prefix.rstrip("/")
            suffix = suffix.lstrip("/")

            if prefix and not filepath.startswith(prefix.rstrip("/")):
                return False

            if suffix:
                return fnmatch.fnmatch(
                    filepath[len(prefix):].lstrip("/") if prefix else filepath,
                    suffix,
                ) or any(
                    fnmatch.fnmatch(part, suffix)
                    for part in _get_suffixes(filepath, prefix)
                )
            return True

    return fnmatch.fnmatch(filepath, pattern)


def _get_suffixes(filepath: str, prefix: str) -> list[str]:
    """Get all possible suffix matches for a filepath after a prefix."""
    remaining = filepath[len(prefix):].lstrip("/") if prefix else filepath
    parts = remaining.split("/")
    suffixes = []
    for i in range(len(parts)):
        suffixes.append("/".join(parts[i:]))
    return suffixes
