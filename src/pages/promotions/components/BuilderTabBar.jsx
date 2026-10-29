import React from "react";

/**
 * The six steps of the campaign builder, as one flat row of tabs.
 *
 * <p>This replaces both the six stacked accordions and the left index rail. Tabs are the
 * right call here because the rule (six small decisions) and the coverage work (a 300-row
 * price table) are different jobs at different frequencies — showing one at a time gives
 * the table the full width of the page, which is the reason the old layout felt cramped.
 *
 * <p>Not a wizard: there is no enforced order, no Next button, and every step is reachable
 * at any time. `readiness` is rendered at the right as a permanent readout so the operator
 * can see what still blocks activation without opening the Codes step.
 */
const BuilderTabBar = ({ steps, active, onChange, readiness }) => {
  const buttonsRef = React.useRef([]);

  const focusAt = (index) => {
    const step = steps[index];
    if (step && !step.disabled) {
      buttonsRef.current[index]?.focus();
      onChange(step.key);
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusAt((index + 1) % steps.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusAt((index - 1 + steps.length) % steps.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAt(steps.length - 1);
    }
  };

  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 sm:flex-row sm:items-end sm:gap-1">
      <div role="tablist" aria-label="Campaign steps" className="flex items-end gap-1 overflow-x-auto">
        {steps.map((step, index) => {
          const selected = active === step.key;
          return (
            <button
              key={step.key}
              ref={(node) => { buttonsRef.current[index] = node; }}
              type="button"
              role="tab"
              id={`builder-tab-${step.key}`}
              aria-selected={selected}
              aria-controls={`builder-panel-${step.key}`}
              tabIndex={selected ? 0 : -1}
              disabled={step.disabled}
              onClick={() => onChange(step.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? "border-accent font-semibold text-slate-800"
                  : "border-transparent font-medium text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="text-xs tabular-nums text-slate-400">{step.number}</span>
              <span>{step.label}</span>
              {step.count != null && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">
                  {step.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {readiness && (
        <button
          type="button"
          onClick={readiness.onJump}
          title="Open the readiness checklist"
          className="flex shrink-0 items-center gap-2 self-start rounded-md px-2 py-2 text-xs hover:bg-slate-50 sm:mb-1 sm:self-end sm:ml-auto"
        >
          <span className="font-medium text-slate-500">Readiness</span>
          <span
            className={`font-semibold tabular-nums ${
              readiness.missing > 0 ? "text-warning" : "text-slate-800"
            }`}
          >
            {readiness.done}/{readiness.total}
          </span>
          <span className="h-1 w-14 overflow-hidden rounded-full bg-slate-200">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.round((readiness.done / readiness.total) * 100)}%` }}
            />
          </span>
          {readiness.flag && (
            <span className="font-semibold text-danger">{readiness.flag}</span>
          )}
        </button>
      )}
    </div>
  );
};

export default BuilderTabBar;
