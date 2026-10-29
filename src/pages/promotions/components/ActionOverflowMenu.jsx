import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

/**
 * Compact secondary actions for a campaign row.
 *
 * <p>Rendered through a portal and positioned against the button's viewport rect: the menu
 * used to be absolutely positioned inside the table cell, and the table wrapper clips at
 * its scroll edge, so a menu opening from the last rows was cut off and overlapped whatever
 * sat above it. A portal escapes every ancestor's overflow. It also opens upward when the
 * button sits in the lower half of the viewport, so it never leaves the screen downward.
 */
const ActionOverflowMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return undefined;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 120;
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensUp = spaceBelow < menuHeight + 12 && rect.top > menuHeight + 12;
    setPosition({
      top: opensUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: Math.max(8, rect.right - 176),
    });
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    // Fixed coordinates go stale the moment the page scrolls; closing beats drifting, a
    // detached menu pointing at nothing is worse than a menu the user reopens.
    const closeOnScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="More campaign actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <MoreHorizontal size={17} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-[110] min-w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
          >
            {items.filter(Boolean).map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); item.onClick(); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-slate-50 ${
                  item.danger ? "text-danger hover:bg-danger-soft" : "text-slate-700"
                }`}
              >
                {item.icon && <item.icon size={14} />}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default ActionOverflowMenu;
