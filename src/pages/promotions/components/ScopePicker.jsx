import React from "react";

/**
 * What the campaign applies to: one joined segmented control, with the current scope's
 * description under it.
 *
 * <p>This used to be four option cards — icon, bold label, hint, border, rounded box — and
 * it sat directly above the mechanic picker's seven illustrated tiles. Eleven card-shaped
 * buttons in two different grids before the operator had typed anything, which is most of
 * why the screen read as assembled rather than designed. Four words belong on one control.
 *
 * <p>The description is not dropped: it moved below the control and describes only the
 * selected scope. Same information, one line instead of four boxes.
 */
const SCOPES = [
  { key: "ITEM", label: "Items", hint: "Chosen items, each at its own price" },
  { key: "CATEGORY", label: "Category", hint: "Everything in a category" },
  { key: "BILL", label: "Bill total", hint: "Any bill over an amount" },
  { key: "CUSTOMER", label: "Customer", hint: "Named customers only" },
];

const ScopePicker = ({ value, onChange, disabled }) => {
  const selected = SCOPES.find((scope) => scope.key === value) || SCOPES[0];

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="What this campaign applies to"
        className="grid grid-cols-2 sm:inline-flex sm:w-fit"
      >
        {SCOPES.map(({ key, label }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(key)}
              className={`border border-slate-200 px-4 py-2 text-sm transition-colors first:rounded-l-lg last:rounded-r-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-accent bg-accent font-semibold text-accent-fg"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              } ${!active ? "-ml-px sm:ml-0" : ""}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{selected.hint}</p>
    </div>
  );
};

export default ScopePicker;
