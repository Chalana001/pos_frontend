import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { Plus, TrendingDown } from "lucide-react";
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

  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
  });

  const hasOpenShift = activeShift?.status === "OPEN";

  // ✅ Reload when branch/role changes
  useEffect(() => {
    fetchCashDrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role]);

  const fetchCashDrops = async () => {
    setLoading(true);

    try {
      const today = new Date();
      const from = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const to = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // ✅ CASHIER always uses own branch
      const branchId =
        user?.role === "CASHIER" ? user?.branchId : selectedBranchId;

      if (!branchId) {
        setCashDrops([]);
        return;
      }

      const response = await cashDropsAPI.getAll({ branchId, from, to });
      setCashDrops(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      toast.error("Failed to fetch cash drops");
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

      // ✅ BACKEND MATCH:
      // CASHIER -> POST /shifts/cashdrop
      // ADMIN/MANAGER -> POST /shifts/{shiftId}/cashdrop
      if (isAdmin) {
        await shiftsAPI.cashdropById(activeShift.id, payload);
      } else {
        await shiftsAPI.addCashDropMine(payload);
      }

      toast.success("Cash drop recorded successfully");
      handleCloseModal();

      // refresh shift totals + list
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
    { header: "Recorded By", accessor: "username" },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Cash Drops</h1>

        <Button onClick={() => setShowModal(true)} disabled={!hasOpenShift}>
          <Plus size={20} className="mr-2" />
          Record Cash Drop
        </Button>
      </div>

      {!hasOpenShift && (
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ No active shift. Please open a shift to record cash drops.
            </p>
          </div>
        </Card>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Today's Total
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
            Total Drops
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

      {/* MODAL */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Record Cash Drop"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="input"
              placeholder="0.00"
              required
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">
              Amount of cash being removed from the drawer
            </p>
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
              className="input"
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
