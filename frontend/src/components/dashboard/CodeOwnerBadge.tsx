import type { CodeOwnerStatus } from "@/types/pull-request";

interface CodeOwnerBadgeProps {
  status: CodeOwnerStatus | null;
  branchType: string;
}

export function CodeOwnerBadge({ status, branchType }: CodeOwnerBadgeProps) {
  if (branchType !== "main" || !status) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  if (status.approved) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        ✅ Approved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      ⏳ Pending
    </span>
  );
}
