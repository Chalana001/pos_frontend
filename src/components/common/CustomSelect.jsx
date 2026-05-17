import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

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

const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  disabled = false,
  valueKey = "id",
  labelKey = "name",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  optionClassName = "",
  emptyMessage = "No options available",
  menuPlacement = "bottom",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideTrigger = dropdownRef.current?.contains(event.target);
      const clickedInsideMenu = menuRef.current?.contains(event.target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updateMenuStyle = () => {
      const rect = dropdownRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: menuPlacement === "top" ? rect.top - 4 : rect.bottom + 4,
        width: rect.width,
        zIndex: 1000,
        transform: menuPlacement === "top" ? "translateY(-100%)" : "none",
      });
    };

    updateMenuStyle();
    window.addEventListener("resize", updateMenuStyle);
    window.addEventListener("scroll", updateMenuStyle, true);

    return () => {
      window.removeEventListener("resize", updateMenuStyle);
      window.removeEventListener("scroll", updateMenuStyle, true);
    };
  }, [isOpen, menuPlacement]);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full overflow-visible ${className}`} ref={dropdownRef} data-no-auto-translate="true">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-2.5 py-2 text-left shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
            : "border-slate-300 hover:border-blue-400"
        } ${buttonClassName}`}
      >
        <span className={`truncate text-xs ${selectedOption ? "font-medium text-slate-700" : "text-slate-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && !disabled && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className={`custom-select-menu max-h-60 overflow-y-auto rounded-lg border border-slate-100 bg-white py-1 shadow-lg ${menuClassName}`}
            >
              {normalizedOptions.length === 0 ? (
                <div className="px-3 py-2 text-center text-xs text-slate-500">{emptyMessage}</div>
              ) : (
                normalizedOptions.map((option) => {
                  const isSelected = String(option.value) === String(value ?? "");
                  return (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`custom-select-option flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                        isSelected ? "bg-blue-50/50 font-bold text-blue-700" : "font-medium text-slate-700"
                      } ${optionClassName}`}
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

export default CustomSelect;
