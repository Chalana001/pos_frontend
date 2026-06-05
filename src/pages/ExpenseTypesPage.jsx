import React, { useEffect, useState } from "react";
import { Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { expenseTypesAPI } from "../api/expenseTypes.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";

const INITIAL_FORM = {
  id: null,
  name: "",
  countInProfitReport: true,
  active: true,
};

const ExpenseTypesPage = () => {
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadExpenseTypes();
  }, []);

  const loadExpenseTypes = async () => {
    try {
      setLoading(true);
      const response = await expenseTypesAPI.list();
      setExpenseTypes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load expense types", error);
      toast.error("Failed to load expense settings");
      setExpenseTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(INITIAL_FORM);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Expense name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      countInProfitReport: form.countInProfitReport,
      active: form.active,
    };

    try {
      setSaving(true);
      if (form.id) {
        await expenseTypesAPI.update(form.id, payload);
        toast.success("Expense type updated");
      } else {
        await expenseTypesAPI.create(payload);
        toast.success("Expense type added");
      }
      await loadExpenseTypes();
      resetForm();
    } catch (error) {
      console.error("Failed to save expense type", error);
      toast.error(error?.response?.data?.message || "Failed to save expense type");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expenseType) => {
    setForm({
      id: expenseType.id,
      name: expenseType.name || "",
      countInProfitReport: expenseType.countInProfitReport !== false,
      active: expenseType.active !== false,
    });
  };

  const handleDelete = async (expenseType) => {
    try {
      setDeletingId(expenseType.id);
      const response = await expenseTypesAPI.remove(expenseType.id);
      const action = response.data?.action;
      if (action === "DEACTIVATED") {
        toast.success("Expense type has records, so it was deactivated");
      } else {
        toast.success("Expense type deleted");
      }
      await loadExpenseTypes();
      if (Number(form.id) === Number(expenseType.id)) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to delete expense type", error);
      toast.error(error?.response?.data?.message || "Failed to delete expense type");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Expense Types</h1>
        <p className="mt-1 text-sm text-slate-500">
          Maintain tenant-wise expense names and control whether they reduce profit reports.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <Card
          className="admin-panel-card"
          title={form.id ? "Edit Expense Type" : "Add Expense Type"}
          style={{ animationDelay: "90ms" }}
          action={form.id ? (
            <Button variant="secondary" size="sm" onClick={resetForm}>
              Cancel Edit
            </Button>
          ) : null}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Oil, Gas, Tea, Delivery"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">Count In Profit Report</div>
                <div className="text-xs text-slate-500">Turn this off when the cost is already recovered through item overhead.</div>
              </div>
              <input
                type="checkbox"
                checked={form.countInProfitReport}
                onChange={(event) => setForm((prev) => ({ ...prev, countInProfitReport: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">Active</div>
                <div className="text-xs text-slate-500">Inactive types stay in old records but cannot be used for new expenses.</div>
              </div>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Plus size={16} className="mr-2" />
              {saving ? "Saving..." : form.id ? "Update Expense Type" : "Add Expense Type"}
            </Button>
          </div>
        </Card>

        <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "130ms" }}>
          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading expense settings..." />
            </div>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table min-w-[820px]">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-table-head-cell">Name</th>
                    <th className="app-table-head-cell text-center">Profit Report</th>
                    <th className="app-table-head-cell text-center">Status</th>
                    <th className="app-table-head-cell text-center">Records</th>
                    <th className="app-table-head-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app-table-body">
                  {expenseTypes.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="app-table-empty">
                        No expense types available.
                      </td>
                    </tr>
                  ) : (
                    expenseTypes.map((expenseType) => (
                      <tr key={expenseType.id}>
                        <td className="app-table-cell">
                          <div className="flex items-center gap-2">
                            <ReceiptText size={16} className="text-blue-600" />
                            <span className="font-semibold text-slate-800">{expenseType.name}</span>
                          </div>
                        </td>
                        <td className="app-table-cell text-center">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            expenseType.countInProfitReport ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {expenseType.countInProfitReport ? "Include" : "Recovered"}
                          </span>
                        </td>
                        <td className="app-table-cell text-center">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            expenseType.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {expenseType.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="app-table-cell text-center font-medium text-slate-700">
                          {expenseType.usageCount || 0}
                        </td>
                        <td className="app-table-cell">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(expenseType)}
                              className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-blue-600"
                              title="Edit expense type"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(expenseType)}
                              disabled={deletingId === expenseType.id}
                              className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-red-600 disabled:opacity-50"
                              title={expenseType.usageCount > 0 ? "In-use types will be deactivated" : "Delete expense type"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ExpenseTypesPage;
