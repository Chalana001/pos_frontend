import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  addYears,
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
  setMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const VIEWPORT_GAP = 8;
const TRIGGER_GAP = 6;
const MIN_CALENDAR_WIDTH = 280;
const DEFAULT_YEAR_SPAN = 10;

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
  const positionFrameRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [menuLayout, setMenuLayout] = useState({ placement: "bottom", maxHeight: null, needsScroll: false });
  const [showMonthYear, setShowMonthYear] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);

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

  // A year menu inside the calendar is still part of the picker, so the picker's own
  // outside click is not enough. Close it on any unrelated press as well.
  useEffect(() => {
    if (!yearMenuOpen) return undefined;
    const closeYearMenu = (event) => {
      if (event.target?.closest?.('[data-year-menu]')) return;
      setYearMenuOpen(false);
    };
    document.addEventListener("mousedown", closeYearMenu);
    return () => document.removeEventListener("mousedown", closeYearMenu);
  }, [yearMenuOpen]);

  // A fixed popup still needs its own collision handling: a short window, a tablet in
  // landscape, or a date field near the bottom of a panel can leave the calendar hanging
  // outside the viewport where neither the page nor the panel can scroll far enough to
  // reach it. Prefer below, flip above when there is more room there, and let the calendar
  // scroll internally only when neither side can fit it.
  const positionMenu = useCallback(() => {
    const anchor = wrapperRef.current?.getBoundingClientRect();
    if (!anchor) return;

    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const roomBelow = Math.max(0, viewportHeight - anchor.bottom - TRIGGER_GAP - VIEWPORT_GAP);
    const roomAbove = Math.max(0, anchor.top - TRIGGER_GAP - VIEWPORT_GAP);
    const measuredHeight = menuRef.current?.scrollHeight || menuRef.current?.getBoundingClientRect().height || 0;
    const fullHeight = measuredHeight > 0 ? measuredHeight : 347;
    const openAbove = roomBelow < fullHeight && roomAbove > roomBelow;
    const availableHeight = openAbove ? roomAbove : roomBelow;
    const maxHeight = availableHeight >= fullHeight
      ? null
      : Math.max(1, Math.min(availableHeight, fullHeight, viewportHeight - VIEWPORT_GAP * 2));
    const needsScroll = maxHeight !== null && fullHeight > maxHeight;

    const width = Math.min(
      Math.max(anchor.width, MIN_CALENDAR_WIDTH),
      Math.max(MIN_CALENDAR_WIDTH, viewportWidth - VIEWPORT_GAP * 2)
    );
    const left = Math.max(
      VIEWPORT_GAP,
      Math.min(anchor.left, viewportWidth - width - VIEWPORT_GAP)
    );
    const top = openAbove
      ? Math.max(VIEWPORT_GAP, anchor.top - TRIGGER_GAP - Math.min(fullHeight, maxHeight ?? fullHeight))
      : anchor.bottom + TRIGGER_GAP;

    const nextStyle = {
      position: "fixed",
      left,
      top,
      width,
      maxHeight: maxHeight ?? undefined,
      zIndex: 1100,
    };
    const nextLayout = {
      placement: openAbove ? "top" : "bottom",
      maxHeight,
      needsScroll,
    };

    setMenuStyle((current) => current
      && current.left === nextStyle.left
      && current.top === nextStyle.top
      && current.width === nextStyle.width
      && current.maxHeight === nextStyle.maxHeight
      ? current
      : nextStyle);
    setMenuLayout((current) => current.placement === nextLayout.placement
      && current.maxHeight === nextLayout.maxHeight
      && current.needsScroll === nextLayout.needsScroll
      ? current
      : nextLayout);
  }, []);

  const updateMenuStyle = useCallback(() => {
    if (positionFrameRef.current !== null) {
      cancelAnimationFrame(positionFrameRef.current);
    }

    positionFrameRef.current = requestAnimationFrame(() => {
      positionFrameRef.current = null;
      positionMenu();
    });
  }, [positionMenu]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updateMenuStyle();
    window.addEventListener("resize", updateMenuStyle);
    window.addEventListener("scroll", updateMenuStyle, true);

    return () => {
      window.removeEventListener("resize", updateMenuStyle);
      window.removeEventListener("scroll", updateMenuStyle, true);
      if (positionFrameRef.current !== null) {
        cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [isOpen, updateMenuStyle]);

  // The first calculation runs before the portal exists. Measure once after it mounts,
  // and again when the month/year panel changes the calendar's height. Do not depend on
  // menuStyle itself: every placement writes that state, which would schedule another
  // measurement forever and prevent the popup from ever appearing.
  useEffect(() => {
    if (!isOpen) return undefined;
    const frame = requestAnimationFrame(() => positionMenu());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, showMonthYear, positionMenu]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth));
    const end = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = visibleMonth.getFullYear();
    const selectedYear = selectedDate?.getFullYear();
    const minYear = minDate?.getFullYear();
    const maxYear = maxDate?.getFullYear();
    const lowerBound = Math.min(
      currentYear - DEFAULT_YEAR_SPAN,
      selectedYear ?? currentYear,
      minYear ?? currentYear
    );
    const upperBound = Math.max(
      currentYear + DEFAULT_YEAR_SPAN,
      selectedYear ?? currentYear,
      maxYear ?? currentYear
    );
    return Array.from({ length: upperBound - lowerBound + 1 }, (_, index) => lowerBound + index);
  }, [minDate, selectedDate, visibleMonth, maxDate]);

  const selectVisibleMonth = (monthIndex) => {
    setVisibleMonth((current) => setMonth(current, monthIndex));
    setShowMonthYear(false);
  };

  const selectVisibleYear = (year) => {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setFullYear(year);
      return next;
    });
    setYearMenuOpen(false);
  };

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
        onClick={() => {
          setMenuStyle(null);
          setMenuLayout({ placement: "bottom", maxHeight: null, needsScroll: false });
          setShowMonthYear(false);
          setIsOpen((open) => !open);
        }}
        className={`flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent ${
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-600" : "hover:border-border-strong"
        } ${buttonClassName}`}
      >
        <span className={`truncate ${selectedDate ? "text-slate-700" : "text-slate-600"}`}>{displayLabel}</span>
        <CalendarDays size={16} className="ml-2 shrink-0 text-slate-600" />
      </button>

      {isOpen && !disabled && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className="custom-scrollbar overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
              data-placement={menuLayout.placement}
              data-scrollable={menuLayout.needsScroll ? "true" : "false"}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
                  aria-label="Previous month"
                  disabled={showMonthYear}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMonthYear((open) => !open)}
                  aria-label="Choose month and year"
                  aria-expanded={showMonthYear}
                  className="inline-flex min-w-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  <span className="truncate">{format(visibleMonth, "MMMM yyyy")}</span>
                  <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${showMonthYear ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                  aria-label="Next month"
                  disabled={showMonthYear}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {showMonthYear ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                    <button
                      type="button"
                      onClick={() => setVisibleMonth((current) => subYears(current, 1))}
                      aria-label="Previous year"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-700"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="relative min-w-0 flex-1" data-year-menu>
                      <button
                        type="button"
                        aria-label="Choose year"
                        aria-expanded={yearMenuOpen}
                        onClick={() => setYearMenuOpen((open) => !open)}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <span>{visibleMonth.getFullYear()}</span>
                        <ChevronDown size={13} className={`text-slate-500 transition-transform ${yearMenuOpen ? "rotate-180" : ""}`} />
                      </button>
                      {yearMenuOpen && (
                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl custom-scrollbar">
                          {yearOptions.map((year) => {
                            const isSelectedYear = year === visibleMonth.getFullYear();
                            return (
                              <button
                                key={year}
                                type="button"
                                onClick={() => selectVisibleYear(year)}
                                aria-label={`Select year ${year}`}
                                className={`flex h-8 w-full items-center justify-center text-xs font-semibold transition ${
                                  isSelectedYear
                                    ? "bg-accent-soft text-accent"
                                    : "text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {year}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisibleMonth((current) => addYears(current, 1))}
                      aria-label="Next year"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-700"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_LABELS.map((label, monthIndex) => {
                      const isCurrent = visibleMonth.getMonth() === monthIndex;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => selectVisibleMonth(monthIndex)}
                          className={`h-9 rounded-xl text-xs font-semibold transition ${
                            isCurrent
                              ? "bg-accent text-white shadow-sm"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-slate-600">
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
                              ? "bg-accent text-white shadow-sm"
                              : outsideMonth
                                ? "text-slate-600 hover:bg-slate-50"
                                : todayFlag
                                  ? "bg-accent-soft text-accent hover:bg-slate-100"
                                  : "text-slate-700 hover:bg-slate-100"
                          } ${disabledDate ? "cursor-not-allowed opacity-35" : ""}`}
                        >
                          {format(date, "d")}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

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
