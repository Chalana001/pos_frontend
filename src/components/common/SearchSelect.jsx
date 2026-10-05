import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2 } from "lucide-react";

const getOptionValue = (option, valueKey) => {
  if (option == null) return "";
  if (typeof option !== "object") return option;
  return option[valueKey] ?? option.value;
};

const getOptionLabel = (option, labelKey) => {
  if (option == null) return "";
  if (typeof option !== "object") return option;
  return option[labelKey] ?? option.label;
};

/**
 * A select whose own field is the search box.
 *
 * <p>`CustomSelect` opens a menu and, when asked to, puts a second input inside it. That is the
 * wrong shape for a long list: the operator opens, then has to move to another box to type.
 * Here the field itself takes the text. Clicking it takes the click over and selects whatever
 * is in it, so the first keystroke starts a fresh search and Backspace cuts the old name away
 * one character at a time; the list filters as they type.
 *
 * <p>The supplier that is still selected stays visible while a replacement is being searched
 * for, two ways: its row keeps the blue tick in the list, and a small caption under the field
 * names it, because a filtered list can hide it completely ("sil" hides "Perera").
 *
 * <p>Filtering happens in the browser over the options the caller passes, deliberately: the
 * whole list has already been fetched, and asking the server once per keystroke would multiply
 * traffic on a till for no gain.
 */
const SearchSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  searchPlaceholder = "",
  disabled = false,
  valueKey = "id",
  labelKey = "name",
  className = "",
  inputClassName = "",
  menuClassName = "",
  optionClassName = "",
  emptyMessage = "No options available",
  noResultsMessage = "No matches found",
  loading = false,
  loadingMessage = "Loading…",
  menuPlacement = "bottom",
  menuMinWidth = 0,
  searchKeys = null,
  selectedHintLabel = "Selected",
  onOpen,
  inputId,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const positionFrameRef = useRef(null);

  // Mirrors `isOpen` for the mouse handlers. Both the focus and the mousedown that a single
  // click produces run before React has committed the state change, and without this the
  // click would open the menu twice and make the caller refresh its list twice for one click.
  const isOpenRef = useRef(false);

  const normalizedOptions = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((option) => ({
        raw: option,
        value: String(getOptionValue(option, valueKey) ?? ""),
        label: String(getOptionLabel(option, labelKey) ?? ""),
      })),
    [labelKey, options, valueKey]
  );

  const selectedOption = normalizedOptions.find((option) => String(option.value) === String(value ?? ""));
  const selectedLabel = selectedOption ? selectedOption.label : "";

  // The committed name is not a search term. Opening the field leaves it selected so the next
  // keystroke replaces it; until that happens the operator is browsing, not searching, so the
  // list has to show everything rather than the one row that matches its own name.
  const isSearching = query !== selectedLabel;

  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !isSearching) return normalizedOptions;

    const keys = Array.isArray(searchKeys) && searchKeys.length > 0 ? searchKeys : [labelKey];

    return normalizedOptions.filter((option) => {
      if (option.label.toLowerCase().includes(term)) return true;

      const source = option.raw;
      if (source === null || source === undefined || typeof source !== "object") return false;

      return keys.some((key) => String(source[key] ?? "").toLowerCase().includes(term));
    });
  }, [isSearching, labelKey, normalizedOptions, query, searchKeys]);

  const safeActiveIndex = visibleOptions.length === 0
    ? 0
    : Math.min(activeIndex, visibleOptions.length - 1);

  const openMenu = () => {
    if (disabled || isOpenRef.current) return false;

    isOpenRef.current = true;
    setQuery(selectedLabel);
    // Start on the row that is already chosen, so opening the field shows it instead of the
    // top of a list of hundreds, and Enter without an arrow key changes nothing.
    setActiveIndex(Math.max(0, normalizedOptions.findIndex((option) => option.value === String(value ?? ""))));
    setIsOpen(true);
    // The caller's chance to re-read what it passes in: a supplier added from another till
    // since this page was loaded only exists in a fresh answer.
    onOpen?.();
    return true;
  };

  // `selectedLabel` is a dependency rather than a closure over the first render: the
  // click-outside listener below is registered with this function, and it has to put back the
  // name that is selected *now*, not the one that was selected when the page mounted.
  const closeMenu = useCallback(() => {
    isOpenRef.current = false;
    setIsOpen(false);
    // Back to naming what is still selected. A half-typed search left in the field would read
    // as a chosen supplier that was never chosen.
    setQuery(selectedLabel);
  }, [selectedLabel]);

  // A click on the field is taken over rather than left to the browser: the browser drops the
  // caret where the pointer landed, which throws away the selection that makes "click and type"
  // replace the old name.
  const openAndSelectName = () => {
    if (!openMenu()) return;
    inputRef.current?.select();
  };

  const handleMouseDown = (event) => {
    if (disabled || isOpenRef.current) return;

    event.preventDefault();
    inputRef.current?.focus();
    openAndSelectName();
  };

  // Reached by Tab, and by the focus() the click handler above performs. Opening here as well
  // means a keyboard user gets the list without pressing ArrowDown first; `openMenu` refuses a
  // second open, so a click that does both does not fire the caller's refresh twice.
  const handleFocus = () => {
    openAndSelectName();
  };

  // Tab away must not leave an open list floating over a field nobody is looking at. Rows are
  // picked on mousedown with the default prevented, so they never take focus and never reach
  // this; a menu left open by a pick or by Escape is already flagged closed and is skipped.
  const handleBlur = (event) => {
    if (!isOpenRef.current) return;
    if (event.relatedTarget && menuRef.current?.contains(event.relatedTarget)) return;
    closeMenu();
  };

  const handleSelect = (option) => {
    if (!option) return;

    onChange?.(option.value);
    isOpenRef.current = false;
    setIsOpen(false);
    setQuery(option.label);
    setActiveIndex(0);
    // Hand focus back. A scan arriving just after a keyboard pick would otherwise type into
    // this field, reopen the list, and its trailing Enter would change the supplier silently.
    inputRef.current?.blur();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpenRef.current) {
        openMenu();
        return;
      }
      setActiveIndex((current) => {
        const last = Math.max(0, visibleOptions.length - 1);
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return Math.max(0, Math.min(next, last));
      });
      return;
    }

    if (event.key === "Enter") {
      // Never let Enter reach a surrounding form. This field is a picker, and a half-typed
      // search that matches nothing must not turn into a submit.
      event.preventDefault();
      if (isOpenRef.current && visibleOptions.length > 0) {
        handleSelect(visibleOptions[safeActiveIndex]);
      }
      return;
    }

    if (event.key === "Escape" && isOpenRef.current) {
      event.preventDefault();
      closeMenu();
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideField = containerRef.current?.contains(event.target);
      const clickedInsideMenu = menuRef.current?.contains(event.target);
      if (!clickedInsideField && !clickedInsideMenu) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeMenu]);

  // The list is portalled and pinned to the field's own rectangle, so a long name cannot be
  // clipped by whatever card the field sits inside.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updateMenuStyle = () => {
      if (positionFrameRef.current !== null) return;
      positionFrameRef.current = requestAnimationFrame(() => {
        positionFrameRef.current = null;
        const rect = inputRef.current?.getBoundingClientRect();
        if (!rect) return;
        const nextStyle = {
          position: "fixed",
          left: rect.left,
          top: menuPlacement === "top" ? rect.top - 4 : rect.bottom + 4,
          width: rect.width,
          minWidth: menuMinWidth || undefined,
          zIndex: 1000,
          transform: menuPlacement === "top" ? "translateY(-100%)" : "none",
        };
        setMenuStyle((current) => current
          && current.left === nextStyle.left
          && current.top === nextStyle.top
          && current.width === nextStyle.width
          && current.minWidth === nextStyle.minWidth
          && current.transform === nextStyle.transform
          ? current
          : nextStyle);
      });
    };

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
  }, [isOpen, menuMinWidth, menuPlacement]);

  // Arrow keys must not walk the highlight off the bottom of a scrolling menu.
  useEffect(() => {
    if (!isOpen) return;
    const activeRow = menuRef.current?.querySelector('[data-active="true"]');
    activeRow?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen, query]);

  const handleInputChange = (event) => {
    setQuery(event.target.value);
    setActiveIndex(0);
  };

  return (
    <div className={`relative ${className || "w-full"}`} ref={containerRef} data-no-auto-translate="true">
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          disabled={disabled}
          autoComplete="off"
          // Closed, the field names what is chosen. Open, it holds the search text, which
          // starts life as that same name so the first keystroke replaces it.
          value={isOpen ? query : selectedLabel}
          placeholder={isOpen && searchPlaceholder ? searchPlaceholder : placeholder}
          onChange={handleInputChange}
          onMouseDown={handleMouseDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-lg border border-slate-300 bg-white py-2 pl-2.5 pr-7 text-xs font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:opacity-70 ${inputClassName}`}
        />
        <ChevronDown
          size={14}
          className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className={`custom-select-menu max-h-60 overflow-y-auto rounded-lg border border-slate-100 bg-white py-1 shadow-lg ${menuClassName}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-500">
                  <Loader2 size={13} className="animate-spin" />
                  <span>{loadingMessage}</span>
                </div>
              ) : null}

              {/* The supplier that is still chosen, pinned above the results. It lives inside
                  the menu, not under the field: the menu is drawn exactly where a line under
                  the field would be, so there it was hidden, and a filtered list can drop the
                  chosen row out of view entirely ("sil" hides "Perera"). */}
              {selectedHintLabel && selectedLabel && isSearching ? (
                <div className="sticky top-0 z-10 -mt-1 flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2 text-xs text-slate-500">
                  <span className="truncate">
                    {selectedHintLabel}: <span className="font-semibold text-slate-600">{selectedLabel}</span>
                  </span>
                  <Check size={13} className="shrink-0 text-blue-600" />
                </div>
              ) : null}

              {visibleOptions.length === 0 && !loading ? (
                <div className="px-3 py-2 text-center text-xs text-slate-500">
                  {isSearching && query.trim() ? noResultsMessage : emptyMessage}
                </div>
              ) : (
                visibleOptions.map((option, index) => {
                  const isSelected = option.value === String(value ?? "");
                  const isActive = index === safeActiveIndex;
                  return (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      // Out of the tab order on purpose: Tab must leave the field (and close
                      // the list with it), the arrow keys are what walk the rows.
                      tabIndex={-1}
                      data-active={isActive ? "true" : "false"}
                      // Hover moves the same highlight the arrow keys move, so Enter picks
                      // the row under the pointer rather than a different one.
                      onMouseEnter={() => setActiveIndex(index)}
                      // Picked on mousedown, not on click: taking the focus is what would
                      // unmount this row before a click could land on it.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelect(option);
                      }}
                      className={`custom-select-option flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                        isSelected ? "bg-blue-50/50 font-bold text-blue-700" : "font-medium text-slate-700"
                      } ${isActive && !isSelected ? "bg-slate-100" : ""} ${optionClassName}`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? <Check size={14} className="shrink-0 text-blue-600" /> : null}
                    </button>
                  );
                })
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default SearchSelect;
