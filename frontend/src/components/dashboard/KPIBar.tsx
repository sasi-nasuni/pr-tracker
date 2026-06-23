import { AlertTriangle, MessageCircle, CheckCircle2, GitPullRequest } from "lucide-react";
import type { PullRequest } from "@/types/pull-request";

interface KPIBarProps {
  pullRequests: PullRequest[];
}

function isReadyToMerge(pr: PullRequest): boolean {
  if (pr.branch_type === "main") {
    // Main branch: requires 1 code-owner approval + 1 team approval
    const hasCodeOwnerApproval = pr.code_owner_status?.approved === true;
    const hasTeamApproval = (pr.team_approvals?.current ?? 0) >= 1;
    return hasCodeOwnerApproval && hasTeamApproval;
  } else {
    // Feature branch: requires 2 team approvals (code-owner optional)
    return (pr.team_approvals?.current ?? 0) >= 2;
  }
}

export function KPIBar({ pullRequests }: KPIBarProps) {
  const total = pullRequests.length;
  const stale = pullRequests.filter((pr) => pr.age.is_stale).length;
  const withComments = pullRequests.filter((pr) => pr.unresolved_comment_count > 0).length;
  const approved = pullRequests.filter(isReadyToMerge).length;

  const cards = [
    {
      label: "Open PRs",
      value: total,
      icon: GitPullRequest,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      label: "Stale",
      value: stale,
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      label: "Unresolved Comments",
      value: withComments,
      icon: MessageCircle,
      color: "text-red-600 bg-red-50 border-red-200",
    },
    {
      label: "Ready to Merge",
      value: approved,
      icon: CheckCircle2,
      color: "text-green-600 bg-green-50 border-green-200",
      tooltip: "main: 1 code-owner + 1 team | feature: 2 team approvals",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${card.color}`}
          title={card.tooltip}
        >
          <card.icon className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-2xl font-bold leading-none">{card.value}</p>
            <p className="mt-0.5 text-xs font-medium opacity-80">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
