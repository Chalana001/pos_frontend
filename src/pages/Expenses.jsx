import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { Plus } from "lucide-react";
import { expensesAPI } from "../api/expenses.api";
import { shiftsAPI } from "../api/shifts.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { EXPENSE_CATEGORIES } from "../utils/constants";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";

const Expenses = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const { activeShift, refreshShift } = useShift();

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    category: EXPENSE_CATEGORIES.OTHER,
    description: "",
  });

  const hasOpenShift = activeShift?.status === "OPEN";

  // ✅ Branch-wise expenses fetch
  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role]);

  const fetchExpenses = async () => {
    setLoading(true);

    try {
      const today = new Date();
      const from = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const to = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // ✅ CASHIER always uses own branch
      const branchId =
        user?.role === "CASHIER" ? user?.branchId : selectedBranchId;

      // ✅ If admin/manager didn't select branch yet
      if (!branchId) {
        setExpenses([]);
        return;
      }

      const response = await expensesAPI.getAll({ branchId, from, to });
      setExpenses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Shift must exist & open
    if (!hasOpenShift) {
      toast.error("No active shift. Please open a shift first.");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    try {
      const payload = {
        amount,
        category: formData.category,
        description: formData.description.trim(),
      };

      // ✅ BACKEND MATCH:
      // CASHIER -> POST /shifts/expense
      // ADMIN/MANAGER -> POST /shifts/{shiftId}/expense
      if (isAdmin) {
        await shiftsAPI.expenseById(activeShift.id, payload);
      } else {
        await shiftsAPI.addExpenseMine(payload);
      }

      toast.success("Expense recorded successfully");
      handleCloseModal();

      // refresh shift totals + list
      refreshShift?.();
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record expense");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      amount: "",
      category: EXPENSE_CATEGORIES.OTHER,
      description: "",
    });
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const columns = [
    {
      header: "Date & Time",
      render: (expense) => formatDateTime(expense.createdAt),
    },
    {
      header: "Category",
      render: (expense) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {expense.category}
        </span>
      ),
    },
    { header: "Description", accessor: "description" },
    {
      header: "Amount",
      render: (expense) => (
        <span className="font-semibold text-red-600">
          {formatCurrency(expense.amount)}
        </span>
      ),
    },
    { header: "Recorded By", accessor: "username" },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Expenses</h1>

        <Button onClick={() => setShowModal(true)} disabled={!hasOpenShift}>
          <Plus size={20} className="mr-2" />
          Record Expense
        </Button>
      </div>

      {!hasOpenShift && (
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ No active shift. Please open a shift to record expenses.
            </p>
          </div>
        </Card>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">
            Today's Total
          </h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(totalExpenses)}
          </p>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Tea</h3>
          <p className="text-xl font-bold text-slate-800">
            {formatCurrency(
              expenses
                .filter((e) => e.category === "TEA")
                .reduce((s, e) => s + (e.amount || 0), 0)
            )}
          </p>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Lunch</h3>
          <p className="text-xl font-bold text-slate-800">
            {formatCurrency(
              expenses
                .filter((e) => e.category === "LUNCH")
                .reduce((s, e) => s + (e.amount || 0), 0)
            )}
          </p>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Other</h3>
          <p className="text-xl font-bold text-slate-800">
            {formatCurrency(
              expenses
                .filter((e) => e.category === "OTHER")
                .reduce((s, e) => s + (e.amount || 0), 0)
            )}
          </p>
        </Card>
      </div>

      {/* TABLE */}
      <Card>
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading expenses..." />
          </div>
        ) : (
          <Table columns={columns} data={expenses} />
        )}
      </Card>

      {/* MODAL */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title="Record Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="input"
              required
            >
              <option value={EXPENSE_CATEGORIES.TEA}>Tea</option>
              <option value={EXPENSE_CATEGORIES.LUNCH}>Lunch</option>
              <option value={EXPENSE_CATEGORIES.TRANSPORT}>Transport</option>
              <option value={EXPENSE_CATEGORIES.OTHER}>Other</option>
            </select>
          </div>

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
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input"
              rows="3"
              placeholder="Enter expense details..."
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={!hasOpenShift}>
              Record Expense
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

export default Expenses;
