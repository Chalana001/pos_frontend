import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseDateValue = (value) => {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
};

const toDateValue = (date) => format(date, "yyyy-MM-dd");

const DatePicker = ({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  min,
  max,
  className = "",
  buttonClassName = "",
}) => {
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const minDate = useMemo(() => parseDateValue(min), [min]);
  const maxDate = useMemo(() => parseDateValue(max), [max]);
  const [visibleMonth, setVisibleMonth] = useState(selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideTrigger = wrapperRef.current?.contains(event.target);
      const clickedInsideMenu = menuRef.current?.contains(event.target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updateMenuStyle = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, 280),
        zIndex: 1100,
      });
    };

    updateMenuStyle();
    window.addEventListener("resize", updateMenuStyle);
    window.addEventListener("scroll", updateMenuStyle, true);

    return () => {
      window.removeEventListener("resize", updateMenuStyle);
      window.removeEventListener("scroll", updateMenuStyle, true);
    };
  }, [isOpen]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth));
    const end = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const isDateDisabled = (date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  const handleSelect = (date) => {
    if (isDateDisabled(date)) return;
    onChange?.(toDateValue(date));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.("");
    setIsOpen(false);
  };

  const displayLabel = selectedDate ? format(selectedDate, "dd MMM yyyy") : placeholder;

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-400" : "hover:border-blue-400"
        } ${buttonClassName}`}
      >
        <span className={`truncate ${selectedDate ? "text-slate-700" : "text-slate-400"}`}>{displayLabel}</span>
        <CalendarDays size={16} className="ml-2 shrink-0 text-slate-400" />
      </button>

      {isOpen && !disabled && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-sm font-semibold text-slate-800">{format(visibleMonth, "MMMM yyyy")}</div>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
                {DAY_LABELS.map((label) => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {days.map((date) => {
                  const selected = selectedDate && isSameDay(date, selectedDate);
                  const outsideMonth = !isSameMonth(date, visibleMonth);
                  const todayFlag = isToday(date);
                  const disabledDate = isDateDisabled(date);

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={disabledDate}
                      onClick={() => handleSelect(date)}
                      className={`h-9 rounded-xl text-sm font-medium transition ${
                        selected
                          ? "bg-blue-600 text-white shadow-sm"
                          : outsideMonth
                            ? "text-slate-300 hover:bg-slate-50"
                            : todayFlag
                              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                              : "text-slate-700 hover:bg-slate-100"
                      } ${disabledDate ? "cursor-not-allowed opacity-35" : ""}`}
                    >
                      {format(date, "d")}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect(new Date())}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Today
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default DatePicker;
