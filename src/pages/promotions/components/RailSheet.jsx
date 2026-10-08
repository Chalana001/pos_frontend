import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * The readiness rail as a bottom sheet, below lg. Same dialog contract as the house Modal:
 * Escape closes, focus moves in and is trapped until close, and returns to the opener.
 */
const RailSheet = ({ onClose, children }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Tab") {
        const focusable = panelRef.current
          ? Array.from(panelRef.current.querySelectorAll("button:not([disabled]), input:not([disabled])"))
          : [];
        if (focusable.length === 0) {
          event.preventDefault();
          panelRef.current?.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] lg:hidden" role="dialog" aria-modal="true" aria-label="Readiness and exposure">
      <button type="button" aria-label="Close readiness panel" className="absolute inset-0 bg-slate-950/30" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="custom-scrollbar absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-6 shadow-2xl focus:outline-none"
      >
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close readiness panel" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default RailSheet;
