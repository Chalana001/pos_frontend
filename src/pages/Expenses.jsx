import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Plus } from "lucide-react";
import { expensesAPI } from "../api/expenses.api";
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

  const isCashier = user?.role === "CASHIER";
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  // 🔴 අලුත් ලයින් එක: හිස් Array එකක් ආවත් හරියට අඳුරගන්නවා
  const hasActiveShift = Array.isArray(activeShift) ? activeShift.length > 0 : !!activeShift;

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    category: EXPENSE_CATEGORIES.OTHER,
    description: "",
    isFromDrawer: true, // Default එක true
  });

  useEffect(() => {
    fetchExpenses();
  }, [selectedBranchId, user?.role]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const from = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const to = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const branchId = isCashier ? user?.branchId : selectedBranchId;

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

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    const branchId = isCashier ? user?.branchId : selectedBranchId;
    if (!branchId) {
      return toast.error("Branch ID is missing");
    }

    try {
      const payload = {
        amount,
        category: formData.category,
        description: formData.description.trim(),
        branchId: branchId,
      };

      // 🔴 Role එක අනුව isFromDrawer එක යවනවා (hasActiveShift පාවිච්චි කරලා)
      if (isAdminOrManager) {
        payload.isFromDrawer = hasActiveShift ? formData.isFromDrawer : false;
      } 

      await expensesAPI.create(payload);

      toast.success("Expense recorded successfully");
      handleCloseModal();
      
      refreshShift?.(); 
      fetchExpenses(); 
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to record expense";
      toast.error(msg);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ amount: "", category: EXPENSE_CATEGORIES.OTHER, description: "", isFromDrawer: true });
  };

  const columns = [
    {
      header: "Date & Time",
      render: (expense) => formatDateTime(expense.createdAt),
    },
    { header: "Branch", accessor: "branchName" },
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
        <span className="font-semibold text-red-600">{formatCurrency(expense.amount)}</span>
      ),
    },
    { header: "Recorded By", accessor: "cashierName" },
  ];

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Expenses</h1>
        {/* 🔴 Cashier ට Button එක Disable කරන්නේ අලුත් variable එකෙන් */}
        <Button 
          onClick={() => setShowModal(true)}
          disabled={isCashier && !hasActiveShift}
          className={isCashier && !hasActiveShift ? "opacity-50 cursor-not-allowed" : ""}
          title={isCashier && !hasActiveShift ? "You need an open shift to record expenses" : ""}
        >
          <Plus size={20} className="mr-2" />
          Record Expense
        </Button>
      </div>

      {/* 🔴 Cashier ට Active Shift එකක් නැත්නම් Warning Message එකක් පෙන්නමු */}
      {isCashier && !hasActiveShift && (
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ No active shift. Please open a shift to view and record expenses.
            </p>
          </div>
        </Card>
      )}

      {/* 🔴 මේක තමයි අලුත් Wrapper Div එක. Cashier කෙනෙක්ට Shift එකක් නැත්නම් විතරක් පල්ලෙහා තියෙන ඔක්කොම අඳුරු වෙලා Click කරන්න බැරි වෙනවා */}
      <div className={`space-y-6 transition-all duration-300 ${isCashier && !hasActiveShift ? 'opacity-40 grayscale pointer-events-none select-none' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Today's Total</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </Card>
        </div>

        <Card>
          {loading ? <LoadingSpinner size="lg" text="Loading..." /> : <Table columns={columns} data={expenses} />}
        </Card>
      </div>

      <Modal isOpen={showModal} onClose={handleCloseModal} title="Record Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 🔴 Checkbox එක පෙන්නන්නේ අලුත් variable එක true නම් විතරයි */}
          {isAdminOrManager && hasActiveShift && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <input
                type="checkbox"
                id="isFromDrawer"
                checked={formData.isFromDrawer}
                onChange={(e) => setFormData({ ...formData, isFromDrawer: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isFromDrawer" className="text-sm font-medium text-blue-900 cursor-pointer">
                Take money from the Cash Drawer (Shift)
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {Object.values(EXPENSE_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Enter expense details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">Record Expense</Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;