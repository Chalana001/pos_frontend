import React from 'react';

/**
 * A two-way switch in the header's 44px chrome: two options side by side and
 * a knob that slides to whichever is on. Used for Light/Dark and English/
 * Sinhala, where a dropdown for two values was two clicks for one decision.
 *
 * `options` is exactly two entries of { value, label?, icon?, title }. The
 * knob wears the active option's icon or label; the inactive one shows
 * dimmed beside it so both sides are always visible.
 */
const PillToggle = ({ value, options, onChange, ariaLabel, className = '' }) => {
  const [first, second] = options;
  const activeIndex = value === second.value ? 1 : 0;

  const renderFace = (option, active) => {
    const Icon = option.icon;
    return (
      <span
        className={`flex h-9 w-9 items-center justify-center text-xs font-bold transition-colors ${
          active ? 'text-slate-50' : 'text-slate-400'
        }`}
        aria-hidden="true"
      >
        {Icon ? <Icon size={16} /> : option.label}
      </span>
    );
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activeIndex === 1}
      aria-label={ariaLabel}
      // Static on purpose: the DOM translation layer records an element's
      // first title and restores it, so a title that follows the active
      // option ends up one flip behind.
      title={ariaLabel}
      onClick={() => onChange(options[activeIndex === 0 ? 1 : 0].value)}
      className={`shell-panel-hover relative inline-flex h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition hover:bg-slate-50 ${className}`}
    >
      <span
        className="absolute left-1 top-1 h-9 w-9 rounded-lg bg-slate-800 shadow-sm transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${activeIndex * 36}px)` }}
        aria-hidden="true"
      />
      <span className="relative z-10 flex">
        {renderFace(first, activeIndex === 0)}
        {renderFace(second, activeIndex === 1)}
      </span>
    </button>
  );
};

export default PillToggle;
