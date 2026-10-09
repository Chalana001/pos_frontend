import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { CalendarClock, Copy, Plus, Search, Settings, Tag, Trash2 } from "lucide-react";

import { branchesAPI } from "../../api/branches.api";
import { promotionsAPI } from "../../api/promotions.api";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import CustomSelect from "../../components/common/CustomSelect";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import TablePagination from "../../components/common/TablePagination";
import useClientPagination from "../../hooks/useClientPagination";
import { DISCOUNT_TYPES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";
import PromotionStatusBadge from "./components/PromotionStatusBadge";
import PromotionSettingsModal from "./components/PromotionSettingsModal";
import PromotionKpiStrip from "./components/PromotionKpiStrip";
import StatusFilterGroup from "./components/StatusFilterGroup";
import ActionOverflowMenu from "./components/ActionOverflowMenu";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import { promotionStatus } from "./components/promotionStatus";

/**
 * The campaign board: rows grouped by what each promotion is doing right now, so a live
 * campaign and a draft never carry the same weight on screen. The KPI strip reads the same
 * list response plus one history call for the discount total; no new API.
 */
const GROUP_ORDER = [
  { key: "LIVE", label: "Live now", accent: "border-l-emerald-500", dot: "bg-emerald-500" },
  { key: "SCHEDULED", label: "Scheduled", accent: "border-l-blue-500", dot: "bg-blue-500" },
  { key: "PENDING_APPROVAL", label: "Awaiting approval", accent: "border-l-violet-500", dot: "bg-violet-500" },
  { key: "EXHAUSTED", label: "Limit reached", accent: "border-l-orange-500", dot: "bg-orange-500" },
  { key: "PAUSED", label: "Paused", accent: "border-l-slate-400", dot: "bg-slate-400" },
  { key: "DRAFT", label: "Drafts", accent: "border-l-slate-300", dot: "bg-slate-300" },
  { key: "ENDED", label: "Ended", accent: "border-l-slate-200", dot: "bg-slate-200" },
];

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
 * The group a row belongs in: derived status folded onto the axis the board is grouped by.
 * "Ending soon" is a live campaign with an amber date emphasis, not its own group, and
 * archived rows sit with ended ones.
 */
const groupKeyOf = (promotion) => {
  const status = promotionStatus(promotion);
  if (status === "ENDING_SOON") return "LIVE";
  if (status === "ARCHIVED") return "ENDED";
  return status;
};

/** Whole days, floor: a countdown that flips to "today" on the last day, not on hour 23. */
const daysLeft = (promotion) => {
  if (!promotion.endAt) return null;
  const msLeft = new Date(promotion.endAt) - new Date();
  if (msLeft < 0) return null;
  return Math.floor(msLeft / 86_400_000);
};

const daysUntil = (promotion) => {
  if (!promotion.startAt) return null;
  return Math.ceil((new Date(promotion.startAt) - new Date()) / 86_400_000);
};

const timeUntilText = (days) => {
  if (days == null) return "";
  if (days <= 0) return "ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
};

const startsText = (days) => {
  if (days == null) return "";
  if (days <= 0) return "starts today";
  if (days === 1) return "starts tomorrow";
  return `starts in ${days} days`;
};

const matchedItemNamesFor = (term, promotion) => {
  if (!term) return [];
  return (promotion.items || [])
    .filter((line) => line.name?.toLowerCase().includes(term) || line.barcode?.toLowerCase().includes(term))
    .map((line) => line.name)
    .filter(Boolean);
};

/** A draft has nothing to report on: no accent, no badge, one muted line. */
const CampaignRow = ({ promotion, ctx }) => {
  const groupKey = groupKeyOf(promotion);
  const group = GROUP_ORDER.find((entry) => entry.key === groupKey) || GROUP_ORDER[5];
  const actions = ctx.lifecycleActions(promotion);
  const budget = ctx.budgetState(promotion);
  const left = daysLeft(promotion);
  const until = daysUntil(promotion);
  const isLive = groupKey === "LIVE";
  const isEnded = groupKey === "ENDED";
  const isDraft = groupKey === "DRAFT";
  const matched = matchedItemNamesFor(ctx.search, promotion);

  return (
    <tr
      className={`border-l-4 ${isLive ? group.accent : "border-l-transparent"} ${isEnded || isDraft ? "opacity-70" : ""} cursor-pointer transition-colors hover:bg-blue-50/40`}
      onClick={() => ctx.onEdit(promotion.id)}
      title="Open this campaign"
    >
      <td className="app-table-cell align-top">
        <div className="min-w-0">
          <div className={`truncate font-semibold ${isEnded || isDraft ? "text-slate-500" : "text-slate-800"}`}>
            {promotion.name}
          </div>
          {!isDraft && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>{ctx.branchLabel(promotion)}</span>
              <span aria-hidden="true">·</span>
              <span>{ctx.targetLabel(promotion)}</span>
              <span aria-hidden="true">·</span>
              <span>{ctx.discountLabel(promotion)}</span>
              {promotion.priority ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Priority {promotion.priority}</span>
                </>
              ) : null}
            </div>
          )}
          {matched.length > 0 && (
            <div className="truncate text-xs text-slate-600">
              Includes: {matched.slice(0, 2).join(", ")}{matched.length > 2 ? ` +${matched.length - 2} more` : ""}
            </div>
          )}
        </div>
      </td>
      <td className="app-table-cell align-top text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <CalendarClock size={13} className="shrink-0 text-slate-400" />
          <span>
            {promotion.startAt ? new Date(promotion.startAt).toLocaleDateString() : "-"}
            {" – "}
            {promotion.endAt ? new Date(promotion.endAt).toLocaleDateString() : "-"}
          </span>
        </div>
        {isLive && left != null && left <= 7 && (
          <div className="mt-1 font-bold text-amber-600">{timeUntilText(left)}</div>
        )}
        {groupKey === "SCHEDULED" && until != null && (
          <div className="mt-1 font-semibold text-blue-600">{startsText(until)}</div>
        )}
      </td>
      <td className="app-table-cell align-top">
        {!isDraft && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {Number(promotion.timesRedeemed || 0) > 0 && (
              <span className="font-semibold tabular-nums text-slate-600">
                {Number(promotion.timesRedeemed).toLocaleString()} redeemed
              </span>
            )}
            {budget && (
              <span className="inline-flex min-w-32 flex-col gap-1">
                  <span className="font-semibold tabular-nums text-slate-600">
                    Budget used: {formatCurrency(budget.consumed)} of {formatCurrency(budget.budget)}
                  </span>
                  <span className="h-1 overflow-hidden rounded-full bg-slate-100" aria-label="Budget used">
                    <span
                      className={`budget-bar block h-full rounded-full ${budget.percent >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${budget.percent}%` }}
                    />
                  </span>
              </span>
            )}
            {promotion.maxTotalRedemptions != null && (
              <span className="text-slate-500">
                cap {Number(promotion.timesRedeemed || 0)}/{promotion.maxTotalRedemptions}
              </span>
            )}
            {promotion.codeCount > 0 && (
              <span className="font-semibold text-slate-600">{promotion.codeCount} code{promotion.codeCount === 1 ? "" : "s"}</span>
            )}
            {Number(promotion.timesRedeemed || 0) === 0 && !budget && promotion.maxTotalRedemptions == null && promotion.codeCount === 0 && (
              <span className="text-slate-400">No limits set</span>
            )}
          </div>
        )}
      </td>
      <td className="app-table-cell text-center align-top">
        {!isDraft && <PromotionStatusBadge promotion={promotion} />}
      </td>
      <td className="app-table-cell align-top">
        <div
          className="flex items-center justify-end gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          {actions.map((action) => (
            <Button
              key={action.key}
              size="sm"
              variant={action.primary ? "primary" : "secondary"}
              onClick={() => (action.key === "reject"
                ? ctx.onReject(promotion)
                : ctx.onLifecycle(promotion, action.key))}
            >
              {action.label}
            </Button>
          ))}
            <ActionOverflowMenu
              items={[
                { key: "duplicate", label: "Duplicate", icon: Copy, onClick: () => ctx.onDuplicate(promotion) },
                { key: "end", label: "End campaign", icon: Trash2, danger: true, onClick: () => ctx.onRetire(promotion) },
              ]}
            />
        </div>
      </td>
    </tr>
  );
};

const PromotionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canApprove = hasPermission(user?.role, "APPROVE_PROMOTIONS");
  const canEditSettings = hasPermission(user?.role, "MANAGE_PROMOTION_SETTINGS");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [discountGiven, setDiscountGiven] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [endedExpanded, setEndedExpanded] = useState(false);

  const branchNameById = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => map.set(Number(branch.id), branch.name));
    return map;
  }, [branches]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promotionRes, branchRes, historyRes] = await Promise.all([
        promotionsAPI.list(),
        branchesAPI.getAll(true),
        promotionsAPI.history().catch(() => null),
      ]);
      setPromotions(Array.isArray(promotionRes.data) ? promotionRes.data : []);
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
      const historyRows = Array.isArray(historyRes?.data) ? historyRes.data : null;
      setDiscountGiven(historyRows == null
        ? null
        : historyRows.reduce((sum, row) => sum + Number(row.totalDiscountGiven || 0), 0));
    } catch (error) {
      console.error("Failed to load promotions", error);
      toast.error(error?.response?.data?.message || "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // The search answers "which campaigns is this item in?" as well as "which campaign is this":
  // a line matches on the promotion name or on any target item's name or barcode.
  const matchesTerm = (promotion, term) => {
    if (promotion.name?.toLowerCase().includes(term)) return true;
    return (promotion.items || []).some((line) =>
      line.name?.toLowerCase().includes(term) || line.barcode?.toLowerCase().includes(term));
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return promotions.filter((promotion) => {
      if (term && !matchesTerm(promotion, term)) return false;
      if (branchFilter && Number(promotion.branchId) !== Number(branchFilter)) return false;
      if (statusFilter === "ALL") return true;
      const status = promotionStatus(promotion);
      if (statusFilter === "LIVE") return status === "LIVE" || status === "ENDING_SOON";
      return status === statusFilter;
    });
  }, [promotions, search, statusFilter, branchFilter]);

  // Client-side pages over the filtered board: campaign counts are tens, not thousands,
  // and the item-name search needs the whole list in memory anyway. The reset key means
  // every filter change starts again at page one rather than an empty page N.
  const {
    page, setPage, totalPages, pageItems,
  } = useClientPagination(visible, `${search}|${statusFilter}|${branchFilter}`, 25);
  const [pageInput, setPageInput] = useState("1");
  useEffect(() => setPageInput(String(page + 1)), [page]);

  const goToPage = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) setPage(Math.min(Math.max(parsed - 1, 0), Math.max(totalPages - 1, 0)));
  };

  const grouped = useMemo(() => {
    const byGroup = new Map(GROUP_ORDER.map((group) => [group.key, []]));
    pageItems.forEach((promotion) => {
      const groupKey = groupKeyOf(promotion);
      byGroup.get(groupKey)?.push(promotion);
    });
    return GROUP_ORDER
      .map((group) => ({ ...group, rows: byGroup.get(group.key) }))
      .filter((group) => group.rows.length > 0);
  }, [pageItems]);

  const filterCounts = useMemo(() => {
    const counts = new Map();
    promotions.forEach((promotion) => {
      if (branchFilter && Number(promotion.branchId) !== Number(branchFilter)) return;
      const term = search.trim().toLowerCase();
      if (term && !matchesTerm(promotion, term)) return;
      const status = groupKeyOf(promotion);
      counts.set(status, (counts.get(status) || 0) + 1);
      counts.set("ALL", (counts.get("ALL") || 0) + 1);
    });
    return counts;
  }, [promotions, search, branchFilter]);

  const lifecycle = async (promotion, action, note) => {
    try {
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
      toast.success("Campaign ended");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to end campaign");
    }
  };

  const targetCount = (promotion) => {
    if (promotion.scope === "ITEM") return promotion.items?.length || promotion.itemIds?.length || 0;
    if (promotion.scope === "CUSTOMER") return promotion.customerIds?.length || 0;
    if (promotion.scope === "BILL") return 0;
    return (promotion.categoryIds?.length || 0) + (promotion.subCategoryIds?.length || 0);
  };

  const targetLabel = (promotion) => {
    if (promotion.scope === "BILL") return "Any bill";
    const count = targetCount(promotion);
    if (promotion.scope === "ITEM") return `${count} item${count === 1 ? "" : "s"}`;
    if (promotion.scope === "CUSTOMER") return `${count} customer${count === 1 ? "" : "s"}`;
    return `${count} categor${count === 1 ? "y" : "ies"}`;
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

  const branchLabel = (promotion) =>
    promotion.branchId
      ? branchNameById.get(Number(promotion.branchId)) || `Branch ${promotion.branchId}`
      : "All branches";

  const budgetState = (promotion) => {
    const budget = Number(promotion.budgetAmount || 0);
    if (!budget) return null;
    const consumed = Number(promotion.budgetConsumed || 0);
    return { budget, consumed, percent: Math.min(100, (consumed / budget) * 100) };
  };

  const rowContext = {
    search: search.trim().toLowerCase(),
    onLifecycle: lifecycle,
    onDuplicate: duplicate,
    onReject: setRejectTarget,
    onRetire: setDeleteTarget,
    onEdit: (id) => navigate(`/promotions/${id}/edit`),
    lifecycleActions,
    targetLabel,
    discountLabel,
    branchLabel,
    budgetState,
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
          <Button onClick={() => navigate("/promotions/new")}>
            <Plus size={16} className="mr-2" /> New promotion
          </Button>
        </div>
      </div>

      <PromotionKpiStrip promotions={promotions} discountGiven={discountGiven} loading={loading} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search promotions or items"
            aria-label="Search promotions or items"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <StatusFilterGroup
          options={STATUS_FILTERS.map((filter) => ({ ...filter, count: filterCounts.get(filter.key) || 0 }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <CustomSelect
          value={branchFilter}
          onChange={setBranchFilter}
          options={[{ id: "", name: "All branches" }, ...branches]}
          className="w-48"
        />
      </div>

      {loading ? (
        <Card className="overflow-hidden p-0">
          <div className="py-12"><LoadingSpinner size="lg" text="Loading promotions..." /></div>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Tag size={26} className="text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {promotions.length === 0
                ? "No promotions yet. Create one to get started."
                : "No promotions match these filters."}
            </p>
            {promotions.length === 0 && (
              <>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Simulate one against last month's sales before it goes live.
                </p>
                <Button className="mt-5" onClick={() => navigate("/promotions/new")}>
                  <Plus size={15} className="mr-2" /> New promotion
                </Button>
              </>
            )}
            {promotions.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("ALL"); setBranchFilter(""); }}>
                  Clear filters
                </Button>
                <Button onClick={() => navigate("/promotions/new")}>
                  <Plus size={15} className="mr-2" /> New promotion
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="app-table-wrap">
            <table className="app-table min-w-[900px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Promotion</th>
                  <th className="app-table-head-cell">Period</th>
                  <th className="app-table-head-cell">Activity</th>
                  <th className="app-table-head-cell text-center">Status</th>
                  <th className="app-table-head-cell text-right">Actions</th>
                </tr>
              </thead>
              {grouped.map((group) => {
                // Ended campaigns collapse: they stay reachable, but 26 finished rows must not
                // push the live board below the fold.
                const isEndedGroup = group.key === "ENDED";
                const collapsed = isEndedGroup && !endedExpanded;
                return (
                  <tbody
                    key={group.key}
                    id={group.key === "ENDED" ? "ended-campaign-rows" : undefined}
                    className="app-table-body"
                  >
                    <tr>
                      <td colSpan="5" className="bg-slate-50/80 px-4 py-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                          <span className={`h-2 w-2 rounded-full ${group.dot} ${group.key === "LIVE" ? "live-dot-pulse" : ""}`} aria-hidden="true" />
                          <span>{group.label}</span>
                          <span className="tabular-nums text-slate-400">({group.rows.length})</span>
                          {isEndedGroup && (
                            <button
                              type="button"
                              aria-expanded={endedExpanded}
                              aria-controls="ended-campaign-rows"
                              onClick={() => setEndedExpanded((open) => !open)}
                              className="ml-auto font-semibold normal-case tracking-normal text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              {collapsed ? "Show" : "Hide"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {!collapsed && group.rows.map((promotion) => (
                      <CampaignRow key={promotion.id} promotion={promotion} ctx={rowContext} />
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
          {totalPages > 1 && (
            <TablePagination
              summary={`${visible.length} campaign${visible.length === 1 ? "" : "s"}`}
              page={page}
              pageInput={pageInput}
              totalPages={totalPages}
              loading={loading}
              onPageChange={(next) => setPage(Math.min(Math.max(next, 0), totalPages - 1))}
              onPageInputChange={setPageInput}
              onGoToPage={goToPage}
            />
          )}
        </Card>
      )}

      <PromotionSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ConfirmDialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(note) => {
          const target = rejectTarget;
          setRejectTarget(null);
          lifecycle(target, "reject", note);
        }}
        title="Reject Promotion"
        icon={Trash2}
        tone="warning"
        message={`Why is "${rejectTarget?.name}" being rejected?`}
        detail="The submitter sees this note with the rejection."
        confirmLabel="Reject"
        input={{ label: "Reason", placeholder: "Too deep a cut for this margin", multiline: true, rows: 3 }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove(deleteTarget)}
        title="End Campaign"
        icon={Trash2}
        message={`End "${deleteTarget?.name}"?`}
        detail="It stops applying straight away. Past sales keep their discount and stay in history."
        confirmLabel="End campaign"
      />
    </div>
  );
};

export default PromotionsPage;
