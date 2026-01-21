import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Clock } from "lucide-react";
import { shiftsAPI } from "../api/shifts.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import LoadingSpinner from "../components/common/LoadingSpinner";

const Shifts = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const { activeShift, loadingShift, refreshShift } = useShift();

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");

  // ✅ define open shift state
  const hasOpenShift = activeShift?.status === "OPEN";

  const calculateExpectedCash = () => {
    if (!activeShift) return 0;
    return (
      (activeShift.openingCash || 0) +
      (activeShift.cashSales || 0) -
      (activeShift.totalExpenses || 0) -
      (activeShift.totalCashDrops || 0)
    );
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        openingCash: parseFloat(openingCash),
        note: "",
      };

      if (isAdmin) {
        if (!selectedBranchId) return toast.error("Please select a branch");
        await shiftsAPI.openByBranch(selectedBranchId, payload);
      } else {
        await shiftsAPI.openMine(payload);
      }

      toast.success("Shift opened successfully");
      setShowOpenModal(false);
      setOpeningCash("");
      refreshShift();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open shift");
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();

    if (!activeShift) {
      toast.error("No active shift");
      return;
    }

    try {
      const payload = {
        countedCash: parseFloat(countedCash),
        note: "",
      };

      if (isAdmin) {
        await shiftsAPI.closeById(activeShift.id, payload);
      } else {
        await shiftsAPI.closeMine(payload);
      }

      toast.success("Shift closed successfully");
      setShowCloseModal(false);
      setCountedCash("");
      refreshShift();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close shift");
    }
  };

  if (loadingShift) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading shift data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Shift Management</h1>

        {/* ✅ INDUSTRY FIX: CLOSED/null => show Open | OPEN => show Close */}
        {!hasOpenShift ? (
          <Button onClick={() => setShowOpenModal(true)} variant="success">
            <Clock size={20} className="mr-2" />
            Open Shift
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setShowCloseModal(true)} variant="danger">
              <Clock size={20} className="mr-2" />
              Close Shift
            </Button>
          </div>
        )}
      </div>

      {/* BODY */}
      {!hasOpenShift ? (
        <Card>
          <div className="text-center py-12">
            <Clock size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              No Active Shift
            </h3>
            <p className="text-slate-600 mb-6">
              {isAdmin
                ? "Select branch and open a shift"
                : "Open a shift to start accepting orders"}
            </p>
            <Button onClick={() => setShowOpenModal(true)} variant="success">
              Open New Shift
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Status</h3>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                OPEN
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {formatDateTime(activeShift.openedAt)}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Opening Cash
            </h3>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(activeShift.openingCash || 0)}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Cash Sales
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(activeShift.cashSales || 0)}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Expenses
            </h3>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(activeShift.totalExpenses || 0)}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Cash Drops
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(activeShift.totalCashDrops || 0)}
            </p>
          </Card>

          <Card className="md:col-span-2 lg:col-span-3">
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Expected Cash in Drawer
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(calculateExpectedCash())}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Opening Cash + Cash Sales - Expenses - Cash Drops
            </p>
          </Card>
        </div>
      )}

      {/* OPEN SHIFT MODAL */}
      <Modal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title="Open New Shift"
      >
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Opening Cash Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="input"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Open Shift
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowOpenModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* CLOSE SHIFT MODAL */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Close Shift"
      >
        <form onSubmit={handleCloseShift} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Opening Cash:</span>
              <span className="font-semibold">
                {formatCurrency(activeShift?.openingCash || 0)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Cash Sales:</span>
              <span className="font-semibold text-green-600">
                +{formatCurrency(activeShift?.cashSales || 0)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Expenses:</span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(activeShift?.totalExpenses || 0)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Cash Drops:</span>
              <span className="font-semibold text-blue-600">
                -{formatCurrency(activeShift?.totalCashDrops || 0)}
              </span>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Expected Cash:</span>
              <span className="text-blue-600">
                {formatCurrency(calculateExpectedCash())}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Counted Cash Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="input"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {countedCash && (
            <div
              className={`p-4 rounded-lg ${
                parseFloat(countedCash) === calculateExpectedCash()
                  ? "bg-green-50 border border-green-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <p className="text-sm font-medium">
                {parseFloat(countedCash) === calculateExpectedCash()
                  ? "✓ Cash count matches expected amount"
                  : `⚠️ Difference: ${formatCurrency(
                      Math.abs(parseFloat(countedCash) - calculateExpectedCash())
                    )}`}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" variant="danger" className="flex-1">
              Close Shift
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCloseModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shifts;
