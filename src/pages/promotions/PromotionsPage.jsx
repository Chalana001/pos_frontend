import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Copy, History, Pencil, Plus, Search, Settings, Tag, Trash2, Users } from "lucide-react";

import { branchesAPI } from "../../api/branches.api";
import { promotionsAPI } from "../../api/promotions.api";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { DISCOUNT_TYPES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";
import PromotionStatusBadge from "./components/PromotionStatusBadge";
import PromotionSettingsModal from "./components/PromotionSettingsModal";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import { promotionStatus } from "./components/promotionStatus";
import CustomSelect from "../../components/common/CustomSelect";

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "LIVE", label: "Live" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PENDING_APPROVAL", label: "Awaiting approval" },
  { key: "DRAFT", label: "Drafts" },
  { key: "PAUSED", label: "Paused" },
  { key: "ENDED", label: "Ended" },
];

/**
 * The campaign list. Filterable, and it says what each promotion is actually doing, the old
 * list printed the stored `active` flag as a green pill, so a campaign that finished in March
 * still read as Active with its dates in a neighbouring column for the reader to compare.
 */
const PromotionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canApprove = hasPermission(user?.role, "APPROVE_PROMOTIONS");
  const canEditSettings = hasPermission(user?.role, "MANAGE_PROMOTION_SETTINGS");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const branchNameById = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => map.set(Number(branch.id), branch.name));
    return map;
  }, [branches]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promotionRes, branchRes] = await Promise.all([
        promotionsAPI.list(),
        branchesAPI.getAll(true),
      ]);
      setPromotions(Array.isArray(promotionRes.data) ? promotionRes.data : []);
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
    } catch (error) {
      console.error("Failed to load promotions", error);
      toast.error(error?.response?.data?.message || "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return promotions.filter((promotion) => {
      if (term && !promotion.name?.toLowerCase().includes(term)) return false;
      if (branchFilter && Number(promotion.branchId) !== Number(branchFilter)) return false;
      if (statusFilter === "ALL") return true;
      const status = promotionStatus(promotion);
      if (statusFilter === "LIVE") return status === "LIVE" || status === "ENDING_SOON";
      return status === statusFilter;
    });
  }, [promotions, search, statusFilter, branchFilter]);

  const lifecycle = async (promotion, action) => {
    try {
      let note;
      if (action === "reject") {
        note = window.prompt(`Why is "${promotion.name}" being rejected?`) ?? undefined;
        if (note === undefined) return;
      }
      const call = {
        submit: () => promotionsAPI.submit(promotion.id),
        approve: () => promotionsAPI.approve(promotion.id),
        reject: () => promotionsAPI.reject(promotion.id, note),
        pause: () => promotionsAPI.pause(promotion.id),
        resume: () => promotionsAPI.resume(promotion.id),
      }[action];
      const response = await call();
      const status = response.data?.status;
      toast.success(
        status === "PENDING_APPROVAL" ? "Sent for approval"
          : status === "ACTIVE" ? "Promotion is on"
          : status === "PAUSED" ? "Promotion paused"
          : "Updated"
      );
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update promotion");
    }
  };

  // What a row can do next depends on its stored status, not on the derived badge.
  const lifecycleActions = (promotion) => {
    switch (promotion.status) {
      case "DRAFT":
        return [{ key: "submit", label: "Activate", primary: true }];
      case "PENDING_APPROVAL":
        return canApprove
          ? [{ key: "approve", label: "Approve", primary: true }, { key: "reject", label: "Reject" }]
          : [];
      case "PAUSED":
        return [{ key: "resume", label: "Resume", primary: true }];
      case "ACTIVE":
        return [{ key: "pause", label: "Pause" }];
      default:
        return [];
    }
  };

  const duplicate = async (promotion) => {
    try {
      const response = await promotionsAPI.duplicate(promotion.id);
      toast.success("Copy created. Set the dates and activate it");
      navigate(`/promotions/${response.data.id}/edit`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to duplicate promotion");
    }
  };

  const remove = async (promotion) => {
    try {
      await promotionsAPI.remove(promotion.id);
      toast.success("Promotion retired");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete promotion");
    }
  };

  const targetCount = (promotion) => {
    if (promotion.scope === "ITEM") return promotion.items?.length || promotion.itemIds?.length || 0;
    if (promotion.scope === "CUSTOMER") return promotion.customerIds?.length || 0;
    if (promotion.scope === "BILL") return 0;
    return (promotion.categoryIds?.length || 0) + (promotion.subCategoryIds?.length || 0);
  };

  const discountLabel = (promotion) => {
    switch (promotion.effectType) {
      case "FIXED_PRICE": return `Fixed ${formatCurrency(promotion.discountValue)}`;
      case "BUY_X_GET_Y_FREE": return `Buy ${promotion.buyQty} get ${promotion.getQty} free`;
      case "TIERED": return `${promotion.tiers?.length || 0} tier${promotion.tiers?.length === 1 ? "" : "s"}`;
      case "BUNDLE": return `Any ${promotion.buyQty} for ${formatCurrency(promotion.discountValue)}`;
      case "CHEAPEST_FREE": return `Buy ${promotion.buyQty}, cheapest free`;
      default: break;
    }
    const perItem = promotion.scope === "ITEM"
      && (promotion.items || []).some((line) => line.offerPrice != null);
    if (perItem) return "Per-item prices";
    return promotion.discountType === DISCOUNT_TYPES.PERCENT
      ? `${promotion.discountValue}%`
      : formatCurrency(promotion.discountValue);
  };

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Promotions</h1>
          <p className="mt-1 text-sm text-slate-500">Campaigns running now and scheduled to start.</p>
        </div>
        <div className="flex items-center gap-2">
          {canEditSettings && (
            <Button variant="secondary" onClick={() => setSettingsOpen(true)} aria-label="Promotion settings">
              <Settings size={16} />
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate("/promotions/segments")}>
            <Users size={16} className="mr-2" /> Segments
          </Button>
          <Button variant="secondary" onClick={() => navigate("/promotions/history")}>
            <History size={16} className="mr-2" /> History
          </Button>
          <Button onClick={() => navigate("/promotions/new")}>
            <Plus size={16} className="mr-2" /> New promotion
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search promotions"
            aria-label="Search promotions"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                statusFilter === filter.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <CustomSelect
          value={branchFilter}
          onChange={setBranchFilter}
          options={[{ id: "", name: "All branches" }, ...branches]}
          className="w-48"
        />
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="py-12"><LoadingSpinner size="lg" text="Loading promotions..." /></div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table min-w-[900px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Promotion</th>
                  <th className="app-table-head-cell">Applies to</th>
                  <th className="app-table-head-cell">Discount</th>
                  <th className="app-table-head-cell">Period</th>
                  <th className="app-table-head-cell text-center">Status</th>
                  <th className="app-table-head-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="app-table-empty">
                      {promotions.length === 0
                        ? "No promotions yet. Create one to get started."
                        : "No promotions match these filters."}
                    </td>
                  </tr>
                ) : visible.map((promotion) => (
                  <tr key={promotion.id}>
                    <td className="app-table-cell">
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-800">{promotion.name}</div>
                          <div className="text-xs text-slate-500">
                            {promotion.branchId
                              ? branchNameById.get(Number(promotion.branchId)) || `Branch ${promotion.branchId}`
                              : "All branches"}
                            {promotion.priority ? `, Priority ${promotion.priority}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="app-table-cell">
                      <div className="text-slate-700">
                        {promotion.scope === "BILL" ? "Any bill" : `${promotion.scope} (${targetCount(promotion)})`}
                      </div>
                      {promotion.minBillAmount > 0 && (
                        <div className="text-xs text-slate-500">Min {formatCurrency(promotion.minBillAmount)}</div>
                      )}
                      {promotion.maxDiscountAmount > 0 && (
                        <div className="text-xs text-slate-500">Cap {formatCurrency(promotion.maxDiscountAmount)}</div>
                      )}
                    </td>
                    <td className="app-table-cell font-medium text-slate-700">{discountLabel(promotion)}</td>
                    <td className="app-table-cell text-xs text-slate-600">
                      {promotion.startAt ? new Date(promotion.startAt).toLocaleDateString() : "-"}
                      {"-"}
                      {promotion.endAt ? new Date(promotion.endAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="app-table-cell text-center">
                      <PromotionStatusBadge promotion={promotion} />
                    </td>
                    <td className="app-table-cell">
                      <div className="flex justify-end gap-2">
                        {lifecycleActions(promotion).map((action) => (
                          <Button
                            key={action.key}
                            size="sm"
                            variant={action.primary ? "primary" : "secondary"}
                            onClick={() => lifecycle(promotion, action.key)}
                          >
                            {action.label}
                          </Button>
                        ))}
                        <Button size="sm" variant="secondary" aria-label="Edit"
                                onClick={() => navigate(`/promotions/${promotion.id}/edit`)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="sm" variant="secondary" aria-label="Duplicate"
                                onClick={() => duplicate(promotion)}>
                          <Copy size={14} />
                        </Button>
                        <Button size="sm" variant="danger" aria-label="Delete"
                                onClick={() => setDeleteTarget(promotion)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PromotionSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove(deleteTarget)}
        title="Retire Promotion"
        icon={Trash2}
        message={`Retire "${deleteTarget?.name}"?`}
        detail="It stops applying straight away. Past sales keep their discount and stay in history."
        confirmLabel="Retire"
      />
    </div>
  );
};

export default PromotionsPage;
