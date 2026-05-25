import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * AccordionSection
 * - Collapsible section (open/close)
 * - Header with title + optional subtitle
 * - Optional badge (ex: 1 Image, 0/3)
 * - Chevron icon rotates when open
 */
export default function BulkItemForm({
  title,
  subtitle,
  badge,
  isOpen,
  onToggle,
  children,
  className = "",
}) {
  return (
    <div className={`shell-panel shell-panel-hover rounded-xl border ${isOpen ? "overflow-visible" : "overflow-hidden"} ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-gray-50"
      >
        <div className="text-left">
          <div className="font-semibold text-gray-900">{title}</div>
          {subtitle ? (
            <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {/* Badge */}
          {badge ? (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              {badge}
            </span>
          ) : null}

          {/* Chevron */}
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Content */}
      {isOpen ? (
        <div className="page-section-enter border-t bg-white px-4 py-4">{children}</div>
      ) : null}
    </div>
  );
}
