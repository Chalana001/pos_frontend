import React from "react";
import { Package, Layers, Receipt, Users } from "lucide-react";

/**
 * Cards rather than a dropdown: the choice reshapes the whole rest of the form, and a
 * one-line description each is what stops someone picking Category when they meant Item.
 */
const SCOPES = [
  { key: "ITEM", label: "Items", icon: Package, hint: "Chosen items, each at its own price" },
  { key: "CATEGORY", label: "Category", icon: Layers, hint: "Everything in a category" },
  { key: "BILL", label: "Bill total", icon: Receipt, hint: "Any bill over an amount" },
  { key: "CUSTOMER", label: "Customer", icon: Users, hint: "Named customers only" },
];

const ScopePicker = ({ value, onChange, disabled }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {SCOPES.map(({ key, label, icon: Icon, hint }) => {
      const selected = value === key;
      return (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(key)}
          aria-pressed={selected}
          className={`rounded-xl border p-4 text-left transition ${
            selected
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
              : "border-slate-200 bg-white hover:border-slate-300"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <Icon size={18} className={selected ? "text-blue-600" : "text-slate-400"} />
          <div className={`mt-2 text-sm font-bold ${selected ? "text-blue-700" : "text-slate-800"}`}>{label}</div>
          <div className="mt-0.5 text-xs text-slate-500">{hint}</div>
        </button>
      );
    })}
  </div>
);

export default ScopePicker;
