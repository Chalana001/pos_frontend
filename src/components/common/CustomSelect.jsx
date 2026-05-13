import React, { useEffect, useMemo, useRef, useState } from "react";
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef} data-no-auto-translate="true">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
            : "border-slate-300 hover:border-blue-400"
        } ${buttonClassName}`}
      >
        <span className={`truncate text-sm ${selectedOption ? "font-medium text-slate-700" : "text-slate-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={`custom-select-menu absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg ${menuClassName}`}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-4 py-2 text-center text-sm text-slate-500">{emptyMessage}</div>
          ) : (
            normalizedOptions.map((option) => {
              const isSelected = String(option.value) === String(value ?? "");
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`custom-select-option flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                    isSelected ? "bg-blue-50/50 font-bold text-blue-700" : "font-medium text-slate-700"
                  } ${optionClassName}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check size={16} className="shrink-0 text-blue-600" /> : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
