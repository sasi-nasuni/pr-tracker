import { cn } from "@/lib/utils";
import { BRANCH_COLORS } from "@/lib/constants";

interface BranchTypeBadgeProps {
  branchType: "main" | "feature";
}

export function BranchTypeBadge({ branchType }: BranchTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        BRANCH_COLORS[branchType]
      )}
    >
      {branchType}
    </span>
  );
}
