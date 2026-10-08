import React from "react";

/**
 * Status pills, with the count each state would show. The count answers "is this filter worth
 * pressing" before it is pressed, the difference between a filter bar and a row of guesses.
 */
const StatusFilterGroup = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
    {options.map((option) => {
      const active = value === option.key;
      return (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={active}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
            active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {option.label}
          {option.count != null && (
            <span className={`ml-1.5 tabular-nums ${active ? "text-blue-100" : "text-slate-400"}`}>
              {option.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default StatusFilterGroup;
