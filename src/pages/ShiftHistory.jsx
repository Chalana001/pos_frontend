import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCcw, User, Calendar, Tag, ChevronRight } from "lucide-react";
import { shiftsAPI } from "../api/shifts.api";
import { usersAPI } from "../api/users.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext"; 
import { formatCurrency, formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import TablePagination from "../components/common/TablePagination";
import CustomSelect from "../components/common/CustomSelect"; // 🟢 Custom Select එක Import කළා

const ShiftHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [shifts, setShifts] = useState([]);
  const [cashierOptions, setCashierOptions] = useState([{ value: "", label: "All Cashiers" }]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    cashierId: !isAdmin ? user?.id : "", 
    status: "",
  });

  // 🟢 Custom Select එකට ඕන කරන Options Array එක
  const statusOptions = [
    { id: "", name: "All Statuses" },
    { id: "OPEN", name: "Open" },
    { id: "CLOSED", name: "Closed" }
  ];

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const queryFilters = {
        ...filters,
        branchId: selectedBranchId,
        page,
        size: pageSize
      };
      
      const response = await shiftsAPI.getAll(queryFilters);
      const itemsArray = response.data.content ? response.data.content : (Array.isArray(response.data) ? response.data : []);
      
      setShifts(itemsArray);
      setTotalPages(response.data.totalPages || 0);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedBranchId, page, pageSize]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    const loadCashiers = async () => {
      if (!isAdmin) {
        return;
      }

      const allOption = { value: "", label: "All Cashiers" };
      try {
        const branchId = selectedBranchId > 0 ? selectedBranchId : user?.branchId;
        const response = await usersAPI.salesFilter(branchId ? { branchId } : {});
        const options = (Array.isArray(response.data) ? response.data : []).map((cashier) => ({
          value: String(cashier.id),
          label: cashier.username || `User ${cashier.id}`,
        }));
        setCashierOptions([allOption, ...options]);
        if (filters.cashierId && !options.some((option) => option.value === String(filters.cashierId))) {
          setFilters((prev) => ({ ...prev, cashierId: "" }));
          setPage(0);
        }
      } catch (error) {
        console.error("Failed to load cashier filter users:", error);
        setCashierOptions([allOption]);
      }
    };

    loadCashiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedBranchId, user?.branchId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }

    const maxPage = totalPages > 0 ? totalPages : 1;
    setPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  return (
    <div className="page-enter space-y-6 p-4">
      <div className="page-section-enter flex flex-col justify-between gap-4 md:flex-row md:items-center" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Shifts Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Viewing records for {isAdmin ? "selected branch" : "your account"}
          </p>
        </div>
        <Button onClick={fetchShifts} variant="secondary" className="w-fit">
          <RefreshCcw size={18} className="mr-2" /> Refresh Data
        </Button>
      </div>

      <Card className="sales-panel-enter sales-panel-hover border-slate-200 bg-white shadow-sm" style={{ animationDelay: "90ms" }}>
        <div className="inventory-filter-bar grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ animationDelay: "130ms" }}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
              <Calendar size={14} /> From Date
            </label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleInputChange} className="input w-full" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
              <Calendar size={14} /> To Date
            </label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleInputChange} className="input w-full" />
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
                <User size={14} /> Cashier
              </label>
              <CustomSelect
                value={filters.cashierId}
                onChange={(val) => {
                  setFilters((prev) => ({ ...prev, cashierId: val }));
                  setPage(0);
                }}
                options={cashierOptions}
                valueKey="value"
                labelKey="label"
                placeholder="All Cashiers"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
              <Tag size={14} /> Status
            </label>
            {/* 🟢 Custom Select එක පාවිච්චි කරලා තියෙන විදිහ */}
            <CustomSelect
              value={filters.status}
              onChange={(val) => {
                setFilters((prev) => ({ ...prev, status: val }));
                setPage(0);
              }}
              options={statusOptions}
              placeholder="All Statuses"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner text="Fetching detailed records..." />
      ) : (
        <div className="sales-panel-enter overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" style={{ animationDelay: "130ms" }}>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead className="app-table-head">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Timing</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Cashier Details</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">In Drawer</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Difference</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Notes</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-blue-50/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/shifts/history/${s.id}`)}
                  >
                    <td className="p-4">
                      <p className="text-sm font-medium text-slate-800">{formatDateTime(s.openedAt)}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase">
                        {s.closedAt ? `Closed: ${formatDateTime(s.closedAt)}` : "Ongoing Shift"}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700">{s.cashierName || `User ${s.cashierUserId}`}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{s.branchName || `Branch #${s.branchId}`}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(s.expectedCash || 0)}</p>
                      <p className="text-[10px] text-slate-400">Sales: {formatCurrency(s.cashSales)}</p>
                    </td>
                    <td className={`p-4 text-right font-bold text-sm ${
                      (s.cashDifference || 0) < 0 ? 'text-red-600' : (s.cashDifference > 0 ? 'text-blue-600' : 'text-slate-400')
                    }`}>
                      {s.status === 'CLOSED' ? formatCurrency(s.cashDifference) : '--'}
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-slate-500 italic max-w-[120px] truncate" title={s.closeNote || s.openNote}>
                        {s.closeNote || s.openNote || "—"}
                      </p>
                    </td>
                    <td className="p-4 text-right text-slate-400">
                      <ChevronRight size={18} className="inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shifts.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-400">No shift records found for the selected criteria.</p>
            </div>
          )}
          
          <TablePagination
            summary={`Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
            page={page}
            pageInput={pageInput}
            totalPages={totalPages}
            loading={loading}
            onPageChange={setPage}
            onPageInputChange={setPageInput}
            onGoToPage={goToPage}
          />
        </div>
      )}
    </div>
  );
};

export default ShiftHistory;
