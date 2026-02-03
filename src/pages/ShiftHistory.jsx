import React, { useState, useEffect, useCallback } from "react";
import { RefreshCcw, User, Calendar, Tag } from "lucide-react";
import { shiftsAPI } from "../api/shifts.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext"; // ✅ BranchContext එක ගත්තා
import { formatCurrency, formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";

const ShiftHistory = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch(); // ✅ Global branch selector එකෙන් අගය ගන්නවා
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    cashierId: !isAdmin ? user?.id : "", 
    status: "",
  });

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Global branchId එක filters සමඟ එකතු කරනවා
      const queryFilters = {
        ...filters,
        branchId: selectedBranchId, 
      };
      
      const response = await shiftsAPI.getAll(queryFilters);
      setShifts(response.data);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedBranchId]); // ✅ branchId වෙනස් වන විටත් fetch වෙනවා

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* FILTERS CARD */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <User size={14} /> Cashier ID
              </label>
              <input type="number" name="cashierId" placeholder="User ID" value={filters.cashierId} onChange={handleInputChange} className="input w-full" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
              <Tag size={14} /> Status
            </label>
            <select name="status" value={filters.status} onChange={handleInputChange} className="input w-full">
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TABLE */}
      {loading ? (
        <LoadingSpinner text="Fetching detailed records..." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Timing</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Cashier Details</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">In Drawer</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Difference</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-medium text-slate-800">{formatDateTime(s.openedAt)}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase">
                        {s.closedAt ? `Closed: ${formatDateTime(s.closedAt)}` : "Ongoing Shift"}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700">ID: {s.cashierUserId}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Branch: #{s.branchId}</span>
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
        </div>
      )}
    </div>
  );
};

export default ShiftHistory;