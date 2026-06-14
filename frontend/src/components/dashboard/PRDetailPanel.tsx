import { useEffect, useRef, useState, useMemo } from "react";
import { X, ExternalLink, FileText, Users, GitBranch, Clock, ChevronDown, ChevronRight, MessageCircle, ShieldCheck } from "lucide-react";
import { marked } from "marked";
import { usePRDetail } from "@/hooks/usePRDetail";
import { AgeBadge } from "./AgeBadge";

interface PRDetailPanelProps {
  prNumber: number | null;
  repo?: string;
  onClose: () => void;
}

export function PRDetailPanel({ prNumber, repo, onClose }: PRDetailPanelProps) {
  const { data: pr, isLoading, error } = usePRDetail(prNumber, repo);
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (prNumber) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [prNumber]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (prNumber) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [prNumber, onClose]);

  // Focus trap: focus the panel when opened
  useEffect(() => {
    if (prNumber && panelRef.current) {
      panelRef.current.focus();
    }
  }, [prNumber]);

  if (!prNumber) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Pull request ${prNumber} details`}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl outline-none transition-transform duration-300 ease-out"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">PR #{prNumber}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && <LoadingSkeleton />}
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              Failed to load PR details. Please try again.
            </div>
          )}
          {pr && (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-base font-semibold text-gray-900">{pr.title}</h3>
              </div>

              {/* Author & Branch */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <img
                    src={pr.author.avatar_url}
                    alt={pr.author.username}
                    className="h-6 w-6 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-700">{pr.author.username}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GitBranch className="h-4 w-4" />
                  <span>
                    {pr.head_branch} → {pr.base_branch}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <AgeBadge age={pr.age} />
                </div>
              </div>

              {/* Code Owner Status */}
              {pr.code_owner_status && (
                <div className="rounded-md border border-gray-200 p-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Code Owner Status</h4>
                  <div className="space-y-1">
                    {pr.code_owner_status.owners.map((owner) => (
                      <div key={owner.username} className="flex items-center gap-2 text-sm">
                        <span>{owner.has_approved ? "✅" : "⏳"}</span>
                        <span className="text-gray-700">{owner.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Approvals */}
              {pr.team_approvals && (
                <div className="rounded-md border border-gray-200 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <ShieldCheck className="h-4 w-4" />
                    Team Approvals ({pr.team_approvals.current}/{pr.team_approvals.required})
                  </div>
                  <div className="space-y-1">
                    {pr.team_approvals.approvers.map((member) => (
                      <div key={member.username} className="flex items-center gap-2 text-sm">
                        <span>{member.has_approved ? "✅" : "⬜"}</span>
                        <span className="text-gray-700">{member.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved Comments */}
              {pr.unresolved_threads && pr.unresolved_threads.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
                    <MessageCircle className="h-4 w-4" />
                    Unresolved Comments ({pr.unresolved_threads.length})
                  </div>
                  <div className="space-y-3">
                    {pr.unresolved_threads.map((thread) => (
                      <div key={thread.id} className="rounded border border-amber-100 bg-white p-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{thread.author}</span>
                          {thread.path && (
                            <span className="truncate font-mono text-gray-400">
                              {thread.path}{thread.line ? `:${thread.line}` : ""}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{thread.body}</p>
                        <a
                          href={thread.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
                        >
                          View on GitHub <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description — collapsible with rendered markdown */}
              {pr.body && <DescriptionSection body={pr.body} />}

              {/* Active Reviewers */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4" />
                  Active Reviewers ({pr.active_reviewers.length})
                </div>
                {pr.active_reviewers.length === 0 ? (
                  <p className="text-sm text-gray-400">No reviewers yet</p>
                ) : (
                  <div className="space-y-2">
                    {pr.active_reviewers.map((reviewer) => (
                      <div key={reviewer.username} className="flex items-center gap-2">
                        <img
                          src={reviewer.avatar_url}
                          alt={reviewer.username}
                          className="h-5 w-5 rounded-full"
                        />
                        <span className="text-sm text-gray-700">{reviewer.username}</span>
                        <ReviewStateBadge state={reviewer.state} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Files Changed */}
              <div className="rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    📁 {pr.files_changed.total} files changed
                  </span>
                  <span className="text-sm">
                    <span className="text-green-600">+{pr.files_changed.additions}</span>
                    {" / "}
                    <span className="text-red-600">-{pr.files_changed.deletions}</span>
                  </span>
                </div>
              </div>

              {/* Open in GitHub */}
              <a
                href={pr.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                <ExternalLink className="h-4 w-4" />
                Open in GitHub
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ReviewStateBadge({ state }: { state: string }) {
  const config: Record<string, { icon: string; color: string }> = {
    APPROVED: { icon: "✅", color: "text-green-600" },
    CHANGES_REQUESTED: { icon: "🔄", color: "text-red-600" },
    COMMENTED: { icon: "💬", color: "text-blue-600" },
  };

  const { icon, color } = config[state] || { icon: "•", color: "text-gray-500" };

  return (
    <span className={`text-xs ${color}`}>
      {icon} {state.toLowerCase().replace("_", " ")}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-3/4 rounded bg-gray-200" />
      <div className="h-4 w-1/2 rounded bg-gray-200" />
      <div className="h-4 w-1/3 rounded bg-gray-200" />
      <div className="h-20 rounded bg-gray-200" />
      <div className="h-4 w-2/3 rounded bg-gray-200" />
      <div className="h-4 w-1/2 rounded bg-gray-200" />
    </div>
  );
}

function DescriptionSection({ body }: { body: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const htmlContent = useMemo(() => {
    return marked(body, { breaks: true, gfm: true }) as string;
  }, [body]);

  return (
    <div className="rounded-md border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <FileText className="h-4 w-4" />
        Description
      </button>
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto border-t border-gray-200 px-4 py-3">
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}
    </div>
  );
}
