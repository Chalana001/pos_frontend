import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { Plus, TrendingDown, Calendar } from "lucide-react"; // 🚀 Calendar icon එක ගත්තා
import { cashDropsAPI } from "../api/cashDrops.api";
import { shiftsAPI } from "../api/shifts.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";

const CashDrops = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const { activeShift, refreshShift } = useShift();

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  const [cashDrops, setCashDrops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // 🚀 Date Filter State (මුලින්ම අද දවස තෝරලා තියෙන්නේ)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
  });

  const currentShift = Array.isArray(activeShift) ? activeShift[0] : activeShift;
  const hasOpenShift = currentShift?.status === "OPEN" || !!currentShift;

  // 🚀 Date එක වෙනස් වෙද්දිත් ඔටෝ ඩේටා ලෝඩ් වෙන්න Dependency එකට Dates දැම්මා
  useEffect(() => {
    fetchCashDrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, startDate, endDate]); 

  const fetchCashDrops = async () => {
    setLoading(true);

    try {
      // 🚀 තෝරපු දවස් දෙකට අදාළව හරියටම Time එක සෙට් කරනවා
      const fromDate = new Date(startDate);
      fromDate.setHours(0, 0, 0, 0);
      const from = fromDate.toISOString();

      const toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
      const to = toDate.toISOString();

      // Role එක අනුව Branch ID එක ගන්නවා (Admin නම් Context එකෙන්, Cashier නම් එයාගේම එක)
      const branchId = user?.role === "CASHIER" ? user?.branchId : selectedBranchId;

      // branchId එකක් නැත්නම් (e.g. Admin All branches තෝරලා තියෙනවා නම්) 0 විදිහට යවමු 
      // එතකොට Backend එකේ Query එකේ IS NULL කොටසෙන් ඔක්කොම එනවා.
      const queryBranchId = branchId || 0; 

      const response = await cashDropsAPI.getAll({ branchId: queryBranchId, from, to });
      
      // 🔴 අලුත් වෙනස: Spring Boot Pagination වලින් එන නිසා data.content ගන්න ඕනේ
      const dataList = response.data?.content || response.data || [];
      setCashDrops(Array.isArray(dataList) ? dataList : []);

    } catch (err) {
      toast.error("Failed to fetch cash drops");
      setCashDrops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasOpenShift) {
      toast.error("No active shift. Please open a shift first.");
      return;
    }

    const amount = parseFloat(formData.amount);

    if (!amount || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    const reason = formData.reason.trim();
    if (!reason) {
      toast.error("Reason is required");
      return;
    }

    try {
      const payload = { amount, reason };

      if (isAdmin) {
        await shiftsAPI.cashdropById(currentShift.id, payload);
      } else {
        await shiftsAPI.addCashDropMine(payload); // මේක Cashier ගේ එක
      }

      toast.success("Cash drop recorded successfully");
      handleCloseModal();

      refreshShift?.();
      fetchCashDrops();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record cash drop");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ amount: "", reason: "" });
  };

  const totalCashDrops = cashDrops.reduce(
    (sum, drop) => sum + (drop.amount || 0),
    0
  );

  const columns = [
    {
      header: "Date & Time",
      render: (drop) => formatDateTime(drop.createdAt),
    },
    { header: "Reason", accessor: "reason" },
    {
      header: "Amount",
      render: (drop) => (
        <span className="font-semibold text-blue-600">
          {formatCurrency(drop.amount)}
        </span>
      ),
    },
    { header: "Recorded By", accessor: "cashierName" }, // 🚀 Backend DTO එකේ cashierName කියලා එව්ව නිසා මේක හැදුවා
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Cash Drops</h1>

        <div className="flex items-center gap-4">
          {/* 🚀 Date Filter UI කෑල්ල */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 cursor-pointer outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 cursor-pointer outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Record Button */}
          <Button 
            onClick={() => setShowModal(true)} 
            disabled={!hasOpenShift}
            className={!hasOpenShift ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Plus size={20} className="mr-2" />
            Record Drop
          </Button>
        </div>
      </div>

      {!hasOpenShift && (
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ No active shift. Please open a shift to view and record cash drops.
            </p>
          </div>
        </Card>
      )}

      {/* Wrapper Div */}
      <div className={`space-y-6 transition-all duration-300 ${!hasOpenShift && user?.role === 'CASHIER' ? 'opacity-40 grayscale pointer-events-none select-none' : ''}`}>
        
        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2">
                  Total Drop Amount
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalCashDrops)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="text-blue-600" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Number of Drops
            </h3>
            <p className="text-2xl font-bold text-slate-800">
              {cashDrops.length}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Average Drop
            </h3>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(
                cashDrops.length > 0 ? totalCashDrops / cashDrops.length : 0
              )}
            </p>
          </Card>
        </div>

        {/* TABLE */}
        <Card>
          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading cash drops..." />
            </div>
          ) : (
            <Table columns={columns} data={cashDrops} />
          )}
        </Card>

      </div>

      {/* MODAL */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Record Cash Drop"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields same as before... */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="input w-full"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              className="input w-full"
              rows="3"
              placeholder="e.g., Safe deposit, Bank deposit, etc."
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={!hasOpenShift}>
              Record Cash Drop
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashDrops;