import { cn } from "@/lib/utils";
import type { BranchFilter } from "@/types/pull-request";

interface BranchFilterTabsProps {
  activeTab: BranchFilter;
  onTabChange: (tab: BranchFilter) => void;
  counts: { all: number; main: number; feature: number };
}

const tabs: { value: BranchFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "main", label: "Main" },
  { value: "feature", label: "Feature" },
];

export function BranchFilterTabs({ activeTab, onTabChange, counts }: BranchFilterTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === tab.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          {tab.label}
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
              activeTab === tab.value
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-200 text-gray-600"
            )}
          >
            {counts[tab.value]}
          </span>
        </button>
      ))}
    </div>
  );
}
