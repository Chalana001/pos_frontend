import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Save, Search } from "lucide-react";

import { branchesAPI } from "../../api/branches.api";
import { categoriesAPI } from "../../api/categories.api";
import { customersAPI } from "../../api/customers.api";
import { itemsAPI } from "../../api/items.api";
import { promotionsAPI } from "../../api/promotions.api";
import Button from "../../components/common/Button";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useAppConfiguration } from "../../context/AppConfigurationContext";
import { DISCOUNT_TYPES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";
import ItemPriceTable from "./components/ItemPriceTable";
import ScopePicker from "./components/ScopePicker";

const INITIAL_FORM = {
  name: "",
  scope: "ITEM",
  discountType: DISCOUNT_TYPES.PERCENT,
  discountValue: "",
  startAt: "",
  endAt: "",
  branchId: "",
  active: true,
  priority: 0,
  minBillAmount: "",
  maxDiscountAmount: "",
  marginFloorPercent: "",
  allowBelowCost: false,
  categoryIds: [],
  subCategoryIds: [],
  customerIds: [],
};

const toLocalInput = (value) => (value ? String(value).slice(0, 16) : "");

/**
 * Create or edit one campaign, full width.
 *
 * <p>The previous screen packed this into a 440px column beside the list, which is what made a
 * price table impossible — the feature this page exists for needs the horizontal room.
 */
const PromotionBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const isEdit = Boolean(id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [itemLines, setItemLines] = useState([]);
  const [itemsById, setItemsById] = useState(new Map());
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [priceCheck, setPriceCheck] = useState(null);
  const [targetSearch, setTargetSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [branchRes, categoryRes, customerRes] = await Promise.all([
          branchesAPI.getAll(true),
          singleCategoryMode ? categoriesAPI.getSingleCategories() : categoriesAPI.getAll(),
          customersAPI.getList({ activeOnly: true }),
        ]);
        if (cancelled) return;
        setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
        setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
        setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);

        if (!isEdit) return;

        const listRes = await promotionsAPI.list();
        const promotion = (Array.isArray(listRes.data) ? listRes.data : [])
          .find((row) => Number(row.id) === Number(id));
        if (!promotion) {
          toast.error("Promotion not found");
          navigate("/promotions");
          return;
        }

        setForm({
          name: promotion.name || "",
          scope: promotion.scope || "ITEM",
          discountType: promotion.discountType || DISCOUNT_TYPES.PERCENT,
          discountValue: promotion.discountValue ?? "",
          startAt: toLocalInput(promotion.startAt),
          endAt: toLocalInput(promotion.endAt),
          branchId: promotion.branchId || "",
          active: promotion.active !== false,
          priority: promotion.priority || 0,
          minBillAmount: promotion.minBillAmount || "",
          maxDiscountAmount: promotion.maxDiscountAmount || "",
          marginFloorPercent: promotion.marginFloorPercent ?? "",
          allowBelowCost: !!promotion.allowBelowCost,
          categoryIds: promotion.categoryIds || [],
          subCategoryIds: promotion.subCategoryIds || [],
          customerIds: promotion.customerIds || [],
        });

        const lines = (promotion.items || []).map((line) => ({
          id: Number(line.id),
          offerPrice: line.offerPrice ?? "",
        }));
        setItemLines(lines);

        // Each stored line names an item the search box may never surface, so they are
        // fetched by id rather than relying on whatever a search happens to return.
        const fetched = await Promise.all(lines.map((line) =>
          itemsAPI.getById(line.id).then((res) => res.data).catch(() => null)));
        if (cancelled) return;
        const map = new Map();
        fetched.filter(Boolean).forEach((item) => map.set(Number(item.id), item));
        setItemsById(map);
      } catch (error) {
        console.error("Failed to load promotion", error);
        toast.error(error?.response?.data?.message || "Failed to load promotion");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit, singleCategoryMode, navigate]);

  // ── price check ───────────────────────────────────────────────────────────────────────

  const priceSignature = useMemo(
    () => JSON.stringify({
      lines: itemLines.map((line) => [line.id, line.offerPrice]),
      type: form.discountType,
      value: form.discountValue,
      floor: form.marginFloorPercent,
      below: form.allowBelowCost,
    }),
    [itemLines, form.discountType, form.discountValue, form.marginFloorPercent, form.allowBelowCost]
  );

  useEffect(() => {
    if (form.scope !== "ITEM" || itemLines.length === 0) {
      setPriceCheck(null);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await promotionsAPI.priceCheck({
          items: itemLines.map((line) => ({
            id: line.id,
            offerPrice: line.offerPrice === "" || line.offerPrice == null ? null : Number(line.offerPrice),
          })),
          discountType: form.discountType,
          discountValue: Number(form.discountValue || 0),
          allowBelowCost: form.allowBelowCost,
          marginFloorPercent: form.marginFloorPercent === "" ? null : Number(form.marginFloorPercent),
        });
        setPriceCheck(response.data);
      } catch (error) {
        console.error("Price check failed", error);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceSignature, form.scope]);

  // ── item line editing ─────────────────────────────────────────────────────────────────

  const addItem = useCallback((item) => {
    setItemsById((prev) => new Map(prev).set(Number(item.id), item));
    setItemLines((prev) => (prev.some((line) => Number(line.id) === Number(item.id))
      ? prev
      : [...prev, { id: Number(item.id), offerPrice: "" }]));
  }, []);

  const removeItem = useCallback((itemId) => {
    setItemLines((prev) => prev.filter((line) => Number(line.id) !== Number(itemId)));
  }, []);

  const changeItem = useCallback((itemId, patch, meta) => {
    if (meta) {
      toast.success(`Imported ${meta.imported} price${meta.imported === 1 ? "" : "s"}`);
      if (meta.unmatched?.length) {
        toast.error(`${meta.unmatched.length} barcode(s) not in this promotion: ${meta.unmatched.slice(0, 3).join(", ")}`);
      }
      return;
    }
    setItemLines((prev) => prev.map((line) =>
      Number(line.id) === Number(itemId) ? { ...line, ...patch } : line));
  }, []);

  const bulkPercent = useCallback((percent) => {
    setItemLines((prev) => prev.map((line) => {
      const normal = Number(itemsById.get(Number(line.id))?.sellingPrice ?? 0);
      if (!normal) return line;
      return { ...line, offerPrice: (normal - normal * (percent / 100)).toFixed(2) };
    }));
  }, [itemsById]);

  const roundTo99 = useCallback(() => {
    setItemLines((prev) => prev.map((line) => {
      if (line.offerPrice === "" || line.offerPrice == null) return line;
      const value = Number(line.offerPrice);
      if (!Number.isFinite(value) || value < 1) return line;
      return { ...line, offerPrice: (Math.floor(value) - 0.01).toFixed(2) };
    }));
  }, []);

  const clearPrices = useCallback(() => {
    setItemLines((prev) => prev.map((line) => ({ ...line, offerPrice: "" })));
  }, []);

  // ── non-item targets ──────────────────────────────────────────────────────────────────

  const targetKey = form.scope === "CUSTOMER"
    ? "customerIds"
    : singleCategoryMode ? "subCategoryIds" : "categoryIds";
  const selectedTargetIds = form[targetKey] || [];

  const filteredTargets = useMemo(() => {
    const source = form.scope === "CUSTOMER" ? customers : categories;
    const list = Array.isArray(source) ? source : [];
    const term = targetSearch.trim().toLowerCase();
    const filtered = term ? list.filter((row) => row.name?.toLowerCase().includes(term)) : list;
    return form.scope === "CUSTOMER" ? filtered.slice(0, 100) : filtered;
  }, [categories, customers, form.scope, targetSearch]);

  const toggleTarget = (targetId) => {
    const numeric = Number(targetId);
    setForm((prev) => {
      const current = prev[targetKey] || [];
      const exists = current.some((value) => Number(value) === numeric);
      return {
        ...prev,
        [targetKey]: exists
          ? current.filter((value) => Number(value) !== numeric)
          : [...current, numeric],
      };
    });
  };

  const changeScope = (scope) => {
    setForm((prev) => ({
      ...prev,
      scope,
      // Cleared rather than hidden: a limit typed under one scope used to follow the form
      // into the next one and be saved with it.
      minBillAmount: "",
      maxDiscountAmount: "",
      categoryIds: [],
      subCategoryIds: [],
      customerIds: [],
    }));
    setItemLines([]);
    setTargetSearch("");
  };

  // ── save ──────────────────────────────────────────────────────────────────────────────

  const validate = () => {
    if (!form.name.trim()) return "Promotion name is required";
    if (!form.startAt || !form.endAt) return "Start and end dates are required";
    if (new Date(form.startAt) >= new Date(form.endAt)) return "End date must be after start date";
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) return "Discount value must be greater than zero";
    if (form.discountType === DISCOUNT_TYPES.PERCENT && value > 100) return "Percent discount cannot exceed 100";
    if (form.scope === "ITEM" && itemLines.length === 0) return "Add at least one item";
    if (form.scope !== "ITEM" && form.scope !== "BILL" && selectedTargetIds.length === 0) {
      return "Select at least one target";
    }
    if (!form.allowBelowCost && priceCheck?.belowCostCount > 0) {
      return `${priceCheck.belowCostCount} item(s) priced below cost. Allow below-cost pricing if this is deliberate.`;
    }
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
    marginFloorPercent: form.marginFloorPercent === "" ? null : Number(form.marginFloorPercent),
    allowBelowCost: form.allowBelowCost,
    items: form.scope === "ITEM"
      ? itemLines.map((line) => ({
          id: Number(line.id),
          offerPrice: line.offerPrice === "" || line.offerPrice == null ? null : Number(line.offerPrice),
        }))
      : [],
    categoryIds: form.scope === "CATEGORY" && !singleCategoryMode ? form.categoryIds : [],
    subCategoryIds: form.scope === "CATEGORY" && singleCategoryMode ? form.subCategoryIds : [],
    customerIds: form.scope === "CUSTOMER" ? form.customerIds : [],
  });

  const save = async () => {
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }
    try {
      setSaving(true);
      if (isEdit) {
        await promotionsAPI.update(id, buildPayload());
        toast.success("Promotion updated");
      } else {
        await promotionsAPI.create(buildPayload());
        toast.success("Promotion created");
      }
      navigate("/promotions");
    } catch (error) {
      console.error("Failed to save promotion", error);
      toast.error(error?.response?.data?.message || "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  // ── summary ───────────────────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const days = form.startAt && form.endAt
      ? Math.max(0, Math.round((new Date(form.endAt) - new Date(form.startAt)) / 86_400_000))
      : 0;
    return {
      days,
      count: form.scope === "ITEM" ? itemLines.length : selectedTargetIds.length,
      avgPercent: priceCheck?.averageDiscountPercent,
      maxLine: priceCheck?.maxLineDiscount,
      belowCost: priceCheck?.belowCostCount || 0,
    };
  }, [form.startAt, form.endAt, form.scope, itemLines.length, selectedTargetIds.length, priceCheck]);

  if (loading) {
    return <div className="py-16"><LoadingSpinner size="lg" text="Loading…" /></div>;
  }

  return (
    <div className="page-enter space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/promotions")}>
            <ArrowLeft size={15} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEdit ? "Edit Promotion" : "New Promotion"}
            </h1>
            <p className="text-sm text-slate-500">
              One campaign can hold a different price for every item in it.
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create promotion"}
        </Button>
      </div>

      {/* 1. Basics */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">1 · Basics</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Christmas Sale"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Branch</span>
            <select
              value={form.branchId}
              onChange={(event) => updateForm("branchId", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* 2. Scope */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">2 · What it applies to</h2>
        <ScopePicker value={form.scope} onChange={changeScope} />

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-sm font-medium text-slate-700">
              {form.scope === "ITEM" ? "Default discount type" : "Discount type"}
            </span>
            <select
              value={form.discountType}
              onChange={(event) => updateForm("discountType", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value={DISCOUNT_TYPES.PERCENT}>Percent (%)</option>
              <option value={DISCOUNT_TYPES.FIXED}>Fixed amount</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Value</span>
            <input
              type="number" min="0" step="0.01"
              value={form.discountValue}
              onChange={(event) => updateForm("discountValue", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Priority</span>
            <input
              type="number"
              value={form.priority}
              onChange={(event) => updateForm("priority", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {form.scope === "ITEM" && (
          <p className="mt-2 text-xs text-slate-500">
            Used for any item you leave without its own offer price.
          </p>
        )}
      </section>

      {/* 3. Targets */}
      {form.scope === "ITEM" ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">3 · Items &amp; prices</h2>
          <ItemPriceTable
            lines={itemLines}
            itemsById={itemsById}
            priceCheck={priceCheck}
            branchId={form.branchId ? Number(form.branchId) : undefined}
            onAdd={addItem}
            onRemove={removeItem}
            onChange={changeItem}
            onBulkPercent={bulkPercent}
            onRoundTo99={roundTo99}
            onClearPrices={clearPrices}
          />
        </section>
      ) : form.scope === "BILL" ? (
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm font-medium text-blue-800">
          Applies to every qualifying bill in the selected branch and date range.
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            3 · {form.scope === "CUSTOMER" ? "Customers" : "Categories"} ({selectedTargetIds.length})
          </h2>
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={targetSearch}
              onChange={(event) => setTargetSearch(event.target.value)}
              placeholder="Search"
              aria-label="Search targets"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="custom-scrollbar grid max-h-72 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 md:grid-cols-2">
            {filteredTargets.length === 0 ? (
              <div className="col-span-full py-8 text-center text-sm text-slate-500">Nothing found</div>
            ) : filteredTargets.map((target) => {
              const checked = selectedTargetIds.some((value) => Number(value) === Number(target.id));
              return (
                <label
                  key={target.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    checked ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0 truncate font-medium">{target.name}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTarget(target.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Schedule */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">4 · Schedule</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-sm font-medium text-slate-700">Starts</span>
            <input
              type="datetime-local" value={form.startAt}
              onChange={(event) => updateForm("startAt", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Ends</span>
            <input
              type="datetime-local" value={form.endAt}
              onChange={(event) => updateForm("endAt", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center justify-between self-end rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm font-medium text-slate-700">Active</span>
            <input
              type="checkbox" checked={form.active}
              onChange={(event) => updateForm("active", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      {/* 5. Limits */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">5 · Limits</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label>
            <span className="text-sm font-medium text-slate-700">Minimum bill</span>
            <input
              type="number" min="0" step="0.01" placeholder="No minimum"
              value={form.minBillAmount}
              onChange={(event) => updateForm("minBillAmount", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">
              {form.scope === "ITEM" || form.scope === "CATEGORY" ? "Max discount / line" : "Max discount"}
            </span>
            <input
              type="number" min="0" step="0.01" placeholder="No cap"
              value={form.maxDiscountAmount}
              onChange={(event) => updateForm("maxDiscountAmount", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Minimum margin %</span>
            <input
              type="number" min="0" max="100" step="0.1" placeholder="No floor"
              value={form.marginFloorPercent}
              onChange={(event) => updateForm("marginFloorPercent", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center justify-between self-end rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm font-medium text-slate-700">Allow below cost</span>
            <input
              type="checkbox" checked={form.allowBelowCost}
              onChange={(event) => updateForm("allowBelowCost", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          A cap limits what this promotion takes off a single line — the safety net for a
          mistyped offer price. Below-cost pricing is refused unless you allow it here.
        </p>
      </section>

      {/* Summary */}
      <div className="sticky bottom-4 z-20 rounded-xl border border-slate-300 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-bold text-slate-700">Summary</span>
          <span className="text-slate-600">
            {summary.count} {form.scope === "CUSTOMER" ? "customer" : form.scope === "CATEGORY" ? "category" : "item"}
            {summary.count === 1 ? "" : "s"}
          </span>
          {summary.avgPercent != null && (
            <span className="text-slate-600">avg {Number(summary.avgPercent).toFixed(1)}% off</span>
          )}
          {summary.maxLine != null && Number(summary.maxLine) > 0 && (
            <span className="text-slate-600">max {formatCurrency(summary.maxLine)} off a line</span>
          )}
          <span className="text-slate-600">runs {summary.days} day{summary.days === 1 ? "" : "s"}</span>
          {summary.belowCost > 0 && (
            <span className="font-bold text-red-600">{summary.belowCost} below cost</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionBuilderPage;
