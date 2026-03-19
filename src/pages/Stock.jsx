import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, Package, AlertTriangle, Settings2, ArrowRightLeft } from "lucide-react"; // ✅ ArrowRightLeft එකතු කළා

import { stockAPI } from "../api/stock.api";
import { itemsAPI } from "../api/items.api"; 
import api from '../api/axios'; 

import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { ADJUSTMENT_TYPES } from "../utils/constants";
import { formatCurrency } from "../utils/formatters";

import Card from "../components/common/Card";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";

const Stock = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  // --- Main Stock Data ---
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branches, setBranches] = useState([]); // ✅ Branches ලිස්ට් එක තියාගන්න

  // --- Common Modal States ---
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemBatches, setItemBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Adjustment States ---
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustFormData, setAdjustFormData] = useState({
    batchId: '',
    type: ADJUSTMENT_TYPES.MANUAL,
    qty: '',
    reason: '',
  });

  // --- Transfer States ---
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    batchId: '',
    toBranchId: '',
    qty: '',
    notes: '',
  });

  // --- Fetch Branches on Mount ---
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches'); // ඔයාගේ branches ගන්න API endpoint එක
        setBranches(res.data || []);
      } catch (error) {
        toast.error("Failed to load branches");
      }
    };
    fetchBranches();
  }, []);

  // --- Fetch Main Stock Table Data ---
  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await stockAPI.getByBranch(selectedBranchId);
      setStockItems(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch stock");
      setStockItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  // --- Calculations & Filters ---
  const filteredStock = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stockItems;

    return stockItems.filter((item) => {
      return (
        item?.itemName?.toLowerCase().includes(q) ||
        String(item?.barcode || "").toLowerCase().includes(q) ||
        String(item?.itemId || "").includes(q)
      );
    });
  }, [stockItems, searchQuery]);

  const lowStockItems = useMemo(() => {
    return stockItems.filter((item) => (item?.totalQuantity ?? 0) <= 0);
  }, [stockItems]);

  const totalValue = useMemo(() => {
    return stockItems.reduce((sum, item) => {
      const qty = item?.totalQuantity ?? 0;
      const cost = item?.costPrice ?? 0;
      return sum + qty * cost;
    }, 0);
  }, [stockItems]);

  // --- Common Helper: Load Batches ---
  // --- Common Helper: Load Batches ---
  const loadItemBatches = async (item, setFormState) => {
    setSelectedItem(item);
    setLoadingBatches(true);
    setItemBatches([]);

    try {
      const currentBranchId = selectedBranchId || 0;
      
      // ✅ itemsAPI.getById වෙනුවට itemsAPI.search එක පාවිච්චි කරනවා
      // මේකට Branch ID එක යවන නිසා Backend එකෙන්ම Batches ටික ලස්සනට පෙරලා එවනවා
      const response = await itemsAPI.search(item.itemName, currentBranchId);
      
      // Search result එකෙන් අපිට ඕන Item එක හරියටම හොයාගන්නවා
      const matchedItem = response.data?.find(i => i.id === item.itemId);
      
      // Backend එකෙන් දැනටමත් Filter කරලා එවපු නිසා, Frontend එකෙන් ආයේ Filter කරන්න ඕනේ නෑ!
      const branchBatches = matchedItem?.batches || [];
      
      setItemBatches(branchBatches);
      
      if (branchBatches.length === 1) {
        setFormState(prev => ({ ...prev, batchId: String(branchBatches[0].batchId) }));
      }
    } catch (error) {
      console.error("Batch load error:", error);
      toast.error("Failed to load item batches");
    } finally {
      setLoadingBatches(false);
    }
  };
  // --- Adjustment Handlers ---
  const handleOpenAdjust = async (item) => {
    setAdjustFormData({ batchId: '', type: ADJUSTMENT_TYPES.MANUAL, qty: '', reason: '' });
    setShowAdjustModal(true);
    await loadItemBatches(item, setAdjustFormData);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if(!adjustFormData.batchId) return toast.error("Please select a batch");

    setIsSubmitting(true);
    try {
      const currentBranchId = selectedBranchId || 0;
      await api.post('/stock-adjustments', {
        ...adjustFormData,
        branchId: currentBranchId,
        itemId: selectedItem.itemId,
        batchId: parseInt(adjustFormData.batchId),
        qty: parseInt(adjustFormData.qty),
      });

      toast.success('Stock adjusted successfully');
      setShowAdjustModal(false);
      fetchStock(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Transfer Handlers ---
  const handleOpenTransfer = async (item) => {
    setTransferFormData({ batchId: '', toBranchId: '', qty: '', notes: '' });
    setShowTransferModal(true);
    await loadItemBatches(item, setTransferFormData);
  };

  // --- Transfer Handlers ---
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if(!transferFormData.batchId) return toast.error("Please select a batch");
    if(!transferFormData.toBranchId) return toast.error("Please select destination branch");

    setIsSubmitting(true);
    try {
      const currentBranchId = selectedBranchId || 0;
      
      // ✅ Backend එක බලාපොරොත්තු වෙන හරියටම ගැලපෙන JSON Payload එක හදනවා
      const payload = {
        fromBranchId: currentBranchId,
        toBranchId: parseInt(transferFormData.toBranchId),
        note: transferFormData.notes, // Frontend eke thiyenne 'notes', eka 'note' kiyala yawanawa
        items: [
          {
            itemId: selectedItem.itemId,
            batchId: parseInt(transferFormData.batchId),
            qty: parseInt(transferFormData.qty)
          }
        ]
      };

      await api.post('/stock-transfers', payload);

      toast.success('Stock transferred successfully');
      setShowTransferModal(false);
      fetchStock(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Table Columns ---
  const columns = useMemo(
    () => [
      { header: "Item ID", accessor: "itemId" },
      { header: "Barcode", render: (item) => <span>{item.barcode ?? "-"}</span> },
      { header: "Name", render: (item) => <span className="font-medium text-slate-800">{item.itemName ?? "-"}</span> },
      { header: "Cost", render: (item) => <span>LKR {Number(item.costPrice || 0).toFixed(2)}</span> },
      { header: "Selling", render: (item) => <span>LKR {Number(item.sellingPrice || 0).toFixed(2)}</span> },
      {
        header: "Quantity",
        render: (item) => {
          const qty = item.totalQuantity ?? 0;
          const isLow = qty <= 0;
          return (
            <span className={`font-semibold ${isLow ? "text-red-600" : "text-slate-800"}`}>
              {qty}
              {isLow && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
            </span>
          );
        },
      },
      {
        header: "Status",
        render: (item) => {
          const qty = item.totalQuantity ?? 0;
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${qty > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {qty > 0 ? "In Stock" : "Out of Stock"}
            </span>
          );
        },
      },
      // ✅ Actions: Adjust and Transfer Buttons
      {
        header: "Actions",
        render: (item) => (
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => handleOpenAdjust(item)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-none"
            >
              <Settings2 size={16} /> Adjust
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => handleOpenTransfer(item)}
              className="flex items-center gap-1 text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border-none"
              disabled={(item.totalQuantity ?? 0) <= 0} // Qty 0 නම් යවන්න බෑනේ
            >
              <ArrowRightLeft size={16} /> Transfer
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedBranchId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stock Inventory</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Total Items</h3>
              <p className="text-2xl font-bold text-slate-800">{stockItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Out of Stock Items</h3>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Stock Value</h3>
          <p className="text-2xl font-bold text-green-600">LKR {Number(totalValue).toFixed(2)}</p>
        </Card>
      </div>

      {/* Table + Search */}
      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, barcode, or ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading stock..." />
          </div>
        ) : (
          <Table columns={columns} data={filteredStock} />
        )}
      </Card>

      {/* ========================================================= */}
      {/* 1. ADJUST STOCK MODAL */}
      {/* ========================================================= */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={selectedItem ? `Adjust Stock: ${selectedItem.itemName}` : "Adjust Stock"}
      >
        <form onSubmit={handleAdjustSubmit} className="p-4 space-y-4">
          {loadingBatches ? (
            <div className="py-8"><LoadingSpinner text="Loading batches..." /></div>
          ) : (
            <>
              {/* Batch Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Batch *</label>
                {itemBatches.length === 1 ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-blue-800 font-semibold">Batch #{itemBatches[0].batchId} Auto-selected</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">In Stock: {itemBatches[0].qty}</span>
                  </div>
                ) : itemBatches.length > 1 ? (
                  <select
                    value={adjustFormData.batchId}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, batchId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Choose a Batch --</option>
                    {itemBatches.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        Batch #{batch.batchId} | Qty: {batch.qty} | Price: {formatCurrency(batch.price)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">No available batches.</div>
                )}
              </div>

              {/* Adjustment Details */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Type *</label>
                <select
                  value={adjustFormData.type}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, type: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value={ADJUSTMENT_TYPES.EXPIRED}>Expired</option>
                  <option value={ADJUSTMENT_TYPES.DAMAGED}>Damaged</option>
                  <option value={ADJUSTMENT_TYPES.LOST}>Lost</option>
                  <option value={ADJUSTMENT_TYPES.FOUND}>Found</option>
                  <option value={ADJUSTMENT_TYPES.MANUAL}>Manual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  value={adjustFormData.qty}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, qty: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="e.g., -5 to remove, +5 to add"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <textarea
                  value={adjustFormData.reason}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting || itemBatches.length === 0}>
                  {isSubmitting ? "Processing..." : "Confirm Adjustment"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* 2. TRANSFER STOCK MODAL */}
      {/* ========================================================= */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title={selectedItem ? `Transfer Stock: ${selectedItem.itemName}` : "Transfer Stock"}
      >
        <form onSubmit={handleTransferSubmit} className="p-4 space-y-4">
          {loadingBatches ? (
            <div className="py-8"><LoadingSpinner text="Loading batches..." /></div>
          ) : (
            <>
              {/* Batch Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Batch *</label>
                {itemBatches.length === 1 ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-purple-800 font-semibold">Batch #{itemBatches[0].batchId} Auto-selected</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">In Stock: {itemBatches[0].qty}</span>
                  </div>
                ) : itemBatches.length > 1 ? (
                  <select
                    value={transferFormData.batchId}
                    onChange={(e) => setTransferFormData({ ...transferFormData, batchId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">-- Choose a Batch --</option>
                    {itemBatches.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        Batch #{batch.batchId} | Qty: {batch.qty} | Price: {formatCurrency(batch.price)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">No stock available to transfer.</div>
                )}
              </div>

              {/* Destination Branch Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Branch *</label>
                <select
                  value={transferFormData.toBranchId}
                  onChange={(e) => setTransferFormData({ ...transferFormData, toBranchId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">-- Select Destination Branch --</option>
                  {branches
                    .filter(b => String(b.id) !== String(selectedBranchId || 0)) // තමන්ගේම Branch එකට යවන්න බැරි වෙන්න ෆිල්ටර් කළා
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  min="1"
                  value={transferFormData.qty}
                  onChange={(e) => setTransferFormData({ ...transferFormData, qty: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="e.g., 5"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={transferFormData.notes}
                  onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  rows="2"
                  placeholder="Any details about this transfer..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" 
                  disabled={isSubmitting || itemBatches.length === 0}
                >
                  {isSubmitting ? "Processing..." : "Transfer Stock"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

    </div>
  );
};

export default Stock;