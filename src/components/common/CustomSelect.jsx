// components/common/CustomSelect.js
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

const CustomSelect = ({ value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Click Outside Hook
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-200 ${disabled ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-70" : "border-slate-300 hover:border-blue-400"
          }`}
      >
        <span className={`text-sm truncate ${selectedOption ? "text-slate-700 font-medium" : "text-slate-400"}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-lg z-40 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-slate-500 text-center">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = String(option.id) === String(value);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(String(option.id))}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors hover:bg-slate-50 ${isSelected ? "bg-blue-50/50 text-blue-700 font-bold" : "text-slate-700 font-medium"
                    }`}
                >
                  <span className="truncate">{option.name}</span>
                  {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
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