import { RefreshCw, GitPullRequest } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardHeaderProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ lastUpdated, isLoading, onRefresh }: DashboardHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <GitPullRequest className="h-6 w-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">PR Tracker</h1>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
