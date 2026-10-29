import React, { useRef } from "react";

/**
 * One line-art glyph per mechanic, recognition by shape instead of by reading. Stroke uses
 * currentColor so the tokens ride the same slate ramp as the rest of the picker.
 */
const GLYPHS = {
  DISCOUNT: (
    <g>
      <path d="M12 3l6 3v5c0 4.5-2.5 7.7-6 9-3.5-1.3-6-4.5-6-9V6l6-3z" fill="none" />
      <path d="M8.5 12l7 0" />
      <path d="M10 9.5l-1.5 2.5 1.5 2.5" fill="none" />
      <path d="M14 9.5l1.5 2.5-1.5 2.5" fill="none" />
    </g>
  ),
  FIXED_PRICE: (
    <g>
      <path d="M12 3l6 3v5c0 4.5-2.5 7.7-6 9-3.5-1.3-6-4.5-6-9V6l6-3z" fill="none" />
      <path d="M8.5 12h7" />
      <circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </g>
  ),
  BUY_X_GET_Y_FREE: (
    <g>
      <rect x="4" y="9" width="5" height="9" rx="1" fill="none" />
      <rect x="10.5" y="9" width="5" height="9" rx="1" fill="none" />
      <rect x="17" y="9" width="5" height="9" rx="1" strokeDasharray="2.5 2.5" fill="none" />
      <path d="M20.5 5.5l1.2 1.2M21.7 5.5l-1.2 1.2" />
    </g>
  ),
  TIERED: (
    <g>
      <path d="M4 17h4v2H4zM10 12h4v7h-4zM16 7h4v12h-4z" fill="none" />
      <path d="M4 10L12 4l8 6" fill="none" />
    </g>
  ),
  BUNDLE: (
    <g>
      <circle cx="5" cy="13" r="1.8" fill="none" />
      <circle cx="11" cy="13" r="1.8" fill="none" />
      <circle cx="17" cy="13" r="1.8" fill="none" />
      <path d="M3 9.5c2.5-4 6.5-4 9 0s6.5 4 9 0" fill="none" />
      <path d="M8 18h8" />
    </g>
  ),
  CHEAPEST_FREE: (
    <g>
      <rect x="3.5" y="6" width="5.5" height="11" rx="1" fill="none" />
      <rect x="10" y="9" width="5.5" height="8" rx="1" fill="none" />
      <rect x="16.5" y="12" width="5.5" height="5" rx="1" strokeDasharray="2.5 2.5" fill="none" />
    </g>
  ),
  PROFIT_SHARE: (
    <g>
      <circle cx="12" cy="12" r="8" fill="none" />
      <path d="M12 4a8 8 0 0 1 6.5 12.6L12 12V4z" fill="none" />
      <path d="M15.5 16.5l3 3" />
    </g>
  ),
};

const SENTENCES = {
  DISCOUNT: "Take a percentage or a fixed amount off",
  FIXED_PRICE: "Every targeted item sells at one price",
  BUY_X_GET_Y_FREE: "Buy some, get more of the same free",
  TIERED: "The more they buy, the bigger the cut",
  BUNDLE: "Any group of these for one price",
  CHEAPEST_FREE: "Buy a group, the cheapest one is free",
  PROFIT_SHARE: "Give away a share of the margin, never the cost",
};

/**
 * Which mechanic the campaign uses, as a grid of single-line options.
 *
 * <p>Each of these was a tall card with a glyph, a bold label and a hint stacked inside it —
 * seven illustrated tiles wrapping into ragged rows. That grid, sitting under a second grid
 * of four scope cards, is most of why the screen read as assembled rather than designed.
 * The glyph and the label fit on one line at a small size; the hint stays, on the line
 * beneath, at 11px, which is the same information in a third of the height.
 *
 * <p>Behaviour is unchanged and load-bearing: this is a real radiogroup with roving
 * tabindex, so Arrow keys move and select, Home/End jump to the ends.
 */
const MechanicPicker = ({ options, value, onChange, disabled }) => {
  const buttonsRef = useRef([]);

  const focusAt = (index) => {
    const target = buttonsRef.current[index];
    if (target) {
      target.focus();
      if (!disabled) onChange(options[index].key);
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusAt((index + 1) % options.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusAt((index - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAt(options.length - 1);
    }
  };

  return (
    <div role="radiogroup" aria-label="Offer type">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((type, index) => {
          const selected = value === type.key;
          return (
            <button
              key={type.key}
              ref={(node) => { buttonsRef.current[index] = node; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(type.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-l-accent border-y-slate-200 border-r-slate-200 border bg-accent-soft shadow-sm"
                  : "border-y-slate-200 border-r-slate-200 border-l-slate-200 border bg-white hover:bg-slate-50"
              }`}
            >
              <svg
                viewBox="0 0 26 22"
                width="19"
                height="16"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={selected ? "shrink-0 text-accent" : "shrink-0 text-slate-500"}
                aria-hidden="true"
              >
                {GLYPHS[type.key]}
              </svg>
              <span className="min-w-0">
                <span className={`block truncate text-sm ${selected ? "font-semibold text-accent" : "font-medium text-slate-800"}`}>
                  {type.label}
                </span>
                <span className="block truncate text-[11px] text-slate-500">{type.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-1.5 text-xs font-medium text-slate-500">{SENTENCES[value] || ""}</p>
    </div>
  );
};

export default MechanicPicker;
