import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * Collapsible section. The panel content is hidden with CSS rather than unmounted when
 * `keepMounted` is set: sections whose children hold state that must keep existing while
 * collapsed (the codes panel reports its count to the page on every change) would otherwise
 * reset to their initial value the moment the section closed, and the page would act on a
 * stale zero.
 */
const AccordionSection = ({ id, title, hint, badge, open, onToggle, keepMounted = false, children, className = "" }) => (
  <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
    <h2>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/30"
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${open ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
          <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-slate-800">{title}</span>
          {hint && <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{hint}</span>}
        </span>
        {badge && <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{badge}</span>}
      </button>
    </h2>
    {open ? (
      <div id={id} className="border-t border-slate-100 p-5">{children}</div>
    ) : keepMounted ? (
      <div id={id} hidden className="border-t border-slate-100 p-5">{children}</div>
    ) : null}
  </section>
);

export default AccordionSection;
