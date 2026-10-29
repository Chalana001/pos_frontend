import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";

import { formatCurrency } from "../../utils/formatters";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import CustomSelect from "../../components/common/CustomSelect";
import Skeleton from "../../components/common/Skeleton";
import TablePagination from "../../components/common/TablePagination";
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
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const branchNameById = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => map.set(Number(branch.id), branch.name));
    return map;
  }, [branches]);

  const params = useMemo(() => {
    const query = { from: filters.from, to: filters.to };
    if (filters.branchId) query.branchId = Number(filters.branchId);
    return query;
  }, [filters]);

  const changeFilters = (next) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(0);
  };

  // The campaign list also feeds the redemption tab's promotion dropdown, so it is loaded
  // with search and branch applied but a bounded page, not as an unbounded reference list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [historyRes, branchRes] = await Promise.all([
          promotionsAPI.history({
            ...params,
            page,
            size: pageSize,
            search: search.trim() || undefined,
          }),
          branchesAPI.getAll(true),
        ]);
        if (cancelled) return;
        setCampaigns(Array.isArray(historyRes.data?.items) ? historyRes.data.items : []);
        setTotalPages(Number(historyRes.data?.totalPages || 0));
        setTotalElements(Number(historyRes.data?.totalElements || 0));
        setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
      } catch (error) {
        console.error("Failed to load promotion history", error);
        toast.error(error?.response?.data?.message || "Failed to load history");
        setCampaigns([]);
        setTotalPages(0);
        setTotalElements(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params, page, pageSize, search]);

  useEffect(() => {
    if (tab !== "REDEMPTIONS") return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const query = { ...params, page, size: 100 };
        if (filters.promotionId) query.promotionId = Number(filters.promotionId);
        const response = await promotionsAPI.redemptions(query);
        if (cancelled) return;
        setRedemptions(Array.isArray(response.data?.items) ? response.data.items : []);
        setTotalPages(Number(response.data?.totalPages || 0));
        setTotalElements(Number(response.data?.totalElements || 0));
      } catch (error) {
        console.error("Failed to load redemptions", error);
        toast.error(error?.response?.data?.message || "Failed to load redemptions");
        setRedemptions([]);
        setTotalPages(0);
        setTotalElements(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, params, filters.promotionId, page]);

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
    anchor.download = `promotion-redemptions-${filters.from}-to-${filters.to}-page-${page + 1}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Page-level totals: the strip is what this page has in hand, which is exactly what a
  // manager scans before paging deeper. Whole-period totals are a report question.
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
            <Download size={16} className="mr-2" /> Export page CSV
          </Button>
        )}
      </div>

      <HistoryTotalsStrip totals={totals} loading={loading} />

      <Card className="sales-panel-enter sales-panel-hover p-4">
        <div className="grid grid-cols-2 gap-3 min-[440px]:grid-cols-3 min-[620px]:grid-cols-4 xl:grid-cols-12 xl:items-center">
          <div className="flex col-span-full min-[440px]:col-span-3 min-[620px]:col-span-4 xl:col-span-4">
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {[{ key: "CAMPAIGNS", label: "Campaigns" }, { key: "REDEMPTIONS", label: "Redemptions" }].map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => { setTab(entry.key); setPage(0); setPageSize(entry.key === "REDEMPTIONS" ? 100 : 25); }}
                  aria-pressed={tab === entry.key}
                  className={`rounded-md px-4 py-1.5 text-xs font-bold ${
                    tab === entry.key ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "CAMPAIGNS" ? (
            <div className="relative col-span-full min-[440px]:col-span-3 min-[620px]:col-span-4 xl:col-span-3">
              <input
                aria-label="Search campaign history"
                type="text"
                placeholder="Search campaigns..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              />
            </div>
          ) : (
            <div className="col-span-1 xl:col-span-2">
              <CustomSelect
                value={filters.promotionId}
                onChange={(value) => changeFilters({ promotionId: value })}
                options={[{ id: "", name: "All promotions" }, ...campaigns]}
                buttonClassName="h-10 rounded-lg"
              />
            </div>
          )}

          <div className="col-span-1 xl:col-span-3">
            <PeriodPicker
              from={filters.from}
              to={filters.to}
              onChange={({ from, to }) => changeFilters({ from, to })}
            />
          </div>

          <div className="col-span-1 xl:col-span-2">
            <CustomSelect
              value={filters.branchId}
              onChange={(value) => changeFilters({ branchId: value })}
              options={[{ id: "", name: "All branches" }, ...branches]}
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="col-span-1 xl:col-span-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearch("");
                setFilters({ from: filters.from, to: filters.to, branchId: "", promotionId: "" });
                setPage(0);
              }}
              className="h-10 w-full px-4 text-sm"
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <Card className="sales-panel-enter p-0 overflow-hidden border border-slate-200">
        <div className="app-table-wrap w-full">
          {tab === "CAMPAIGNS" ? (
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
                {loading ? (
                  Array.from({ length: 8 }).map((_, row) => (
                    <tr key={`skeleton-${row}`}>
                      {Array.from({ length: 8 }).map((_, cell) => (
                        <td key={cell} className="app-table-cell"><Skeleton className="h-3.5 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : campaigns.length === 0 ? (
                  <tr><td colSpan="8" className="app-table-empty">No campaigns in this period.</td></tr>
                ) : campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="cursor-pointer transition-colors hover:bg-accent-soft/40"
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
          ) : (
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
                {loading ? (
                  Array.from({ length: 8 }).map((_, row) => (
                    <tr key={`skeleton-${row}`}>
                      {Array.from({ length: 7 }).map((_, cell) => (
                        <td key={cell} className="app-table-cell"><Skeleton className="h-3.5 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : redemptions.length === 0 ? (
                  <tr><td colSpan="7" className="app-table-empty">No promotion was applied in this period.</td></tr>
                ) : redemptions.map((row, index) => (
                  <tr key={`${row.orderId}-${row.level}-${row.itemId ?? index}`}>
                    <td className="app-table-cell text-xs text-slate-600">{row.soldAt ? new Date(row.soldAt).toLocaleString() : "-"}</td>
                    <td className="app-table-cell font-medium text-slate-700">{row.invoiceNo || "-"}</td>
                    <td className="app-table-cell text-slate-600">{branchNameById.get(Number(row.branchId)) || row.branchId || "-"}</td>
                    <td className="app-table-cell"><div className="text-slate-800">{row.promotionName || "-"}</div><div className="text-xs text-slate-500">{row.level === "BILL" ? "Whole bill" : "Line"}</div></td>
                    <td className="app-table-cell text-slate-600">{row.itemName || "-"}</td>
                    <td className="app-table-cell text-right font-semibold text-success">{formatCurrency(row.discountAmount)}</td>
                    <td className="app-table-cell text-right text-slate-600">{formatCurrency(row.orderTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <TablePagination
          summary={`Showing ${(tab === "CAMPAIGNS" ? campaigns : redemptions).length} of ${totalElements} records. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          loading={loading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
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
