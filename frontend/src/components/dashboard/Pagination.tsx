import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span>–<span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{totalItems}</span> PRs
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-gray-600">
            Per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value={9999}>All</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            "inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-sm",
            currentPage <= 1
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-gray-50"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous</span>
        </button>

        <span className="px-3 text-sm text-gray-700">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            "inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-sm",
            currentPage >= totalPages
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-gray-50"
          )}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next</span>
        </button>
      </div>
    </div>
  );
}
