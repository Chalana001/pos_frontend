import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { CalendarClock, Copy, Plus, Search, Settings, Trash2 } from "lucide-react";

import { branchesAPI } from "../../api/branches.api";
import { promotionsAPI } from "../../api/promotions.api";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import CustomSelect from "../../components/common/CustomSelect";
import Skeleton from "../../components/common/Skeleton";
import TablePagination from "../../components/common/TablePagination";
import { DISCOUNT_TYPES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";
import PromotionStatusBadge from "./components/PromotionStatusBadge";
import PromotionSettingsModal from "./components/PromotionSettingsModal";
import PromotionKpiStrip from "./components/PromotionKpiStrip";
import ActionOverflowMenu from "./components/ActionOverflowMenu";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import { promotionStatus } from "./components/promotionStatus";

/**
 * The campaign board: one flat, paginated table of the work still in play. Ended and
 * archived campaigns are deliberately absent - their numbers live in Campaign History,
 * which is the page that answers "what did this campaign do". The KPI strip reads the same
 * list response plus one history call for the discount total; no new API.
 */

const STATUS_FILTERS = [
  { value: "ALL", label: "All Statuses" },
  { value: "LIVE", label: "Live" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PENDING_APPROVAL", label: "Awaiting approval" },
  { value: "DRAFT", label: "Drafts" },
  { value: "PAUSED", label: "Paused" },
];

/** Derived state for time emphasis: "ending soon" is still live, not its own state. */
const stateKeyOf = (promotion) => {
  const status = promotionStatus(promotion);
  if (status === "ENDING_SOON") return "LIVE";
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

/** A draft has nothing to report on: no badge, one muted line. */
const CampaignRow = ({ promotion, ctx }) => {
  const stateKey = stateKeyOf(promotion);
  const actions = ctx.lifecycleActions(promotion);
  const budget = ctx.budgetState(promotion);
  const left = daysLeft(promotion);
  const until = daysUntil(promotion);
  const isLive = stateKey === "LIVE";
  const isDraft = stateKey === "DRAFT";
  const matched = matchedItemNamesFor(ctx.search, promotion);

  return (
    <tr
      className={`${isDraft ? "opacity-70" : ""} cursor-pointer transition-colors hover:bg-blue-50/40`}
      onClick={() => ctx.onEdit(promotion.id)}
      title="Open this campaign"
    >
      <td className="app-table-cell align-top">
        <div className="min-w-0">
          <div className={`truncate font-semibold ${isDraft ? "text-slate-500" : "text-slate-800"}`}>
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
        {stateKey === "SCHEDULED" && until != null && (
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
  const [summaryPromotions, setSummaryPromotions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [discountGiven, setDiscountGiven] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const branchNameById = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => map.set(Number(branch.id), branch.name));
    return map;
  }, [branches]);

  // Branches and the discount total are reference data: they change when someone edits a
  // branch or a sale, not when the board's page moves, so they load once and are refreshed
  // after the mutations that can change what the board shows.
  const loadReferenceData = async () => {
    const [branchRes, historyRes] = await Promise.all([
      branchesAPI.getAll(true),
      promotionsAPI.history().catch(() => null),
    ]);
    setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
    const historyRows = Array.isArray(historyRes?.data) ? historyRes.data : null;
    setDiscountGiven(historyRows == null
      ? null
      : historyRows.reduce((sum, row) => sum + Number(row.totalDiscountGiven || 0), 0));
  };

  const loadSummary = async () => {
    // The KPI strip and status counts read a bounded summary, not the current page: page 2
    // of the board must not make "Live now" read 25 when 40 campaigns are live.
    const response = await promotionsAPI.summary().catch(() => null);
    setSummaryPromotions(Array.isArray(response?.data?.items) ? response.data.items : []);
  };

  const loadPage = async () => {
    try {
      setLoading(true);
      const response = await promotionsAPI.list({
        page,
        size: pageSize,
        search: search.trim() || undefined,
        branchId: branchFilter || undefined,
      });
      setPromotions(Array.isArray(response.data?.items) ? response.data.items : []);
      setTotalPages(Number(response.data?.totalPages || 0));
      setTotalElements(Number(response.data?.totalElements || 0));
    } catch (error) {
      console.error("Failed to load promotions", error);
      toast.error(error?.response?.data?.message || "Failed to load promotions");
      setPromotions([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { loadPage(); }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, branchFilter]);

  useEffect(() => {
    Promise.all([loadReferenceData(), loadSummary()]).catch((error) => {
      console.error("Failed to load promotion context", error);
    });
  }, []);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const goToPage = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(page + 1));
      return;
    }
    const maxPage = totalPages > 0 ? totalPages : 1;
    setPage(Math.min(Math.max(parsed, 1), maxPage) - 1);
  };

  const summaryRows = useMemo(() => summaryPromotions.filter((promotion) => {
    const status = promotionStatus(promotion);
    if (status === "ENDED" || status === "ARCHIVED") return false;
    if (branchFilter && Number(promotion.branchId) !== Number(branchFilter)) return false;
    return true;
  }), [summaryPromotions, branchFilter]);

  const filterCounts = useMemo(() => {
    const counts = new Map();
    summaryRows.forEach((promotion) => {
      const status = promotionStatus(promotion);
      const key = status === "ENDING_SOON" ? "LIVE" : status;
      counts.set(key, (counts.get(key) || 0) + 1);
      counts.set("ALL", (counts.get("ALL") || 0) + 1);
    });
    return counts;
  }, [summaryRows]);

  // Derived statuses (live/scheduled/ended) stay client-side: the board's server filter is
  // the row's branch and the typed search, and the derived state folds on top of the page.
  const visible = useMemo(() => promotions.filter((promotion) => {
    const status = promotionStatus(promotion);
    if (status === "ENDED" || status === "ARCHIVED") return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "LIVE") return status === "LIVE" || status === "ENDING_SOON";
    return status === statusFilter;
  }), [promotions, statusFilter]);

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
      await Promise.all([loadPage(), loadSummary()]);
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
      await Promise.all([loadPage(), loadSummary()]);
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
        <div className="flex flex-wrap items-center gap-2">
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

      <PromotionKpiStrip promotions={summaryRows} discountGiven={discountGiven} loading={loading} />

      <Card className="sales-panel-enter sales-panel-hover p-4" style={{ animationDelay: "130ms" }}>
        <div className="grid grid-cols-2 gap-3 min-[440px]:grid-cols-3 min-[620px]:grid-cols-4 xl:grid-cols-12 xl:items-center">
          <div className="relative col-span-full min-[440px]:col-span-3 min-[620px]:col-span-4 xl:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input aria-label="Search campaigns or items"
              type="text"
              placeholder="Search campaigns or items..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </div>

          <div className="col-span-1 xl:col-span-2">
            <CustomSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(0);
              }}
              options={STATUS_FILTERS.map((filter) => ({
                ...filter,
                label: filter.value === "ALL"
                  ? filter.label
                  : `${filter.label} (${filterCounts.get(filter.value) || 0})`,
              }))}
              valueKey="value"
              labelKey="label"
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="col-span-1 xl:col-span-2">
            <CustomSelect
              value={branchFilter}
              onChange={(value) => {
                setBranchFilter(value);
                setPage(0);
              }}
              options={[{ id: "", name: "All branches" }, ...branches]}
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="col-span-full min-[440px]:col-span-1 min-[620px]:col-span-2 xl:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setSearch(""); setStatusFilter("ALL"); setBranchFilter(""); setPage(0); }}
              className="h-10 w-full px-4 text-sm"
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <Card className="sales-panel-enter p-0 overflow-hidden border border-slate-200" style={{ animationDelay: "190ms" }}>
        <div className="app-table-wrap w-full">
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
            <tbody className="app-table-body">
              {loading ? (
                Array.from({ length: 8 }).map((_, row) => (
                  <tr key={`skeleton-${row}`}>
                    {Array.from({ length: 5 }).map((_, cell) => (
                      <td key={cell} className="app-table-cell"><Skeleton className="h-3.5 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="5" className="app-table-empty">
                    {totalElements === 0
                      ? "No promotions yet. Create one to get started."
                      : "No campaigns match these filters."}
                  </td>
                </tr>
              ) : visible.map((promotion) => (
                <CampaignRow key={promotion.id} promotion={promotion} ctx={rowContext} />
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          summary={`Showing ${visible.length} of ${totalElements} campaigns. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          loading={loading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
      </Card>

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
