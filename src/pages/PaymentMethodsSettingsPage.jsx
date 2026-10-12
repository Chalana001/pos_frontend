import React, { useEffect, useState } from "react";
import { Pencil, Plus, Power } from "lucide-react";
import { toast } from "react-hot-toast";

import { paymentMethodsAPI } from "../api/paymentMethods.api";
import { resolvePaymentIcon, PAYMENT_ICON_OPTIONS } from "../utils/paymentMethodIcons";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ResizableSplit from "../components/common/ResizableSplit";

const CATEGORIES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MOBILE_DIGITAL", label: "Mobile / Digital" },
  { value: "CREDIT", label: "Credit / Deferred" },
  { value: "OTHER", label: "Other Non-Cash" },
];

const REFERENCE_POLICIES = [
  { value: "NONE", label: "No reference number" },
  { value: "OPTIONAL", label: "Reference optional" },
  { value: "REQUIRED", label: "Reference required" },
];

const INITIAL_FORM = {
  id: null,
  code: "",
  displayName: "",
  category: "CASH",
  referencePolicy: "NONE",
  referenceLabel: "",
  includeInExpectedCash: true,
  allowsCredit: false,
  iconKey: "",
  active: true,
};

const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label || value;

const PaymentMethodsSettingsPage = () => {
  const [methods, setMethods] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      setLoading(true);
      const response = await paymentMethodsAPI.list();
      setMethods(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load payment methods", error);
      toast.error("Failed to load payment methods");
      setMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(INITIAL_FORM);

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (form.referencePolicy !== "NONE" && !form.referenceLabel.trim()) {
      toast.error("A reference label is needed when a reference is optional or required");
      return;
    }

    const payload = {
      code: form.code.trim() || undefined,
      displayName: form.displayName.trim(),
      category: form.category,
      referencePolicy: form.referencePolicy,
      referenceLabel: form.referencePolicy !== "NONE" ? form.referenceLabel.trim() : null,
      includeInExpectedCash: form.includeInExpectedCash,
      allowsCredit: form.allowsCredit,
      iconKey: form.iconKey || null,
      active: form.active,
    };

    try {
      setSaving(true);
      if (form.id) {
        await paymentMethodsAPI.update(form.id, payload);
        toast.success("Payment method updated");
      } else {
        await paymentMethodsAPI.create(payload);
        toast.success("Payment method added");
      }
      await loadMethods();
      resetForm();
    } catch (error) {
      console.error("Failed to save payment method", error);
      toast.error(error?.response?.data?.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (method) => {
    setForm({
      id: method.id,
      code: method.code || "",
      displayName: method.displayName || "",
      category: method.category || "CASH",
      referencePolicy: method.referencePolicy || "NONE",
      referenceLabel: method.referenceLabel || "",
      includeInExpectedCash: method.includeInExpectedCash === true,
      allowsCredit: method.allowsCredit === true,
      iconKey: method.iconKey || "",
      active: method.active !== false,
    });
  };

  const handleToggleActive = async (method) => {
    try {
      setTogglingId(method.id);
      await paymentMethodsAPI.setActive(method.id, !method.active);
      toast.success(method.active ? `${method.displayName} deactivated` : `${method.displayName} activated`);
      await loadMethods();
    } catch (error) {
      console.error("Failed to change payment method status", error);
      toast.error(error?.response?.data?.message || "Failed to change status");
    } finally {
      setTogglingId(null);
    }
  };

  const FormIconPreview = resolvePaymentIcon(form);

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Payment Methods</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure the tenders offered at checkout. Behaviour is driven by each method's settings, never its name.
        </p>
      </div>

      <ResizableSplit storageKey="pos_split_payment_methods" initialWidth={440} min={380} max={640}>
        <Card
          className="admin-panel-card"
          title={form.id ? `Edit ${form.displayName || "Method"}` : "Add Payment Method"}
          style={{ animationDelay: "90ms" }}
          action={form.id ? (
            <Button variant="secondary" size="sm" onClick={resetForm}>
              Cancel Edit
            </Button>
          ) : null}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="pm-name" className="text-sm font-medium text-slate-700">Display Name</label>
              <input id="pm-name"
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                placeholder="Cash, Card Payment, QR Payment"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {form.id ? (
              <div>
                <label className="text-sm font-medium text-slate-700">Code (fixed)</label>
                <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-600">
                  {form.code}
                </div>
                <p className="mt-1 text-xs text-slate-500">The code identifies this method on historical sales and cannot be changed.</p>
              </div>
            ) : (
              <div>
                <label htmlFor="pm-code" className="text-sm font-medium text-slate-700">Code (optional)</label>
                <input id="pm-code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="Auto-generated from the name if blank"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label htmlFor="pm-category" className="text-sm font-medium text-slate-700">Category</label>
              <select id="pm-category"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="pm-refpolicy" className="text-sm font-medium text-slate-700">Does this method require a reference number?</label>
              <select id="pm-refpolicy"
                value={form.referencePolicy}
                onChange={(e) => setForm((p) => ({ ...p, referencePolicy: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {REFERENCE_POLICIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {form.referencePolicy !== "NONE" && (
              <div>
                <label htmlFor="pm-reflabel" className="text-sm font-medium text-slate-700">Reference Field Label</label>
                <input id="pm-reflabel"
                  value={form.referenceLabel}
                  onChange={(e) => setForm((p) => ({ ...p, referenceLabel: e.target.value }))}
                  placeholder="Transaction ID, Bank Slip Number, Approval Code"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label htmlFor="pm-icon" className="text-sm font-medium text-slate-700">Icon (optional)</label>
              <div className="mt-1 flex items-center gap-3">
                <select id="pm-icon"
                  value={form.iconKey}
                  onChange={(e) => setForm((p) => ({ ...p, iconKey: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Auto (from category)</option>
                  {PAYMENT_ICON_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                  <FormIconPreview size={22} />
                </span>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">Include in Expected Cash in Drawer</div>
                <div className="text-xs text-slate-500">Cash-like tenders add to the physical drawer count at shift close.</div>
              </div>
              <input type="checkbox" checked={form.includeInExpectedCash}
                onChange={(e) => setForm((p) => ({ ...p, includeInExpectedCash: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">Credit / Deferred Payment</div>
                <div className="text-xs text-slate-500">The sale is recorded now and settled by the customer later.</div>
              </div>
              <input type="checkbox" checked={form.allowsCredit}
                onChange={(e) => setForm((p) => ({ ...p, allowsCredit: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">Active</div>
                <div className="text-xs text-slate-500">Inactive methods stay on old records but cannot be used for new sales.</div>
              </div>
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </label>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Plus size={16} className="mr-2" />
              {saving ? "Saving..." : form.id ? "Update Payment Method" : "Add Payment Method"}
            </Button>
          </div>
        </Card>

        <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "130ms" }}>
          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading payment methods..." />
            </div>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table min-w-[860px]">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-table-head-cell">Method</th>
                    <th className="app-table-head-cell">Category</th>
                    <th className="app-table-head-cell text-center">Reference</th>
                    <th className="app-table-head-cell text-center">Expected Cash</th>
                    <th className="app-table-head-cell text-center">Status</th>
                    <th className="app-table-head-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app-table-body">
                  {methods.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="app-table-empty">No payment methods configured.</td>
                    </tr>
                  ) : (
                    methods.map((method) => {
                      const MethodIcon = resolvePaymentIcon(method);
                      return (
                        <tr key={method.id}>
                          <td className="app-table-cell">
                            <div className="flex items-center gap-2">
                              <MethodIcon size={16} className="text-blue-600" />
                              <div>
                                <div className="font-semibold text-slate-800">{method.displayName}</div>
                                <div className="font-mono text-xs text-slate-400">{method.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="app-table-cell text-slate-600">{categoryLabel(method.category)}</td>
                          <td className="app-table-cell text-center">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              method.referencePolicy === "REQUIRED" ? "bg-red-100 text-red-700"
                                : method.referencePolicy === "OPTIONAL" ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {method.referencePolicy === "REQUIRED" ? "Required"
                                : method.referencePolicy === "OPTIONAL" ? "Optional" : "None"}
                            </span>
                          </td>
                          <td className="app-table-cell text-center">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              method.includeInExpectedCash ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}>
                              {method.includeInExpectedCash ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="app-table-cell text-center">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              method.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}>
                              {method.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="app-table-cell">
                            <div className="flex justify-end gap-2">
                              <button type="button" aria-label={`Edit ${method.displayName}`}
                                onClick={() => handleEdit(method)}
                                className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-blue-600"
                                title="Edit payment method">
                                <Pencil size={16} />
                              </button>
                              <button type="button" aria-label={`${method.active ? "Deactivate" : "Activate"} ${method.displayName}`}
                                onClick={() => handleToggleActive(method)}
                                disabled={togglingId === method.id}
                                className={`rounded-lg bg-slate-50 p-2 transition disabled:opacity-50 ${
                                  method.active ? "text-slate-500 hover:text-red-600" : "text-slate-500 hover:text-emerald-600"
                                }`}
                                title={method.active ? "Deactivate" : "Activate"}>
                                <Power size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ResizableSplit>
    </div>
  );
};

export default PaymentMethodsSettingsPage;
