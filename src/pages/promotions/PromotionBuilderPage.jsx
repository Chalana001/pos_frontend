import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Building2, FlaskConical, Save, Search } from "lucide-react";

import { categoriesAPI } from "../../api/categories.api";
import { customersAPI } from "../../api/customers.api";
import { itemsAPI } from "../../api/items.api";
import { promotionsAPI } from "../../api/promotions.api";
import Button from "../../components/common/Button";
import DraftRestoreBar from "../../components/common/DraftRestoreBar";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useUnsavedWork from "../../hooks/useUnsavedWork";
import { useAppConfiguration } from "../../context/AppConfigurationContext";
import { useBranch } from "../../context/BranchContext";
import { DISCOUNT_TYPES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";
import ItemPriceTable from "./components/ItemPriceTable";
import PromotionCodesPanel from "./components/PromotionCodesPanel";
import PromotionAuditPanel from "./components/PromotionAuditPanel";
import PromotionSimulateModal from "./components/PromotionSimulateModal";
import PromotionStatusBadge from "./components/PromotionStatusBadge";
import ScopePicker from "./components/ScopePicker";
import CustomSelect from "../../components/common/CustomSelect";

const DISCOUNT_TYPE_OPTIONS = [
  { value: DISCOUNT_TYPES.PERCENT, label: "Percent (%)" },
  { value: DISCOUNT_TYPES.FIXED, label: "Fixed amount" },
];

// Bump when the saved payload shape changes, so an older draft is discarded rather than
// loaded into a form that can no longer read it.
const PROMOTION_DRAFT_SCHEMA_VERSION = 1;

const EFFECT_TYPES = [
  { key: "DISCOUNT", label: "Discount", hint: "A percentage or amount off" },
  { key: "FIXED_PRICE", label: "Fixed price", hint: "Everything at one price", lineOnly: true },
  { key: "BUY_X_GET_Y_FREE", label: "Buy X get Y free", hint: "Buy 2, get 1 free", lineOnly: true },
  { key: "TIERED", label: "Quantity / spend tiers", hint: "More off the more they buy" },
  { key: "BUNDLE", label: "Bundle", hint: "Any 3 for 1,000" },
  { key: "CHEAPEST_FREE", label: "Cheapest free", hint: "Buy 3, cheapest is free" },
  { key: "PROFIT_SHARE", label: "Share of profit", hint: "Give 10% of the margin", lineOnly: true },
];

const STACKING_MODES = [
  { key: "BEST_ONLY", label: "Best offer wins", hint: "Competes with others; the biggest discount applies" },
  { key: "STACKABLE", label: "Stacks on top", hint: "Adds to whatever else applies" },
  { key: "EXCLUSIVE", label: "Cannot be combined", hint: "If it wins, nothing else applies to the line or the bill" },
];

const DAYS = [
  { bit: 1, label: "Mon" }, { bit: 2, label: "Tue" }, { bit: 4, label: "Wed" }, { bit: 8, label: "Thu" },
  { bit: 16, label: "Fri" }, { bit: 32, label: "Sat" }, { bit: 64, label: "Sun" },
];

const EMPTY_TIER = { minQty: "", minAmount: "", discountType: DISCOUNT_TYPES.PERCENT, discountValue: "" };

const INITIAL_FORM = {
  name: "",
  scope: "ITEM",
  effectType: "DISCOUNT",
  buyQty: "",
  getQty: "",
  stackingMode: "BEST_ONLY",
  allowManualStacking: true,
  maxTotalRedemptions: "",
  maxRedemptionsPerCustomer: "",
  budgetAmount: "",
  tiers: [],
  scheduleDays: 0,
  scheduleStart: "",
  scheduleEnd: "",
  discountType: DISCOUNT_TYPES.PERCENT,
  discountValue: "",
  startAt: "",
  endAt: "",
  branchId: "",
  // Not a stored column. Whether a promotion is code-gated is decided by whether it has any
  // codes, see PromotionGate.codeGated, so this only carries the intent of a campaign that
  // has none yet, and is never sent to the server.
  requiresCode: false,
  active: true,
  status: "",
  lifecycle: "",
  priority: 0,
  minBillAmount: "",
  maxDiscountAmount: "",
  marginFloorPercent: "",
  allowBelowCost: false,
  categoryIds: [],
  subCategoryIds: [],
  customerIds: [],
  segmentIds: [],
};

const toLocalInput = (value) => (value ? String(value).slice(0, 16) : "");

/**
 * Create or edit one campaign, full width.
 *
 * <p>The previous screen packed this into a 440px column beside the list, which is what made a
 * price table impossible, the feature this page exists for needs the horizontal room.
 */
const PromotionBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { configuration } = useAppConfiguration();
  const { branches, selectedBranchId } = useBranch();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const isEdit = Boolean(id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [itemLines, setItemLines] = useState([]);
  const [itemsById, setItemsById] = useState(new Map());
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [segments, setSegments] = useState([]);
  const [priceCheck, setPriceCheck] = useState(null);
  const [targetSearch, setTargetSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [codeCount, setCodeCount] = useState(0);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  /**
   * Which branch this campaign belongs to.
   *
   * <p>A campaign runs at one branch. Two shops rarely want the same price, the items offered
   * have to be items that branch actually stocks, and the margin guard is only meaningful
   * against the batches the selling branch holds, a promotion covering everywhere is judged
   * on the worst batch anywhere, which is a number nobody set out to pick. So the branch is
   * not asked for a second time: it is the one already chosen in the top bar.
   *
   * <p>An existing campaign keeps the branch it was created for. Moving it would leave its
   * redemptions, budget spend and audit trail behind at the old one.
   */
  const activeBranchId = isEdit
    ? (form.branchId ? Number(form.branchId) : null)
    : (Number(selectedBranchId) || null);
  const activeBranchName = branches.find((branch) => Number(branch.id) === activeBranchId)?.name;
  const branchMissing = !activeBranchId;

  /**
   * How the till comes to apply this promotion.
   *
   * <p>There is no column for it: a promotion applies automatically until it has a code, and
   * from the first code on it applies only when one is presented. That rule already lives in
   * PromotionGate and is the only truth, repeating it in a flag would let the two disagree.
   * So while codes exist the choice is settled and shown, not asked; before then it records
   * what the campaign is meant to be, which is what decides whether it may go live yet.
   */
  const codeGated = codeCount > 0;
  const requiresCode = codeGated || !!form.requiresCode;
  const needsItsFirstCode = requiresCode && codeCount === 0;

  // Switching the top bar part-way through changes which branch the campaign is for, and the
  // items already picked came from the old one. Say so rather than silently re-scoping them or
  // throwing the work away.
  const lastBranchRef = useRef(selectedBranchId);
  useEffect(() => {
    if (isEdit || Number(lastBranchRef.current) === Number(selectedBranchId)) return;
    lastBranchRef.current = selectedBranchId;
    if (itemLines.length > 0) {
      toast("Branch changed. Check these items are stocked there", { icon: "⚠️" });
    }
  }, [selectedBranchId, isEdit, itemLines.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [categoryRes, customerRes, segmentRes] = await Promise.all([
          singleCategoryMode ? categoriesAPI.getSingleCategories() : categoriesAPI.getAll(),
          customersAPI.getList({ activeOnly: true }),
          // Segments are small and used by one scope only; a failure here must not stop the
          // rest of the form loading.
          promotionsAPI.segments().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
        setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
        setSegments(Array.isArray(segmentRes.data) ? segmentRes.data : []);

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
          requiresCode: Number(promotion.codeCount || 0) > 0,
          active: promotion.active !== false,
          status: promotion.status || "",
          lifecycle: promotion.lifecycle || "",
          priority: promotion.priority || 0,
          minBillAmount: promotion.minBillAmount || "",
          maxDiscountAmount: promotion.maxDiscountAmount || "",
          marginFloorPercent: promotion.marginFloorPercent ?? "",
          allowBelowCost: !!promotion.allowBelowCost,
          effectType: promotion.effectType || "DISCOUNT",
          buyQty: promotion.buyQty ?? "",
          getQty: promotion.getQty ?? "",
          stackingMode: promotion.stackingMode || "BEST_ONLY",
          allowManualStacking: promotion.allowManualStacking !== false,
          maxTotalRedemptions: promotion.maxTotalRedemptions ?? "",
          maxRedemptionsPerCustomer: promotion.maxRedemptionsPerCustomer ?? "",
          budgetAmount: promotion.budgetAmount ?? "",
          tiers: (promotion.tiers || []).map((tier) => ({
            minQty: tier.minQty ?? "",
            minAmount: tier.minAmount ?? "",
            discountType: tier.discountType || DISCOUNT_TYPES.PERCENT,
            discountValue: tier.discountValue ?? "",
          })),
          // The API allows several schedules; the screen edits one, which covers happy hour
          // and weekday specials. Extra rows round-trip untouched.
          scheduleDays: promotion.schedules?.[0]?.daysOfWeek ?? 0,
          scheduleStart: (promotion.schedules?.[0]?.startTime || "").slice(0, 5),
          scheduleEnd: (promotion.schedules?.[0]?.endTime || "").slice(0, 5),
          categoryIds: promotion.categoryIds || [],
          subCategoryIds: promotion.subCategoryIds || [],
          customerIds: promotion.customerIds || [],
          segmentIds: promotion.segmentIds || [],
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
      // Batch-aware: the same item at another branch is another batch, at another cost.
      branch: activeBranchId,
    }),
    [itemLines, form.discountType, form.discountValue, form.marginFloorPercent, form.allowBelowCost,
     activeBranchId]
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
          // Only a profit share prices from cost, so the preview has to know the mechanic.
          effectType: form.effectType,
          // Whose batches to price against, the branch that will be selling these items.
          branchId: activeBranchId,
        });
        setPriceCheck(response.data);
      } catch (error) {
        console.error("Price check failed", error);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceSignature, form.scope]);

  // ── pre-save check ─────────────────────────────────────────────────────────────────────

  const checkSignature = useMemo(
    () => JSON.stringify({ f: form, b: activeBranchId, l: itemLines.map((line) => [line.id, line.offerPrice]) }),
    [form, itemLines, activeBranchId]
  );

  useEffect(() => {
    if (loading || !form.name.trim() || !form.startAt || !form.endAt || validate()) {
      setCheck(null);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await promotionsAPI.check(buildPayload(true), isEdit ? id : undefined);
        setCheck(response.data);
      } catch {
        // An incomplete form is refused by the same validation the save uses; nothing to show yet.
        setCheck(null);
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSignature, loading]);

  // ── item line editing ─────────────────────────────────────────────────────────────────

  const addItem = useCallback((item) => {
    setItemsById((prev) => new Map(prev).set(Number(item.id), item));
    setItemLines((prev) => (prev.some((line) => Number(line.id) === Number(item.id))
      ? prev
      : [...prev, { id: Number(item.id), offerPrice: "" }]));
  }, []);

  /**
   * Add a whole search or a whole category in one go.
   *
   * <p>Adding a hundred items one click at a time is not a smaller version of adding one; it is
   * a different job, and the picker was only built for the first. One pass over the batch keeps
   * it to a single render and a single price check rather than a hundred of each.
   *
   */
  const addItems = useCallback((items) => {
    const incoming = (Array.isArray(items) ? items : []).filter((item) => item && item.id != null);
    if (incoming.length === 0) return;

    setItemsById((prev) => {
      const next = new Map(prev);
      incoming.forEach((item) => next.set(Number(item.id), item));
      return next;
    });

    setItemLines((prev) => {
      const have = new Set(prev.map((line) => Number(line.id)));
      const fresh = [];
      incoming.forEach((item) => {
        const itemId = Number(item.id);
        if (have.has(itemId)) return;
        have.add(itemId);
        fresh.push({ id: itemId, offerPrice: "" });
      });
      return fresh.length ? [...prev, ...fresh] : prev;
    });
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

  const toggleSegment = (segmentId) => {
    const numeric = Number(segmentId);
    setForm((prev) => {
      const current = prev.segmentIds || [];
      const exists = current.some((value) => Number(value) === numeric);
      return {
        ...prev,
        segmentIds: exists
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
      // Fixed price and buy-X-get-Y only mean something on items or categories.
      effectType: (scope === "BILL" || scope === "CUSTOMER")
        && (prev.effectType === "FIXED_PRICE" || prev.effectType === "BUY_X_GET_Y_FREE")
        ? "DISCOUNT"
        : prev.effectType,
      tiers: [],
      categoryIds: [],
      subCategoryIds: [],
      customerIds: [],
      segmentIds: [],
    }));
    setItemLines([]);
    setTargetSearch("");
  };

  const isLineScope = form.scope === "ITEM" || form.scope === "CATEGORY";
  const effect = form.effectType;

  const updateTier = (index, patch) => setForm((prev) => ({
    ...prev,
    tiers: prev.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
  }));
  const addTier = () => setForm((prev) => ({ ...prev, tiers: [...prev.tiers, { ...EMPTY_TIER }] }));
  const removeTier = (index) => setForm((prev) => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }));
  const toggleDay = (bit) => setForm((prev) => ({ ...prev, scheduleDays: prev.scheduleDays ^ bit }));

  // ── save ──────────────────────────────────────────────────────────────────────────────

  const validate = () => {
    if (!form.name.trim()) return "Promotion name is required";
    if (!activeBranchId) return "Choose a branch in the top bar. A promotion runs at one branch";
    if (!form.startAt || !form.endAt) return "Start and end dates are required";
    if (new Date(form.startAt) >= new Date(form.endAt)) return "End date must be after start date";
    const value = Number(form.discountValue);
    const buy = Number(form.buyQty);
    const get = Number(form.getQty);
    switch (effect) {
      case "DISCOUNT":
        if (!Number.isFinite(value) || value <= 0) return "Discount value must be greater than zero";
        if (form.discountType === DISCOUNT_TYPES.PERCENT && value > 100) return "Percent discount cannot exceed 100";
        break;
      case "FIXED_PRICE":
        if (!Number.isFinite(value) || value <= 0) return "Fixed price must be greater than zero";
        break;
      case "BUY_X_GET_Y_FREE":
        if (!Number.isFinite(buy) || buy <= 0) return "Buy quantity must be greater than zero";
        if (!Number.isFinite(get) || get <= 0) return "Free quantity must be greater than zero";
        break;
      case "TIERED":
        if (form.tiers.length === 0) return "Add at least one tier";
        for (const tier of form.tiers) {
          const threshold = Number(isLineScope ? tier.minQty : tier.minAmount);
          if (!Number.isFinite(threshold) || threshold <= 0) {
            return isLineScope ? "Each tier needs a minimum quantity" : "Each tier needs a minimum bill amount";
          }
          const tierValue = Number(tier.discountValue);
          if (!Number.isFinite(tierValue) || tierValue <= 0) return "Each tier needs a discount greater than zero";
          if (tier.discountType === DISCOUNT_TYPES.PERCENT && tierValue > 100) return "A tier's percent cannot exceed 100";
        }
        break;
      case "BUNDLE":
        if (!Number.isFinite(buy) || buy < 2) return "A bundle needs at least 2 items";
        if (!Number.isFinite(value) || value <= 0) return "Bundle price must be greater than zero";
        break;
      case "CHEAPEST_FREE":
        if (!Number.isFinite(buy) || buy < 2) return "Cheapest-free needs a group of at least 2";
        break;
      case "PROFIT_SHARE":
        if (!Number.isFinite(value) || value <= 0) return "Share of profit must be greater than zero";
        // 100% gives the whole margin away and sells at cost. More than that would sell below
        // it, which is the one thing this mechanic exists to make impossible.
        if (value > 100) return "Share of profit cannot exceed 100";
        break;
      default:
        break;
    }
    if ((form.scheduleStart === "") !== (form.scheduleEnd === "")) return "Set both a start and an end time, or neither";
    if (form.scope === "ITEM" && itemLines.length === 0) return "Add at least one item";
    if (form.scope === "CUSTOMER" && selectedTargetIds.length === 0 && form.segmentIds.length === 0) {
      return "Choose at least one customer or segment";
    }
    if (form.scope === "CATEGORY" && selectedTargetIds.length === 0) {
      return "Select at least one target";
    }
    if (!form.allowBelowCost && priceCheck?.belowCostCount > 0) {
      return `${priceCheck.belowCostCount} item(s) priced below cost. Allow below-cost pricing if this is deliberate.`;
    }
    return "";
  };

  const buildPayload = (activate = form.active) => ({
    name: form.name.trim(),
    scope: form.scope,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    startAt: form.startAt,
    endAt: form.endAt,
    branchId: activeBranchId,
    active: activate,
    priority: Number.parseInt(form.priority, 10) || 0,
    minBillAmount: Number(form.minBillAmount || 0),
    maxDiscountAmount: Number(form.maxDiscountAmount || 0),
    marginFloorPercent: form.marginFloorPercent === "" ? null : Number(form.marginFloorPercent),
    allowBelowCost: form.allowBelowCost,
    effectType: effect,
    buyQty: form.buyQty === "" ? null : Number(form.buyQty),
    getQty: form.getQty === "" ? null : Number(form.getQty),
    stackingMode: form.stackingMode,
    allowManualStacking: form.allowManualStacking,
    maxTotalRedemptions: form.maxTotalRedemptions === "" ? null : Number(form.maxTotalRedemptions),
    maxRedemptionsPerCustomer: form.maxRedemptionsPerCustomer === "" ? null : Number(form.maxRedemptionsPerCustomer),
    budgetAmount: form.budgetAmount === "" ? null : Number(form.budgetAmount),
    tiers: effect === "TIERED"
      ? form.tiers.map((tier) => ({
          minQty: isLineScope && tier.minQty !== "" ? Number(tier.minQty) : null,
          minAmount: !isLineScope && tier.minAmount !== "" ? Number(tier.minAmount) : null,
          discountType: tier.discountType,
          discountValue: Number(tier.discountValue),
        }))
      : [],
    schedules: form.scheduleDays || form.scheduleStart
      ? [{
          daysOfWeek: form.scheduleDays,
          startTime: form.scheduleStart || null,
          endTime: form.scheduleEnd || null,
        }]
      : [],
    items: form.scope === "ITEM"
      ? itemLines.map((line) => ({
          id: Number(line.id),
          offerPrice: line.offerPrice === "" || line.offerPrice == null ? null : Number(line.offerPrice),
        }))
      : [],
    categoryIds: form.scope === "CATEGORY" && !singleCategoryMode ? form.categoryIds : [],
    subCategoryIds: form.scope === "CATEGORY" && singleCategoryMode ? form.subCategoryIds : [],
    customerIds: form.scope === "CUSTOMER" ? form.customerIds : [],
    segmentIds: form.scope === "CUSTOMER" ? form.segmentIds : [],
  });

  const save = async (activate) => {
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }
    // A draft is fine without codes; going live is not. With none, "only with a code" is not
    // a restriction the till can enforce. It would simply apply to every matching sale.
    if (activate && needsItsFirstCode) {
      toast.error("Add a promo code first. With none, this would apply to every sale");
      return;
    }
    try {
      setSaving(true);
      const response = isEdit
        ? await promotionsAPI.update(id, buildPayload(activate))
        : await promotionsAPI.create(buildPayload(activate));
      const status = response.data?.status;
      if (status === "PENDING_APPROVAL") {
        toast.success("Saved. Waiting for another admin to approve it");
      } else if (status === "DRAFT") {
        toast.success("Saved as a draft");
      } else {
        toast.success(isEdit ? "Promotion updated" : "Promotion created");
      }
      // Banked; otherwise the next visit offers back changes that are already live.
      await clearDraft();
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
      count: form.scope === "ITEM"
        ? itemLines.length
        : selectedTargetIds.length + (form.scope === "CUSTOMER" ? form.segmentIds.length : 0),
      avgPercent: priceCheck?.averageDiscountPercent,
      maxLine: priceCheck?.maxLineDiscount,
      belowCost: priceCheck?.belowCostCount || 0,
    };
  }, [form.startAt, form.endAt, form.scope, itemLines.length, selectedTargetIds.length,
      form.segmentIds.length, priceCheck]);

  // --- DRAFT RECOVERY ---
  //
  // Only the typed promotion. Deliberately absent: `branches`, `categories`, `customers`,
  // `segments` and `itemsById` (server data, re-fetched on mount, and itemsById is a Map,
  // which does not survive a round trip anyway), plus `targetSearch`, `check`, `priceCheck`
  // and the simulate modal, all transient.
  const draftPayload = useMemo(() => ({ form, itemLines }), [form, itemLines]);
  const serializedDraft = useMemo(() => JSON.stringify(draftPayload), [draftPayload]);

  // In edit mode the form arrives already full, so "has content" would mean "dirty" the
  // instant it loads and every visit would offer a draft of changes nobody made. Compare
  // against the state as loaded instead, and only count real edits.
  const baselineRef = useRef(null);
  useEffect(() => {
    if (!loading && baselineRef.current === null) {
      baselineRef.current = serializedDraft;
    }
  }, [loading, serializedDraft]);

  const isDraftDirty = baselineRef.current !== null && serializedDraft !== baselineRef.current;

  const { pendingDraft, discardDraft, clearDraft } = useUnsavedWork({
    kind: "promotion",
    entityId: id ?? null,
    schemaVersion: PROMOTION_DRAFT_SCHEMA_VERSION,
    isDirty: isDraftDirty,
    payload: draftPayload,
  });

  const restoreDraft = () => {
    const saved = pendingDraft?.payload;
    if (!saved) return;
    if (saved.form) setForm(saved.form);
    setItemLines(Array.isArray(saved.itemLines) ? saved.itemLines : []);
    discardDraft();
    toast.success("Draft restored");
  };

  if (loading) {
    return <div className="py-16"><LoadingSpinner size="lg" text="Loading…" /></div>;
  }

  return (
    <div className="page-enter space-y-6 pb-24">
      <DraftRestoreBar
        draft={pendingDraft}
        label={isEdit ? "Unsaved changes to this promotion" : "Unsaved promotion"}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
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
        <div className="flex flex-wrap items-center gap-2">
          {isEdit && form.lifecycle && <PromotionStatusBadge status={form.lifecycle} />}
          <Button
            variant="secondary"
            disabled={branchMissing}
            onClick={() => { if (validate()) { toast.error(validate()); return; } setSimulateOpen(true); }}
          >
            <FlaskConical size={16} className="mr-2" /> Simulate
          </Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={saving || branchMissing}>
            {form.status === "ACTIVE" || form.status === "PENDING_APPROVAL" ? "Save & pause" : "Save as draft"}
          </Button>
          <Button onClick={() => save(true)} disabled={saving || branchMissing}>
            <Save size={16} className="mr-2" />
            {saving ? "Saving…" : check?.approvalRequired ? "Save & send for approval" : "Save & activate"}
          </Button>
        </div>
      </div>

      {/* 1. Basics */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">1. Basics</h2>
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
          <div>
            <span className="text-sm font-medium text-slate-700">Branch</span>
            <div
              className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                activeBranchId
                  ? "border-slate-200 bg-slate-50 text-slate-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              <Building2 size={15} className="shrink-0 opacity-60" />
              <span className="truncate font-medium">
                {activeBranchId ? activeBranchName || `Branch ${activeBranchId}` : "No branch selected"}
              </span>
            </div>
            <span className="mt-1 block text-xs text-slate-500">
              {isEdit
                ? "A campaign stays at the branch it was created for."
                : "Switch branches from the selector in the top bar."}
            </span>
          </div>
        </div>

        {branchMissing ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            The top bar is on <strong>All Branches</strong>. Pick the branch this campaign runs at
            before building it. Its prices, its items and its margin check all belong to one branch.
          </p>
        ) : null}
      </section>

      {/* 2. Scope */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">2. What it applies to</h2>
        <ScopePicker value={form.scope} onChange={changeScope} />

        <div className="mt-5">
          <span className="text-sm font-medium text-slate-700">Offer type</span>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            {EFFECT_TYPES.filter((type) => !type.lineOnly || isLineScope).map((type) => {
              const selected = effect === type.key;
              return (
                <button
                  key={type.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateForm("effectType", type.key)}
                  className={`rounded-lg border px-3 py-2 text-left ${
                    selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`text-sm font-bold ${selected ? "text-blue-700" : "text-slate-800"}`}>{type.label}</div>
                  <div className="text-xs text-slate-500">{type.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <span className="text-sm font-medium text-slate-700">How it applies</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:max-w-2xl">
            {[
              { key: false, label: "Automatically", hint: "Every sale that matches gets it, with nothing to type" },
              { key: true, label: "Only with a promo code", hint: "The cashier enters a code at the till" },
            ].map((option) => {
              const selected = requiresCode === option.key;
              return (
                <button
                  key={String(option.key)}
                  type="button"
                  aria-pressed={selected}
                  // While codes exist the answer is the codes themselves; deleting them is how
                  // it changes, so offering a button that cannot keep its promise is worse.
                  disabled={codeGated}
                  onClick={() => updateForm("requiresCode", option.key)}
                  className={`rounded-lg border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`text-sm font-bold ${selected ? "text-blue-700" : "text-slate-800"}`}>{option.label}</div>
                  <div className="text-xs text-slate-500">{option.hint}</div>
                </button>
              );
            })}
          </div>
          {codeGated ? (
            <p className="mt-2 text-xs text-slate-500">
              Set by the {codeCount} code{codeCount === 1 ? "" : "s"} in section 6. Delete them all to make it automatic.
            </p>
          ) : null}
          {needsItsFirstCode ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              It has no codes yet, so it would apply to <strong>every</strong> matching sale if it went
              live now. Save it as a draft, add a code in section 6, then activate it.
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(effect === "DISCOUNT") && (
            <>
              <label>
                <span className="text-sm font-medium text-slate-700">
                  {form.scope === "ITEM" ? "Default discount type" : "Discount type"}
                </span>
                <CustomSelect
                  value={form.discountType}
                  onChange={(v) => updateForm("discountType", v)}
                  options={DISCOUNT_TYPE_OPTIONS}
                  className="mt-1 w-full"
                />
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
            </>
          )}
          {effect === "PROFIT_SHARE" && (
            <label className="md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Share of profit (%)</span>
              <input
                type="number" min="0" max="100" step="0.1" placeholder="10"
                value={form.discountValue}
                onChange={(event) => updateForm("discountValue", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Each item gives away this much of its own margin, so the cut is the same generosity
                everywhere and never reaches cost. An item making 100 gives 10 at 10%; one making
                200 gives 20. An item whose cost is unknown gives nothing.
              </span>
            </label>
          )}
          {effect === "FIXED_PRICE" && (
            <label>
              <span className="text-sm font-medium text-slate-700">Fixed price</span>
              <input
                type="number" min="0" step="0.01" placeholder="Every targeted item sells at this"
                value={form.discountValue}
                onChange={(event) => updateForm("discountValue", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          )}
          {effect === "BUY_X_GET_Y_FREE" && (
            <>
              <label>
                <span className="text-sm font-medium text-slate-700">Buy</span>
                <input
                  type="number" min="0" step="1" placeholder="2"
                  value={form.buyQty}
                  onChange={(event) => updateForm("buyQty", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Get free</span>
                <input
                  type="number" min="0" step="1" placeholder="1"
                  value={form.getQty}
                  onChange={(event) => updateForm("getQty", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </>
          )}
          {(effect === "BUNDLE" || effect === "CHEAPEST_FREE") && (
            <label>
              <span className="text-sm font-medium text-slate-700">Items per group</span>
              <input
                type="number" min="2" step="1" placeholder="3"
                value={form.buyQty}
                onChange={(event) => updateForm("buyQty", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          )}
          {effect === "BUNDLE" && (
            <label>
              <span className="text-sm font-medium text-slate-700">Bundle price</span>
              <input
                type="number" min="0" step="0.01" placeholder="Total for the group"
                value={form.discountValue}
                onChange={(event) => updateForm("discountValue", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          )}
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

        {effect === "TIERED" && (
          <div className="mt-5 rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                {isLineScope ? "Quantity breaks" : "Spend ladder"}
              </span>
              <Button size="sm" variant="secondary" onClick={addTier}>Add tier</Button>
            </div>
            {form.tiers.length === 0 ? (
              <p className="text-sm text-slate-500">
                {isLineScope
                  ? "E.g. 3 or more: 10%% off; 6 or more: 20% off. The highest break reached applies to the whole line."
                  : "E.g. over 5,000: 500 off; over 10,000: 1,200 off. The highest step the bill reaches applies."}
              </p>
            ) : form.tiers.map((tier, index) => (
              <div key={index} className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <label>
                  <span className="text-xs font-medium text-slate-600">{isLineScope ? "From quantity" : "From bill amount"}</span>
                  <input
                    type="number" min="0" step={isLineScope ? "1" : "0.01"}
                    value={isLineScope ? tier.minQty : tier.minAmount}
                    onChange={(event) => updateTier(index, isLineScope ? { minQty: event.target.value } : { minAmount: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">Type</span>
                  <CustomSelect
                    value={tier.discountType}
                    onChange={(v) => updateTier(index, { discountType: v })}
                    options={DISCOUNT_TYPE_OPTIONS}
                    className="mt-1 w-full"
                  />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">Value</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={tier.discountValue}
                    onChange={(event) => updateTier(index, { discountValue: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <Button size="sm" variant="secondary" onClick={() => removeTier(index)} aria-label="Remove tier">×</Button>
              </div>
            ))}
          </div>
        )}

        {form.scope === "ITEM" && effect === "DISCOUNT" && (
          <p className="mt-2 text-xs text-slate-500">
            Used for any item you leave without its own offer price.
          </p>
        )}
      </section>

      {/* 3. Targets */}
      {form.scope === "ITEM" ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">3. Items &amp; prices</h2>
          <ItemPriceTable
            lines={itemLines}
            itemsById={itemsById}
            priceCheck={priceCheck}
            branchId={activeBranchId ?? undefined}
            categories={categories}
            singleCategoryMode={singleCategoryMode}
            onAdd={addItem}
            onAddMany={addItems}
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
            3. {form.scope === "CUSTOMER" ? "Customers" : "Categories"} ({selectedTargetIds.length})
          </h2>

          {form.scope === "CUSTOMER" && (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">
                  Segments ({form.segmentIds.length})
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/promotions/segments")}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Manage segments
                </button>
              </div>
              {segments.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No segments yet. A segment targets everyone matching a rule. Spent over 50,000,
                  say. Instead of a list somebody keeps by hand.
                </p>
              ) : (
                <div className="grid gap-1 md:grid-cols-2">
                  {segments.filter((segment) => segment.active).map((segment) => {
                    const checked = form.segmentIds.some((value) => Number(value) === Number(segment.id));
                    return (
                      <label
                        key={segment.id}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                          checked ? "bg-blue-100 text-blue-800" : "hover:bg-white"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{segment.name}</span>
                          <span className="block text-xs text-slate-500">
                            {segment.memberCount} customer{segment.memberCount === 1 ? "" : "s"}
                            {segment.lastEvaluatedAt
                              ? `, as of ${new Date(segment.lastEvaluatedAt).toLocaleDateString()}`
                              : ", never worked out"}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSegment(segment.id)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">4. Schedule</h2>
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
          <div className="self-end rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Whether it runs is decided by the save button: <span className="font-semibold">Save & activate</span> switches
            it on{check?.approvalRequired ? " after approval" : ""}; <span className="font-semibold">Save as draft</span> keeps it off.
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div>
            <span className="text-sm font-medium text-slate-700">Days</span>
            <div className="mt-2 flex flex-wrap gap-1">
              {DAYS.map((day) => {
                const on = (form.scheduleDays & day.bit) !== 0;
                return (
                  <button
                    key={day.bit}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day.bit)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                      on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {form.scheduleDays === 0 ? "Every day within the dates." : "Only on the selected days."}
            </p>
          </div>
          <label>
            <span className="text-sm font-medium text-slate-700">From time</span>
            <input
              type="time" value={form.scheduleStart}
              onChange={(event) => updateForm("scheduleStart", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">To time</span>
            <input
              type="time" value={form.scheduleEnd}
              onChange={(event) => updateForm("scheduleEnd", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Leave the times empty for all day. An end before the start runs overnight 22:00 to 02:00.
        </p>
      </section>

      {/* 5. Limits */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">5. Limits</h2>
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
          A cap limits what this promotion takes off a single line. The safety net for a
          mistyped offer price. Below-cost pricing is refused unless you allow it here.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-sm font-medium text-slate-700">Total redemptions</span>
            <input
              type="number" min="0" step="1" placeholder="Unlimited"
              value={form.maxTotalRedemptions}
              onChange={(event) => updateForm("maxTotalRedemptions", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Per customer</span>
            <input
              type="number" min="0" step="1" placeholder="Unlimited"
              value={form.maxRedemptionsPerCustomer}
              onChange={(event) => updateForm("maxRedemptionsPerCustomer", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Budget</span>
            <input
              type="number" min="0" step="0.01" placeholder="Unlimited"
              value={form.budgetAmount}
              onChange={(event) => updateForm("budgetAmount", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          The promotion stops applying once any of these is reached. The total number of sales,
          sales per customer, or the total discount given. Per-customer needs a customer on the sale.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-[2fr_1fr]">
          <div>
            <span className="text-sm font-medium text-slate-700">Combining with other offers</span>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {STACKING_MODES.map((mode) => {
                const selected = form.stackingMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateForm("stackingMode", mode.key)}
                    className={`rounded-lg border px-3 py-2 text-left ${
                      selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`text-sm font-bold ${selected ? "text-blue-700" : "text-slate-800"}`}>{mode.label}</div>
                    <div className="text-xs text-slate-500">{mode.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center justify-between self-end rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm font-medium text-slate-700">Cashier can add a discount on top</span>
            <input
              type="checkbox" checked={form.allowManualStacking}
              onChange={(event) => updateForm("allowManualStacking", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      {isEdit && <PromotionAuditPanel promotionId={Number(id)} />}

      {isEdit ? (
        <PromotionCodesPanel promotionId={Number(id)} onCountChange={setCodeCount} />
      ) : (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
          <span className="font-bold text-slate-600">6. Promo codes</span>. Save the promotion first, then add
          codes here.{" "}
          {requiresCode
            ? "It is set to apply only with a code, so it cannot go live until it has one."
            : "With no codes it applies automatically; adding one makes it apply only when a code is presented."}
        </section>
      )}

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
          {check?.approvalRequired && (
            <span className="font-bold text-violet-700">
              Needs approval{check.deepestDiscountPercent != null ? `, deepest cut ${Number(check.deepestDiscountPercent).toFixed(0)}%` : ""}
            </span>
          )}
        </div>
        {check?.warnings?.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {check.warnings.map((warning, index) => (
              <li key={`${warning.code}-${warning.promotionId ?? index}`}>⚠ {warning.message}</li>
            ))}
          </ul>
        )}
      </div>

      <PromotionSimulateModal
        isOpen={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        payload={buildPayload(true)}
        branchId={activeBranchId}
      />
    </div>
  );
};

export default PromotionBuilderPage;
