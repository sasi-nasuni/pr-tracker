import { useState } from "react";
import type { TeamApprovals } from "@/types/pull-request";

interface TeamApprovalsBadgeProps {
  teamApprovals: TeamApprovals | null;
}

export function TeamApprovalsBadge({ teamApprovals }: TeamApprovalsBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!teamApprovals) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const { current, required, approvers } = teamApprovals;
  const isMet = current >= required;

  const colorClass = isMet
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${colorClass}`}
      >
        {isMet ? "✅" : "⏳"} {current}/{required}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-lg">
          <div className="whitespace-nowrap text-xs text-gray-600">
            {current === 0 ? (
              <div className="py-0.5 text-gray-400">No approvals yet</div>
            ) : (
              approvers.map((a) => (
                <div key={a.username} className="flex items-center gap-1.5 py-0.5">
                  <span>{a.has_approved ? "✅" : "⬜"}</span>
                  <span>{a.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
