import React from "react";

/** Sets presets that only write the existing fields; nothing here is new semantics. */
const datePresets = (key, now = new Date()) => {
  let start = new Date(now);
  let end = new Date(now);
  if (key === "WEEKEND") {
    start.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 1);
    end.setHours(23, 59, 0, 0);
  } else if (key === "NEXT_7") {
    end.setDate(now.getDate() + 7);
  } else if (key === "MONTH") {
    // Whole calendar months, not "+1 month" (setMonth(1, 31) rolls into March).
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0, 0);
  } else if (key === "HAPPY_HOUR") {
    start.setDate(now.getDate() + 1);
    start.setHours(12, 0, 0, 0);
    end.setTime(start.getTime());
    end.setHours(14, 0, 0, 0);
  } else if (key === "OVERNIGHT") {
    start.setDate(now.getDate() + 1);
    start.setHours(22, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 1);
    end.setHours(2, 0, 0, 0);
  } else {
    return null;
  }
  const pad = (value) => String(value).padStart(2, "0");
  const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return { startAt: iso(start), endAt: iso(end) };
};

const ScheduleComposer = ({ startAt, endAt, daysOfWeek, startTime, endTime, onChange }) => {
  // 0 and 127 both mean "every day": 0 is the stored form (blank means all), 127 is the
  // form the toggle chips produce. Both must read as All so the chips agree with the text.
  const everyDay = daysOfWeek === 0 || daysOfWeek === 127;
  const weekdays = daysOfWeek === 31;
  const weekend = daysOfWeek === 96;

  const toggleDay = (bit) => {
    let next = daysOfWeek === 0 ? 127 : daysOfWeek;
    next ^= bit;
    onChange({ daysOfWeek: next === 127 ? 0 : next });
  };

  const applyPreset = (key) => {
    const range = datePresets(key);
    if (key === "HAPPY_HOUR") onChange({ ...range, startTime: "12:00", endTime: "14:00" });
    else if (key === "OVERNIGHT") onChange({ ...range, startTime: "22:00", endTime: "02:00" });
    else onChange(range);
  };

  return (
    <div className="space-y-5">
      <div>
        <span className="text-sm font-medium text-slate-700">Presets</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { key: "WEEKEND", label: "This weekend" },
            { key: "NEXT_7", label: "Next 7 days" },
            { key: "MONTH", label: "Whole month" },
            { key: "HAPPY_HOUR", label: "Happy hour 12–2" },
            { key: "OVERNIGHT", label: "Overnight 22–02" },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyPreset(preset.key)}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-medium text-slate-700">Starts</span>
          <input
            type="datetime-local" value={startAt}
            onChange={(event) => onChange({ startAt: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Ends</span>
          <input
            type="datetime-local" value={endAt}
            onChange={(event) => onChange({ endAt: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
        <div>
          <span className="text-sm font-medium text-slate-700">Days</span>
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              { bit: 1, label: "Mon" }, { bit: 2, label: "Tue" }, { bit: 4, label: "Wed" }, { bit: 8, label: "Thu" },
              { bit: 16, label: "Fri" }, { bit: 32, label: "Sat" }, { bit: 64, label: "Sun" },
            ].map((day) => {
              const on = (daysOfWeek & day.bit) !== 0;
              return (
                <button
                  key={day.bit}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(day.bit)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                    on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ daysOfWeek: everyDay ? 0 : 127 })}
              className={`rounded-full px-3 py-1 text-xs font-bold ${everyDay ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onChange({ daysOfWeek: weekdays ? 0 : 31 })}
              className={`rounded-full px-3 py-1 text-xs font-bold ${weekdays ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}
            >
              Weekdays
            </button>
            <button
              type="button"
              onClick={() => onChange({ daysOfWeek: weekend ? 0 : 96 })}
              className={`rounded-full px-3 py-1 text-xs font-bold ${weekend ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}
            >
              Weekends
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {daysOfWeek === 0 ? "Every day within the dates." : "Only on the selected days."}
          </p>
        </div>
        <label>
          <span className="text-sm font-medium text-slate-700">From time</span>
          <input
            type="time" value={startTime}
            onChange={(event) => onChange({ startTime: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">To time</span>
          <input
            type="time" value={endTime}
            onChange={(event) => onChange({ endTime: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Leave the times empty for all day. An end before the start runs overnight 22:00 to 02:00.
      </p>
    </div>
  );
};

export default ScheduleComposer;
