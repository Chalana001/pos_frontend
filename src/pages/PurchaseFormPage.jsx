import React, { useEffect, useRef, useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import SupplierQuickAddModal from "../components/purchase/SupplierQuickAddModal";
import { suppliersAPI } from "../api/suppliers.api";
import { itemsAPI } from "../api/items.api";
import { branchesAPI } from "../api/branches.api";
import { purchasesAPI } from "../api/purchases.api";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";

const PurchaseFormPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState({});

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [purchaseList, setPurchaseList] = useState([]);

  const branchRef = useRef(null);

  useEffect(() => {
    suppliersAPI.list().then(r => setSuppliers(r.data || []));
    branchesAPI.getAll().then(r => setBranches(r.data || []));
  }, []);

  useEffect(() => {
    if (selectedItem && branchRef.current) {
      branchRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedItem]);

  const handleSupplierCreated = (s) => {
    setSuppliers(prev => [...prev, s]);
    setSupplierId(s.id);
  };

  const searchItems = async (q) => {
    if (!q) return setSearchResults([]);
    const res = await itemsAPI.search(q);
    setSearchResults(res.data);
  };

  const handleAddToList = () => {
    if (!selectedItem) return toast.error("Select item first");

    const supplier = suppliers.find(s => s.id == supplierId);

    const rows = Object.entries(selectedBranches)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([branchId, qty]) => {
        const branch = branches.find(b => b.id == branchId);

        return {
          branchId,
          branchName: branch.name,
          supplierName: supplier?.name || "-",
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          barcode: selectedItem.barcode,
          qty: Number(qty),
          cost: selectedItem.costPrice,
          sell: selectedItem.sellingPrice,
        };
      });

    setPurchaseList(prev => [...prev, ...rows]);
    setSelectedBranches({});
    setSelectedItem(null);
    setSearch("");
  };

  const handleSavePurchase = async () => {
    if (purchaseList.length === 0) return toast.error("No items added");

    await purchasesAPI.create({
      supplierId,
      invoiceNo,
      date,
      rows: purchaseList
    });

    toast.success("Purchase saved");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Purchase</h1>

      {/* SUPPLIER SECTION */}
      <Card>
        <div className="grid grid-cols-5 gap-4 items-end">
          <div className="col-span-2 flex gap-2">
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input flex-1">
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={() => setShowSupplierModal(true)} className="px-3 bg-blue-600 text-white rounded-lg">
              <Plus size={18} />
            </button>
          </div>

          <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="Invoice No" className="input" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT SIDE */}
        <div className="space-y-6">

          {/* ITEM SEARCH */}
          <Card>
            <input
              placeholder="Search item..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                searchItems(e.target.value);
              }}
              className="input"
            />

            <div className="mt-4 space-y-2">
              {searchResults.map(i => {
                const isSelected = selectedItem?.id === i.id;

                return (
                  <div
                    key={i.id}
                    onClick={() => setSelectedItem(i)}
                    className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer border
                      ${isSelected ? "bg-blue-50 border-blue-500" : "hover:bg-slate-50 border-transparent"}
                    `}
                  >
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-slate-500">{i.barcode}</div>
                    </div>

                    <div className={`text-sm font-semibold ${isSelected ? "text-blue-600" : "text-slate-400"}`}>
                      {isSelected ? "Selected" : "Select"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* SELECTED ITEM PANEL */}
          {selectedItem && (
            <Card className="border-blue-200 bg-blue-50">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-blue-700">{selectedItem.name}</div>
                  <div className="text-xs text-slate-500">
                    Barcode: {selectedItem.barcode}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-red-500 text-sm"
                >
                  Clear
                </button>
              </div>
            </Card>
          )}

          {/* BRANCH DISTRIBUTION */}
          {selectedItem && (
            <div ref={branchRef}>
              <Card>
                <div className="font-semibold mb-2">Distribute to Branches</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Branch</th>
                      <th>Qty</th>
                      <th>Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map(b => (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="input w-24 text-right"
                            value={selectedBranches[b.id] || 0}
                            onChange={e =>
                              setSelectedBranches(prev => ({
                                ...prev,
                                [b.id]: e.target.value
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedBranches[b.id] > 0}
                            onChange={e => {
                              if (!e.target.checked) {
                                const copy = { ...selectedBranches };
                                delete copy[b.id];
                                setSelectedBranches(copy);
                              }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <Button className="w-full mt-3" onClick={handleAddToList}>
                  + Add to Purchase List
                </Button>
              </Card>
            </div>
          )}
        </div>

        {/* PURCHASE LIST TABLE */}
        <Card className="col-span-2">
          <div className="font-semibold mb-2">Purchase List</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Supplier</th>
                <th>Item</th>
                <th>Barcode</th>
                <th>Qty</th>
                <th>Cost</th>
                <th>Sell</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseList.map((r, i) => (
                <tr key={i}>
                  <td>{r.branchName}</td>
                  <td>{r.supplierName}</td>
                  <td>{r.itemName}</td>
                  <td>{r.barcode}</td>
                  <td>{r.qty}</td>
                  <td>{r.cost}</td>
                  <td>{r.sell}</td>
                  <td>
                    <button
                      className="text-red-600"
                      onClick={() =>
                        setPurchaseList(purchaseList.filter((_, x) => x !== i))
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right mt-4">
            <Button onClick={handleSavePurchase}>Save Purchase</Button>
          </div>
        </Card>
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
