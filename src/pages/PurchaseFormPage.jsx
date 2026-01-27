import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import SupplierQuickAddModal from "../components/purchase/SupplierQuickAddModal";
import { suppliersAPI } from "../api/suppliers.api";
import { itemsAPI } from "../api/items.api";
import { branchesAPI } from "../api/branches.api";
import { purchasesAPI } from "../api/purchases.api";
import { Plus, Trash2, Save, Copy } from "lucide-react";
import { toast } from "react-hot-toast";

const PurchaseFormPage = () => {
  const navigate = useNavigate();

  // --- HEADER DATA ---
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // --- ITEM SELECTION & DISTRIBUTION STATE ---
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // This object holds inputs for each branch: { branchId: { cost, sell, qty, expiry } }
  const [branchInputs, setBranchInputs] = useState({});

  // --- CART STATE ---
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [suppRes, branchRes] = await Promise.all([
        suppliersAPI.list(),
        branchesAPI.getAll()
      ]);
      setSuppliers(suppRes.data || []);
      setBranches(branchRes.data || []);
    } catch (e) {
      toast.error("Failed to load initial data");
    }
  };

  const handleSupplierCreated = (newSupplier) => {
    setSuppliers((prev) => [...prev, newSupplier]);
    setSupplierId(newSupplier.id);
  };

  // --- 1. SEARCH ITEM ---
  const searchItems = async (q) => {
    setSearch(q);
    if (!q) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await itemsAPI.search(q);
      setSearchResults(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // --- 2. SELECT ITEM & INITIALIZE BRANCH INPUTS ---
  const selectItem = (item) => {
    setSelectedItem(item);
    setSearch("");
    setSearchResults([]);

    // Initialize inputs for all branches with Item's default prices
    const initialInputs = {};
    branches.forEach(b => {
      initialInputs[b.id] = {
        cost: item.costPrice || 0,
        sell: item.sellingPrice || 0,
        qty: "",
        expiry: ""
      };
    });
    setBranchInputs(initialInputs);
  };

  const handleInputChange = (branchId, field, value) => {
    setBranchInputs(prev => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        [field]: value
      }
    }));
  };

  const applyPricesToAll = (sourceBranchId) => {
    const source = branchInputs[sourceBranchId];
    const newInputs = { ...branchInputs };
    branches.forEach(b => {
      if (b.id !== sourceBranchId) {
        newInputs[b.id] = {
          ...newInputs[b.id],
          cost: source.cost,
          sell: source.sell,
          expiry: source.expiry
        };
      }
    });
    setBranchInputs(newInputs);
    toast.success("Prices applied to all branches");
  };

  // --- 3. ADD TO CART ---
  const handleAddToList = () => {
    if (!selectedItem) return;

    const newRows = [];

    Object.entries(branchInputs).forEach(([branchIdStr, data]) => {
      const qty = Number(data.qty);
      if (qty > 0) {
        const branch = branches.find(b => b.id == branchIdStr);

        newRows.push({
          uniqueId: Date.now() + Math.random(),
          itemId: selectedItem.id,
          name: selectedItem.name,
          barcode: selectedItem.barcode,
          branchId: Number(branchIdStr),
          branchName: branch?.name || "Unknown",
          qty: qty,
          costPrice: Number(data.cost),
          sellingPrice: Number(data.sell),
          expiryDate: data.expiry || null,
          lineTotal: qty * Number(data.cost)
        });
      }
    });

    if (newRows.length === 0) {
      toast.error("Please enter Quantity for at least one branch");
      return;
    }

    setCartItems(prev => [...prev, ...newRows]);
    setSelectedItem(null);
    setBranchInputs({});
  };

  const handleRemoveItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // --- 4. SUBMIT (Updated for New DTO) ✅ ---
  const handleSubmit = async () => {
    if (!supplierId) return toast.error("Please select a Supplier");
    if (cartItems.length === 0) return toast.error("No items in the list");

    // 1. Group items by Branch ID (Frontend Transformation)
    const branchesMap = {};

    cartItems.forEach(item => {
        if (!branchesMap[item.branchId]) {
            branchesMap[item.branchId] = {
                branchId: item.branchId,
                items: []
            };
        }

        branchesMap[item.branchId].items.push({
            itemId: item.itemId,
            qty: item.qty,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            expiryDate: item.expiryDate // Backend will handle null if sent as null
        });
    });

    // 2. Convert Map to Array for DTO
    const branchesPayload = Object.values(branchesMap);

    // 3. Construct Final Payload (CreatePurchaseRequest)
    const payload = {
        supplierId: Number(supplierId),
        invoiceNo: invoiceNo || "PURCHASE", // Default text if empty
        branches: branchesPayload
    };

    console.log("Sending Payload:", payload); // Debugging purpose

    try {
      // 4. Send SINGLE Request
      await purchasesAPI.create(payload);
      
      toast.success("Purchase saved successfully!");
      navigate("/purchases"); // Redirect to history
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save purchase.");
    }
  };

  const grandTotal = cartItems.reduce((acc, curr) => acc + curr.lineTotal, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Title */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">New Purchase</h1>
        <div className="text-right">
          <p className="text-sm text-slate-500">Grand Total</p>
          <p className="text-2xl font-bold text-blue-600">{grandTotal.toLocaleString()} LKR</p>
        </div>
      </div>

      {/* --- INVOICE DETAILS --- */}
      <Card className="p-5 border-t-4 border-t-blue-600">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Supplier Select */}
          <div>
            <label className="label-text">Supplier</label>
            <div className="flex gap-2">
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={`input w-full ${cartItems.length > 0 ? "bg-gray-100 cursor-not-allowed" : ""}`}
                disabled={cartItems.length > 0}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <Button
                onClick={() => setShowSupplierModal(true)}
                variant="secondary"
                className="px-3"
                disabled={cartItems.length > 0}
              >
                <Plus size={18} />
              </Button>
            </div>

            {cartItems.length > 0 && (
              <span className="text-xs text-red-500">
                To change supplier, please clear the cart first.
              </span>
            )}
          </div>
          {/* Invoice No */}
          <div>
            <label className="label-text">Invoice No</label>
            <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="input w-full" placeholder="Ex: INV-999" />
          </div>
          {/* Date */}
          <div>
            <label className="label-text">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* --- LEFT SIDE: ITEM SELECTION & DISTRIBUTION --- */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="p-4 bg-slate-50 border border-blue-200 shadow-sm">
            <h3 className="font-bold text-lg text-slate-700 mb-3">1. Select Item</h3>

            {/* Search Input */}
            <div className="relative mb-4">
              <input
                placeholder="Scan barcode or type name..."
                value={search}
                onChange={(e) => searchItems(e.target.value)}
                className="input w-full border-blue-300 focus:ring-blue-500"
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-md shadow-xl mt-1 max-h-60 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.barcode}</div>
                      </div>
                      <div className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
                        Stock: {item.currentStock || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DISTRIBUTION TABLE */}
            {selectedItem && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-3 bg-blue-100 rounded-lg mb-3 flex justify-between items-center border border-blue-200">
                  <div>
                    <div className="font-bold text-blue-900">{selectedItem.name}</div>
                    <div className="text-xs text-blue-600">{selectedItem.barcode}</div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="text-xs text-red-500 font-medium hover:underline">
                    Change Item
                  </button>
                </div>

                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-12 gap-1 text-xs font-bold text-slate-500 px-1 mb-1">
                    <div className="col-span-3">Branch</div>
                    <div className="col-span-2 text-center">Cost</div>
                    <div className="col-span-2 text-center">Sell</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-center">Expiry</div>
                  </div>

                  {branches.map((branch, idx) => {
                    const inputs = branchInputs[branch.id] || {};
                    return (
                      <div key={branch.id} className="grid grid-cols-12 gap-1 items-center bg-white p-2 rounded border border-slate-200 shadow-sm mb-2">
                        <div className="col-span-3 text-xs font-bold text-slate-700 truncate" title={branch.name}>
                          {branch.name}
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="input h-8 text-xs p-1 text-right"
                            placeholder="Cost"
                            value={inputs.cost}
                            onChange={(e) => handleInputChange(branch.id, 'cost', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="input h-8 text-xs p-1 text-right"
                            placeholder="Sell"
                            value={inputs.sell}
                            onChange={(e) => handleInputChange(branch.id, 'sell', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className={`input h-8 text-xs p-1 text-center font-bold ${inputs.qty > 0 ? 'border-green-500 bg-green-50' : ''}`}
                            placeholder="Qty"
                            value={inputs.qty}
                            onChange={(e) => handleInputChange(branch.id, 'qty', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddToList();
                            }}
                          />
                        </div>
                        <div className="col-span-3 flex gap-1">
                          <input
                            type="date"
                            className="input h-8 text-[10px] p-0 px-1 w-full"
                            value={inputs.expiry}
                            onChange={(e) => handleInputChange(branch.id, 'expiry', e.target.value)}
                          />
                          {idx === 0 && (
                            <button
                              onClick={() => applyPricesToAll(branch.id)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Copy prices to all branches"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button onClick={handleAddToList} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 shadow-md">
                  <Plus size={18} className="mr-1" /> Add All to List
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* --- RIGHT SIDE: CART TABLE --- */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden min-h-[400px]">
            <div className="p-3 bg-slate-100 border-b font-semibold text-slate-600">
              Purchase Items List
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b text-slate-500">
                  <tr>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Sell</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Line Total</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-slate-400">
                        No items added. Search and distribute items to branches.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, index) => (
                      <tr key={item.uniqueId} className="hover:bg-slate-50 group transition-colors">
                        <td className="p-3">
                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                            {item.branchName}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-700">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.barcode}</div>
                        </td>
                        <td className="p-3 text-right text-slate-600">{item.costPrice.toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-600">{item.sellingPrice.toFixed(2)}</td>
                        <td className="p-3 text-center font-bold text-slate-800">{item.qty}</td>
                        <td className="p-3 text-right font-bold text-slate-800">{item.lineTotal.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              size="lg"
              className="bg-green-600 hover:bg-green-700 shadow-lg w-full md:w-auto px-8"
              disabled={cartItems.length === 0}
            >
              <Save size={18} className="mr-2" /> Finalize Purchase
            </Button>
          </div>
        </div>
      </div>

      <SupplierQuickAddModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onCreated={handleSupplierCreated}
      />
    </div>
  );
};

export default PurchaseFormPage;