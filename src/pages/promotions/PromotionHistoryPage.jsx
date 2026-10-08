import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";

import { formatCurrency } from "../../utils/formatters";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import CustomSelect from "../../components/common/CustomSelect";
import PromotionStatusBadge from "./components/PromotionStatusBadge";
import PeriodPicker from "./components/PeriodPicker";
import HistoryTotalsStrip from "./components/HistoryTotalsStrip";
import CampaignDetailDrawer from "./components/CampaignDetailDrawer";
import { branchesAPI } from "../../api/branches.api";
import { promotionsAPI } from "../../api/promotions.api";

const isoDate = (date) => date.toISOString().slice(0, 10);

/** What promotions have actually done: item-level and bill-level discounts together. */
const PromotionHistoryPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("CAMPAIGNS");
  const [campaigns, setCampaigns] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const today = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState({
    from: isoDate(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())),
    to: isoDate(today),
    branchId: "",
    promotionId: "",
  });

  const branchNameById = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => map.set(Number(branch.id), branch.name));
    return map;
  }, [branches]);

  const params = useCallback(() => {
    const query = { from: filters.from, to: filters.to };
    if (filters.branchId) query.branchId = Number(filters.branchId);
    return query;
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [historyRes, branchRes] = await Promise.all([
          promotionsAPI.history(params()),
          branchesAPI.getAll(true),
        ]);
        if (cancelled) return;
        setCampaigns(Array.isArray(historyRes.data) ? historyRes.data : []);
        setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
      } catch (error) {
        console.error("Failed to load promotion history", error);
        toast.error(error?.response?.data?.message || "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    if (tab !== "REDEMPTIONS") return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const query = params();
        if (filters.promotionId) query.promotionId = Number(filters.promotionId);
        const response = await promotionsAPI.redemptions({ ...query, page: 0, size: 200 });
        if (!cancelled) setRedemptions(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load redemptions", error);
        toast.error(error?.response?.data?.message || "Failed to load redemptions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, params, filters.promotionId]);

  const duplicate = async (campaign) => {
    try {
      const response = await promotionsAPI.duplicate(campaign.id);
      toast.success("Copy created. Set the dates and activate it");
      setSelectedCampaign(null);
      navigate(`/promotions/${response.data.id}/edit`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to duplicate promotion");
    }
  };

  const exportRedemptions = () => {
    const header = "date,invoice,branch,promotion,level,item,discount,bill_total";
    const rows = redemptions.map((row) => [
      row.soldAt ? new Date(row.soldAt).toLocaleString() : "",
      row.invoiceNo ?? "",
      branchNameById.get(Number(row.branchId)) || row.branchId || "",
      `"${(row.promotionName ?? "").replace(/"/g, '""')}"`,
      row.level ?? "",
      `"${(row.itemName ?? "").replace(/"/g, '""')}"`,
      row.discountAmount ?? 0,
      row.orderTotal ?? 0,
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `promotion-redemptions-${filters.from}-to-${filters.to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    if (tab === "REDEMPTIONS") {
      return redemptions.reduce((acc, row) => ({
        given: acc.given + Number(row.discountAmount || 0),
        used: acc.used + 1,
        revenue: acc.revenue + Number(row.orderTotal || 0),
      }), { given: 0, used: 0, revenue: 0 });
    }
    return campaigns.reduce((acc, row) => ({
      given: acc.given + Number(row.totalDiscountGiven || 0),
      used: acc.used + Number(row.timesApplied || 0),
      revenue: acc.revenue + Number(row.totalRevenue || 0),
    }), { given: 0, used: 0, revenue: 0 });
  }, [campaigns, redemptions, tab]);

  const drawerBranch = selectedCampaign?.branchId
    ? branchNameById.get(Number(selectedCampaign.branchId)) || `Branch ${selectedCampaign.branchId}`
    : "All branches";

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/promotions")}>
            <ArrowLeft size={15} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Promotion History</h1>
            <p className="text-sm text-slate-500">What campaigns gave away and what those sales brought back.</p>
          </div>
        </div>
        {tab === "REDEMPTIONS" && (
          <Button variant="secondary" onClick={exportRedemptions} disabled={!redemptions.length}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        )}
      </div>

      <HistoryTotalsStrip totals={totals} loading={loading} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {[{ key: "CAMPAIGNS", label: "Campaigns" }, { key: "REDEMPTIONS", label: "Redemptions" }].map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              aria-pressed={tab === entry.key}
              className={`rounded-md px-4 py-1.5 text-xs font-bold ${
                tab === entry.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <PeriodPicker
          from={filters.from}
          to={filters.to}
          onChange={({ from, to }) => setFilters((prev) => ({ ...prev, from, to }))}
        />
        <CustomSelect
          value={filters.branchId}
          onChange={(v) => setFilters((prev) => ({ ...prev, branchId: v }))}
          options={[{ id: "", name: "All branches" }, ...branches]}
          className="w-48"
        />
        {tab === "REDEMPTIONS" && (
          <CustomSelect
            value={filters.promotionId}
            onChange={(v) => setFilters((prev) => ({ ...prev, promotionId: v }))}
            options={[{ id: "", name: "All promotions" }, ...campaigns]}
            className="w-56"
          />
        )}
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="py-12"><LoadingSpinner size="lg" text="Loading…" /></div>
        ) : tab === "CAMPAIGNS" ? (
          <div className="app-table-wrap">
            <table className="app-table min-w-[900px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Campaign</th>
                  <th className="app-table-head-cell">Period</th>
                  <th className="app-table-head-cell text-center">Status</th>
                  <th className="app-table-head-cell text-right">Targets</th>
                  <th className="app-table-head-cell text-right">Times used</th>
                  <th className="app-table-head-cell text-right">Discount given</th>
                  <th className="app-table-head-cell text-right">Revenue</th>
                  <th className="app-table-head-cell" />
                </tr>
              </thead>
              <tbody className="app-table-body">
                {campaigns.length === 0 ? (
                  <tr><td colSpan="8" className="app-table-empty">No campaigns in this period.</td></tr>
                ) : campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="cursor-pointer transition-colors hover:bg-blue-50/40"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <td className="app-table-cell">
                      <button type="button" className="text-left" onClick={() => setSelectedCampaign(campaign)}>
                        <div className="font-semibold text-slate-800">{campaign.name}</div>
                        <div className="text-xs text-slate-500">
                          {campaign.scope}
                          {campaign.branchId
                            ? `, ${branchNameById.get(Number(campaign.branchId)) || `Branch ${campaign.branchId}`}`
                            : ", All branches"}
                        </div>
                      </button>
                    </td>
                    <td className="app-table-cell text-xs text-slate-600">
                      {campaign.startAt ? new Date(campaign.startAt).toLocaleDateString() : "-"}
                      {" – "}
                      {campaign.endAt ? new Date(campaign.endAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="app-table-cell text-center"><PromotionStatusBadge status={campaign.status} /></td>
                    <td className="app-table-cell text-right text-slate-600">{campaign.targetCount}</td>
                    <td className="app-table-cell text-right font-medium text-slate-700">{campaign.timesApplied}</td>
                    <td className="app-table-cell text-right font-semibold text-slate-800">{formatCurrency(campaign.totalDiscountGiven)}</td>
                    <td className="app-table-cell text-right text-slate-600">{formatCurrency(campaign.totalRevenue)}</td>
                    <td className="app-table-cell text-right">
                      <Button size="sm" variant="secondary" aria-label="Open campaign details" onClick={(event) => { event.stopPropagation(); setSelectedCampaign(campaign); }}>
                        <ExternalLink size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table min-w-[960px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Date</th>
                  <th className="app-table-head-cell">Invoice</th>
                  <th className="app-table-head-cell">Branch</th>
                  <th className="app-table-head-cell">Promotion</th>
                  <th className="app-table-head-cell">Item</th>
                  <th className="app-table-head-cell text-right">Discount</th>
                  <th className="app-table-head-cell text-right">Bill total</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {redemptions.length === 0 ? (
                  <tr><td colSpan="7" className="app-table-empty">No promotion was applied in this period.</td></tr>
                ) : redemptions.map((row, index) => (
                  <tr key={`${row.orderId}-${row.level}-${row.itemId ?? index}`}>
                    <td className="app-table-cell text-xs text-slate-600">{row.soldAt ? new Date(row.soldAt).toLocaleString() : "-"}</td>
                    <td className="app-table-cell font-medium text-slate-700">{row.invoiceNo || "-"}</td>
                    <td className="app-table-cell text-slate-600">{branchNameById.get(Number(row.branchId)) || row.branchId || "-"}</td>
                    <td className="app-table-cell"><div className="text-slate-800">{row.promotionName || "-"}</div><div className="text-xs text-slate-500">{row.level === "BILL" ? "Whole bill" : "Line"}</div></td>
                    <td className="app-table-cell text-slate-600">{row.itemName || "-"}</td>
                    <td className="app-table-cell text-right font-semibold text-emerald-700">{formatCurrency(row.discountAmount)}</td>
                    <td className="app-table-cell text-right text-slate-600">{formatCurrency(row.orderTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CampaignDetailDrawer
        campaign={selectedCampaign}
        branchName={drawerBranch}
        onClose={() => setSelectedCampaign(null)}
        onDuplicate={duplicate}
        onEdit={(id) => { setSelectedCampaign(null); navigate(`/promotions/${id}/edit`); }}
      />
    </div>
  );
};

export default PromotionHistoryPage;
