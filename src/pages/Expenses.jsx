import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Plus, Calendar } from "lucide-react"; // 🚀 Calendar එක Import කළා
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

  const hasActiveShift = Array.isArray(activeShift) ? activeShift.length > 0 : !!activeShift;

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // 🚀 Date Filter State (මුලින්ම අද දවස තෝරලා තියෙන්නේ)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    amount: "",
    category: EXPENSE_CATEGORIES.OTHER,
    description: "",
    isFromDrawer: true,
  });

  // 🚀 Date එක වෙනස් වෙද්දිත් ඔටෝ ලෝඩ් වෙන්න Dependency එකට Dates දැම්මා
  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, startDate, endDate]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // 🚀 400 Bad Request එක නවත්තන Timezone-safe Date Formatting එක
      const fromDate = new Date(startDate);
      fromDate.setHours(0, 0, 0, 0);
      const from = new Date(fromDate.getTime() - (fromDate.getTimezoneOffset() * 60000)).toISOString().split('.')[0];

      const toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
      const to = new Date(toDate.getTime() - (toDate.getTimezoneOffset() * 60000)).toISOString().split('.')[0];

      const branchId = isCashier ? user?.branchId : selectedBranchId;
      const queryBranchId = branchId || 0;

      const response = await expensesAPI.getAll({ branchId: queryBranchId, from, to });
      
      // 🚀 Array එකක් හෝ Page එකක් ආවත් හරියට අල්ලගන්නවා
      const dataList = response.data?.content || response.data || [];
      setExpenses(Array.isArray(dataList) ? dataList : []);
    } catch (err) {
      toast.error("Failed to fetch expenses");
      setExpenses([]);
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
      
      {/* 🚀 HEADER with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Expenses</h1>
        
        <div className="flex items-center gap-4">
          {/* 🚀 Date Filter UI */}
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
      </div>

      {isCashier && !hasActiveShift && (
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ No active shift. Please open a shift to view and record expenses.
            </p>
          </div>
        </Card>
      )}

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
              className="input w-full"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="input w-full min-h-[100px]"
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