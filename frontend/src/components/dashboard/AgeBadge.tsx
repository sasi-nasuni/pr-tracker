import { cn } from "@/lib/utils";
import { AGING_COLORS } from "@/lib/constants";
import type { AgeInfo } from "@/types/pull-request";

interface AgeBadgeProps {
  age: AgeInfo;
}

function getAgeLevel(age: AgeInfo): "normal" | "warning" | "critical" {
  const { days, threshold_days } = age;
  if (days >= threshold_days) return "critical";
  if (days >= threshold_days * 0.75) return "warning";
  return "normal";
}

export function AgeBadge({ age }: AgeBadgeProps) {
  const level = getAgeLevel(age);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        AGING_COLORS[level]
      )}
    >
      {age.display}
    </span>
  );
}
