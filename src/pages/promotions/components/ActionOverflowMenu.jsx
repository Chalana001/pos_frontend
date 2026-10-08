import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

/** Compact secondary actions for a campaign row. Destructive actions stay text-labelled. */
const ActionOverflowMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="More campaign actions"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {items.filter(Boolean).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-slate-50 ${
                item.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700"
              }`}
            >
              {item.icon && <item.icon size={14} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionOverflowMenu;
