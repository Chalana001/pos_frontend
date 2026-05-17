import React, { useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { warrantyTemplatesAPI } from "../api/warrantyTemplates.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";

const INITIAL_FORM = {
  id: null,
  label: "",
  periodValue: "",
  periodUnit: "MONTHS",
  active: true,
};

const periodUnitOptions = [
  { value: "DAYS", label: "Days" },
  { value: "MONTHS", label: "Months" },
  { value: "YEARS", label: "Years" },
];

const WarrantySettingsPage = () => {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await warrantyTemplatesAPI.list();
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load warranty templates", error);
      toast.error("Failed to load warranty settings");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(INITIAL_FORM);

  const handleSave = async () => {
    const periodValue = Number(form.periodValue);
    if (!form.label.trim()) {
      toast.error("Warranty label is required");
      return;
    }
    if (!Number.isInteger(periodValue) || periodValue <= 0) {
      toast.error("Warranty period must be a positive whole number");
      return;
    }

    const payload = {
      label: form.label.trim(),
      periodValue,
      periodUnit: form.periodUnit,
      active: form.active,
    };

    try {
      setSaving(true);
      if (form.id) {
        await warrantyTemplatesAPI.update(form.id, payload);
        toast.success("Warranty template updated");
      } else {
        await warrantyTemplatesAPI.create(payload);
        toast.success("Warranty template added");
      }
      await loadTemplates();
      resetForm();
    } catch (error) {
      console.error("Failed to save warranty template", error);
      toast.error(error?.response?.data?.message || "Failed to save warranty template");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template) => {
    setForm({
      id: template.id,
      label: template.label || "",
      periodValue: template.periodValue || "",
      periodUnit: template.periodUnit || "MONTHS",
      active: template.active !== false,
    });
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await warrantyTemplatesAPI.remove(id);
      toast.success("Warranty template deleted");
      await loadTemplates();
      if (Number(form.id) === Number(id)) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to delete warranty template", error);
      toast.error(error?.response?.data?.message || "Failed to delete warranty template");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Warranty Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Create reusable periods that appear in the POS cart warranty dropdown.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <Card
          className="admin-panel-card"
          title={form.id ? "Edit Warranty Period" : "Add Warranty Period"}
          style={{ animationDelay: "90ms" }}
          action={form.id ? (
            <Button variant="secondary" size="sm" onClick={resetForm}>
              Cancel Edit
            </Button>
          ) : null}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Label</label>
              <input
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="1 Year Warranty"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-[1fr_150px] gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Period</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.periodValue}
                  onChange={(event) => setForm((prev) => ({ ...prev, periodValue: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Unit</label>
                <CustomSelect
                  value={form.periodUnit}
                  onChange={(value) => setForm((prev) => ({ ...prev, periodUnit: value }))}
                  options={periodUnitOptions}
                  valueKey="value"
                  labelKey="label"
                  className="mt-1"
                />
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">Active</div>
                <div className="text-xs text-slate-500">Only active templates appear in POS.</div>
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
              {saving ? "Saving..." : form.id ? "Update Period" : "Add Period"}
            </Button>
          </div>
        </Card>

        <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "130ms" }}>
          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading warranty settings..." />
            </div>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table min-w-[720px]">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-table-head-cell">Label</th>
                    <th className="app-table-head-cell">Period</th>
                    <th className="app-table-head-cell text-center">Status</th>
                    <th className="app-table-head-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app-table-body">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="app-table-empty">
                        No warranty periods added yet.
                      </td>
                    </tr>
                  ) : (
                    templates.map((template) => (
                      <tr key={template.id}>
                        <td className="app-table-cell">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-blue-600" />
                            <span className="font-semibold text-slate-800">{template.label}</span>
                          </div>
                        </td>
                        <td className="app-table-cell">
                          {template.periodValue} {template.periodUnit}
                        </td>
                        <td className="app-table-cell text-center">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            template.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {template.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="app-table-cell">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(template)}
                              className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-blue-600"
                              title="Edit warranty period"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(template.id)}
                              disabled={deletingId === template.id}
                              className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-red-600 disabled:opacity-50"
                              title="Delete warranty period"
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

export default WarrantySettingsPage;
