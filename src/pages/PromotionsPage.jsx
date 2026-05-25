import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";

import { branchesAPI } from "../api/branches.api";
import { categoriesAPI } from "../api/categories.api";
import { customersAPI } from "../api/customers.api";
import { itemsAPI } from "../api/items.api";
import { promotionsAPI } from "../api/promotions.api";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { DISCOUNT_TYPES } from "../utils/constants";
import { formatCurrency } from "../utils/formatters";

const INITIAL_FORM = {
  id: null,
  name: "",
  scope: "CATEGORY",
  discountType: DISCOUNT_TYPES.PERCENT,
  discountValue: "",
  startAt: "",
  endAt: "",
  branchId: "",
  active: true,
  priority: 0,
  minBillAmount: "",
  maxDiscountAmount: "",
  itemIds: [],
  categoryIds: [],
  subCategoryIds: [],
  customerIds: [],
};

const PromotionsPage = () => {
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const [promotions, setPromotions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [targetSearch, setTargetSearch] = useState("");

  const selectedTargetIds = form.scope === "ITEM"
    ? form.itemIds
    : form.scope === "CUSTOMER"
      ? form.customerIds
      : singleCategoryMode
        ? form.subCategoryIds
        : form.categoryIds;
  const targetRequired = form.scope === "ITEM" || form.scope === "CATEGORY" || form.scope === "CUSTOMER";

  const filteredTargets = useMemo(() => {
    const query = targetSearch.trim().toLowerCase();
    const source = form.scope === "ITEM"
      ? items
      : form.scope === "CUSTOMER"
        ? customers
        : categories;
    const list = Array.isArray(source) ? source : [];
    const filtered = !query
      ? list
      : list.filter((target) =>
          target.name?.toLowerCase().includes(query) ||
          target.barcode?.toLowerCase().includes(query)
        );
    return form.scope === "ITEM" || form.scope === "CUSTOMER" ? filtered.slice(0, 100) : filtered;
  }, [categories, customers, form.scope, items, targetSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promotionRes, branchRes, itemRes, categoryRes, customerRes] = await Promise.all([
        promotionsAPI.list(),
        branchesAPI.getAll(true),
        itemsAPI.getRecent(300),
        singleCategoryMode ? categoriesAPI.getSingleCategories() : categoriesAPI.getAll(),
        customersAPI.getList({ activeOnly: true }),
      ]);
      setPromotions(Array.isArray(promotionRes.data) ? promotionRes.data : []);
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
      setItems(Array.isArray(itemRes.data) ? itemRes.data : []);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
      setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
    } catch (error) {
      console.error("Failed to load promotions", error);
      toast.error(error?.response?.data?.message || "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleCategoryMode]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setTargetSearch("");
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const changeScope = (scope) => {
    setForm((prev) => ({
      ...prev,
      scope,
      itemIds: [],
      categoryIds: [],
      subCategoryIds: [],
      customerIds: [],
    }));
    setTargetSearch("");
  };

  const toggleTarget = (id) => {
    const targetId = Number(id);
    const key = form.scope === "ITEM"
      ? "itemIds"
      : form.scope === "CUSTOMER"
        ? "customerIds"
        : singleCategoryMode
          ? "subCategoryIds"
          : "categoryIds";

    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.some((value) => Number(value) === targetId);
      return {
        ...prev,
        [key]: exists ? current.filter((value) => Number(value) !== targetId) : [...current, targetId],
      };
    });
  };

  const validate = () => {
    if (!form.name.trim()) return "Promotion name is required";
    if (!form.startAt || !form.endAt) return "Date range is required";
    if (new Date(form.startAt) >= new Date(form.endAt)) return "End date must be after start date";
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) return "Discount value must be greater than zero";
    if (form.discountType === DISCOUNT_TYPES.PERCENT && value > 100) return "Percent discount cannot exceed 100";
    if (Number(form.minBillAmount || 0) < 0) return "Minimum bill cannot be negative";
    if (Number(form.maxDiscountAmount || 0) < 0) return "Max discount cannot be negative";
    if (targetRequired && !selectedTargetIds.length) return "Select at least one target";
    return "";
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    scope: form.scope,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    startAt: form.startAt,
    endAt: form.endAt,
    branchId: form.branchId ? Number(form.branchId) : null,
    active: form.active,
    priority: Number.parseInt(form.priority, 10) || 0,
    minBillAmount: Number(form.minBillAmount || 0),
    maxDiscountAmount: Number(form.maxDiscountAmount || 0),
    itemIds: form.scope === "ITEM" ? form.itemIds : [],
    categoryIds: form.scope === "CATEGORY" && !singleCategoryMode ? form.categoryIds : [],
    subCategoryIds: form.scope === "CATEGORY" && singleCategoryMode ? form.subCategoryIds : [],
    customerIds: form.scope === "CUSTOMER" ? form.customerIds : [],
  });

  const savePromotion = async () => {
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }

    try {
      setSaving(true);
      if (form.id) {
        await promotionsAPI.update(form.id, buildPayload());
        toast.success("Promotion updated");
      } else {
        await promotionsAPI.create(buildPayload());
        toast.success("Promotion created");
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Failed to save promotion", error);
      toast.error(error?.response?.data?.message || "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  const editPromotion = (promotion) => {
    setForm({
      id: promotion.id,
      name: promotion.name || "",
      scope: promotion.scope || "CATEGORY",
      discountType: promotion.discountType || DISCOUNT_TYPES.PERCENT,
      discountValue: promotion.discountValue || "",
      startAt: promotion.startAt ? String(promotion.startAt).slice(0, 16) : "",
      endAt: promotion.endAt ? String(promotion.endAt).slice(0, 16) : "",
      branchId: promotion.branchId || "",
      active: promotion.active !== false,
      priority: promotion.priority || 0,
      minBillAmount: promotion.minBillAmount || "",
      maxDiscountAmount: promotion.maxDiscountAmount || "",
      itemIds: promotion.itemIds || [],
      categoryIds: promotion.categoryIds || [],
      subCategoryIds: promotion.subCategoryIds || [],
      customerIds: promotion.customerIds || [],
    });
    setTargetSearch("");
  };

  const toggleStatus = async (promotion) => {
    try {
      await promotionsAPI.updateStatus(promotion.id, !promotion.active);
      toast.success(promotion.active ? "Promotion disabled" : "Promotion enabled");
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update promotion");
    }
  };

  const deletePromotion = async (promotion) => {
    if (!window.confirm(`Delete promotion "${promotion.name}"?`)) return;
    try {
      await promotionsAPI.remove(promotion.id);
      toast.success("Promotion deleted");
      await loadData();
      if (Number(form.id) === Number(promotion.id)) resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete promotion");
    }
  };

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Promotions</h1>
        <p className="mt-1 text-sm text-slate-500">Create active item, category, bill, and customer promotion rules.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
        <Card
          className="admin-panel-card"
          title={form.id ? "Edit Promotion" : "Add Promotion"}
          action={form.id ? <Button size="sm" variant="secondary" onClick={resetForm}>Cancel Edit</Button> : null}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Drinks 10% off"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-sm font-medium text-slate-700">Scope</span>
                <select value={form.scope} onChange={(event) => changeScope(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="CATEGORY">Category</option>
                  <option value="ITEM">Item</option>
                  <option value="BILL">Bill Total</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Branch</span>
                <select value={form.branchId} onChange={(event) => updateForm("branchId", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">All Branches</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-[1fr_130px] gap-3">
              <label>
                <span className="text-sm font-medium text-slate-700">Discount Type</span>
                <select value={form.discountType} onChange={(event) => updateForm("discountType", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value={DISCOUNT_TYPES.PERCENT}>Percent (%)</option>
                  <option value={DISCOUNT_TYPES.FIXED}>Fixed (LKR)</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Value</span>
                <input type="number" min="0" step="0.01" value={form.discountValue} onChange={(event) => updateForm("discountValue", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-sm font-medium text-slate-700">Start</span>
                <input type="datetime-local" value={form.startAt} onChange={(event) => updateForm("startAt", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">End</span>
                <input type="datetime-local" value={form.endAt} onChange={(event) => updateForm("endAt", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3">
              <label>
                <span className="text-sm font-medium text-slate-700">Priority</span>
                <input type="number" value={form.priority} onChange={(event) => updateForm("priority", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">Active</span>
                <input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </label>
            </div>

            {(form.scope === "BILL" || form.scope === "CUSTOMER") && (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm font-medium text-slate-700">Minimum Bill</span>
                  <input type="number" min="0" step="0.01" value={form.minBillAmount} onChange={(event) => updateForm("minBillAmount", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label>
                  <span className="text-sm font-medium text-slate-700">Max Discount</span>
                  <input type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={(event) => updateForm("maxDiscountAmount", event.target.value)} placeholder="No cap" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
            )}

            {targetRequired ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Targets ({selectedTargetIds.length})</span>
                <span className="text-xs text-slate-500">
                  {form.scope === "ITEM" ? "Items" : form.scope === "CUSTOMER" ? "Customers" : singleCategoryMode ? "Single categories" : "Main categories"}
                </span>
              </div>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={targetSearch} onChange={(event) => setTargetSearch(event.target.value)} placeholder="Search targets" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" />
              </div>
              <div className="custom-scrollbar max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {filteredTargets.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No targets found</div>
                ) : filteredTargets.map((target) => {
                  const checked = selectedTargetIds.some((id) => Number(id) === Number(target.id));
                  return (
                    <label key={target.id} className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${checked ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"}`}>
                      <span className="min-w-0 truncate font-medium">{target.name}{form.scope === "ITEM" && target.barcode ? ` (${target.barcode})` : ""}</span>
                      <input type="checkbox" checked={checked} onChange={() => toggleTarget(target.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </label>
                  );
                })}
              </div>
            </div>
            ) : (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                Bill total rules apply to every eligible bill in the selected branch and date range.
              </div>
            )}

            <Button onClick={savePromotion} disabled={saving} className="w-full">
              <Plus size={16} className="mr-2" />
              {saving ? "Saving..." : form.id ? "Update Promotion" : "Create Promotion"}
            </Button>
          </div>
        </Card>

        <Card className="sales-panel-enter overflow-hidden p-0">
          {loading ? (
            <div className="py-12"><LoadingSpinner size="lg" text="Loading promotions..." /></div>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table min-w-[920px]">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-table-head-cell">Promotion</th>
                    <th className="app-table-head-cell">Scope</th>
                    <th className="app-table-head-cell">Discount</th>
                    <th className="app-table-head-cell">Period</th>
                    <th className="app-table-head-cell text-center">Status</th>
                    <th className="app-table-head-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app-table-body">
                  {promotions.length === 0 ? (
                    <tr><td colSpan="6" className="app-table-empty">No promotions created yet.</td></tr>
                  ) : promotions.map((promotion) => {
                    const targetCount = promotion.scope === "ITEM"
                      ? promotion.itemIds?.length || 0
                      : promotion.scope === "CUSTOMER"
                        ? promotion.customerIds?.length || 0
                        : promotion.scope === "BILL"
                          ? 0
                          : (promotion.categoryIds?.length || 0) + (promotion.subCategoryIds?.length || 0);
                    return (
                      <tr key={promotion.id}>
                        <td className="app-table-cell">
                          <div className="flex items-center gap-2">
                            <Tag size={16} className="text-blue-600" />
                            <div>
                              <div className="font-semibold text-slate-800">{promotion.name}</div>
                              <div className="text-xs text-slate-500">{promotion.branchId ? `Branch ${promotion.branchId}` : "All branches"} | Priority {promotion.priority || 0}</div>
                            </div>
                          </div>
                        </td>
                        <td className="app-table-cell">
                          {promotion.scope}{promotion.scope !== "BILL" ? ` (${targetCount})` : ""}
                          {(promotion.scope === "BILL" || promotion.scope === "CUSTOMER") && promotion.minBillAmount > 0 ? (
                            <div className="text-xs text-slate-500">Min {formatCurrency(promotion.minBillAmount)}</div>
                          ) : null}
                        </td>
                        <td className="app-table-cell">{promotion.discountType === DISCOUNT_TYPES.PERCENT ? `${promotion.discountValue}%` : formatCurrency(promotion.discountValue)}</td>
                        <td className="app-table-cell text-xs text-slate-600">{promotion.startAt ? new Date(promotion.startAt).toLocaleString() : "-"} - {promotion.endAt ? new Date(promotion.endAt).toLocaleString() : "-"}</td>
                        <td className="app-table-cell text-center">
                          <button onClick={() => toggleStatus(promotion)} className={`rounded-full px-3 py-1 text-xs font-bold ${promotion.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {promotion.active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="app-table-cell">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => editPromotion(promotion)}><Pencil size={14} /></Button>
                            <Button size="sm" variant="danger" onClick={() => deletePromotion(promotion)}><Trash2 size={14} /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PromotionsPage;
