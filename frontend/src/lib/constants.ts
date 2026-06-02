export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const REFETCH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export const AGING_COLORS = {
  normal: "text-green-700 bg-green-50 border-green-200",
  warning: "text-amber-700 bg-amber-50 border-amber-200",
  critical: "text-red-700 bg-red-50 border-red-200",
} as const;

export const BRANCH_COLORS = {
  main: "text-blue-700 bg-blue-50 border-blue-200",
  feature: "text-purple-700 bg-purple-50 border-purple-200",
} as const;
