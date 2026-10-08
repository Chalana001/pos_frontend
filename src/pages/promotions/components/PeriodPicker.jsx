import React from "react";

const PRESETS = [
  { key: "7D", label: "7 days", days: 7 },
  { key: "30D", label: "30 days", days: 30 },
  { key: "90D", label: "90 days", days: 90 },
  { key: "YEAR", label: "This year" },
  { key: "CUSTOM", label: "Custom" },
];

const startOfPreset = (key, now = new Date()) => {
  if (key === "YEAR") return new Date(now.getFullYear(), 0, 1);
  const preset = PRESETS.find((entry) => entry.key === key);
  if (!preset?.days) return null;
  const date = new Date(now);
  date.setDate(date.getDate() - preset.days);
  return date;
};

const isoDate = (date) => date.toISOString().slice(0, 10);

const PeriodPicker = ({ from, to, onChange }) => {
  const today = new Date();
  const activePreset = PRESETS.find((preset) => {
    if (preset.key === "CUSTOM") return false;
    const start = startOfPreset(preset.key, today);
    return start && isoDate(start) === from && isoDate(today) === to;
  })?.key || "CUSTOM";

  const choose = (key) => {
    if (key === "CUSTOM") return;
    const start = startOfPreset(key, today);
    onChange({ from: isoDate(start), to: isoDate(today) });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => choose(preset.key)}
            aria-pressed={activePreset === preset.key}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              activePreset === preset.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="text-xs font-medium text-slate-600">
        From
        <input
          type="date"
          value={from}
          onChange={(event) => onChange({ from: event.target.value, to })}
          className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        To
        <input
          type="date"
          value={to}
          onChange={(event) => onChange({ from, to: event.target.value })}
          className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
};

export default PeriodPicker;
