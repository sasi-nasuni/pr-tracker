import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

interface PersonFilterProps {
  people: { username: string; display_name: string; count: number }[];
  selected: string;
  onChange: (person: string) => void;
}

export function PersonFilter({ people, selected, onChange }: PersonFilterProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const totalCount = useMemo(
    () => people.reduce((sum, person) => sum + person.count, 0),
    [people]
  );

  const options = useMemo(
    () => [
      { value: "all", label: `All People (${totalCount})` },
      ...people.map((person) => ({
        value: person.username,
        label: `${person.display_name} (${person.count})`,
      })),
    ],
    [people, totalCount]
  );

  const selectedOption =
    options.find((option) => option.value === selected) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-64 min-w-64 max-w-64">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        title={selectedOption.label}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {options.map((option) => {
            const isSelected = option.value === selected;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                title={option.label}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="ml-2 h-4 w-4 shrink-0 text-slate-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
