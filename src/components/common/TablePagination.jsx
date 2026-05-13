import React from "react";

import Button from "./Button";

const TablePagination = ({
  summary,
  page,
  pageInput,
  totalPages,
  loading = false,
  onPageChange,
  onPageInputChange,
  onGoToPage,
}) => {
  const displayTotalPages = totalPages === 0 ? 1 : totalPages;

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t bg-slate-50 p-4 lg:flex-row">
      <span className="text-sm text-slate-500">{summary}</span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          disabled={page === 0 || loading}
          onClick={() => onPageChange(page - 1)}
          variant="secondary"
          className="px-3 py-1 text-sm"
        >
          Prev
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Go to</span>
          <input
            type="number"
            min="1"
            max={displayTotalPages}
            value={pageInput}
            onChange={(event) => onPageInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onGoToPage();
              }
            }}
            className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={onGoToPage}
            disabled={loading}
            className="px-3 py-1 text-sm"
          >
            Go
          </Button>
        </div>
        <Button
          disabled={page >= totalPages - 1 || loading}
          onClick={() => onPageChange(page + 1)}
          variant="secondary"
          className="px-3 py-1 text-sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;
