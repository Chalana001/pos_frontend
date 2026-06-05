import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { purchasesAPI } from "../api/purchases.api";
import { suppliersAPI } from "../api/suppliers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import Modal from "../components/common/Modal";
import PurchaseA4Print from "../components/purchase/PurchaseA4Print";
import { useAuth } from "../context/AuthContext"; 
import { 
  ArrowLeft, Printer, Calendar, FileText, 
  Truck, ChevronDown, ChevronUp, MapPin, Package, Ban, Wallet
} from "lucide-react";
import { toast } from "react-hot-toast"; 
import { formatCurrency } from "../utils/formatters";

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
];

const cashSourceOptions = [
  { value: "BRANCH_CASH", label: "Branch Cash" },
  { value: "CASH_DRAWER", label: "Cash Drawer" },
  { value: "BANK", label: "Bank" },
];

const formatCashSource = (value) => {
  if (value === "CASH_DRAWER") return "Cash Drawer";
  if (value === "BRANCH_CASH") return "Branch Cash";
  if (value === "BANK") return "Bank";
  if (value === "NONE") return "No Cash Out";
  return value || "Branch Cash";
};

const PurchaseDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false); 

  const [expandedGrnIds, setExpandedGrnIds] = useState([]);

  // Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentCashSource, setPaymentCashSource] = useState("BRANCH_CASH");
  const [paymentCashSourceBranchId, setPaymentCashSourceBranchId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await purchasesAPI.getById(id);
      setPurchase(res.data);
    } catch (error) {
      console.error("Failed to load Purchase details", error);
      toast.error("Failed to load purchase details");
    } finally {
      setLoading(false);
    }
  };

  const toggleGrn = (grnId) => {
    if (expandedGrnIds.includes(grnId)) {
      setExpandedGrnIds(prev => prev.filter(id => id !== grnId)); 
    } else {
      setExpandedGrnIds(prev => [...prev, grnId]); 
    }
  };

  // 1. Open Modal
  const handleCancelClick = () => {
    setCancelReason(""); 
    setShowCancelModal(true);
  };

  // 2. Execute Cancel
  const executeCancelPurchase = async () => {
    if (!cancelReason.trim()) {
      toast.error("Cancel reason is required!");
      return;
    }

    try {
      setIsCanceling(true);
      await purchasesAPI.cancel(id, { reason: cancelReason });
      toast.success("Purchase canceled successfully!");
      setShowCancelModal(false); 
      loadData(); 
    } catch (error) {
      console.error("Failed to cancel purchase", error);
      toast.error(error.response?.data?.message || "Failed to cancel the purchase.");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleOpenPayment = () => {
    setPaymentAmount(String(Math.max(0, Number(purchase?.dueAmount || 0))));
    setPaymentMethod("CASH");
    setPaymentCashSource("BRANCH_CASH");
    setPaymentCashSourceBranchId("");
    setPaymentNote("");
    setShowPaymentModal(true);
  };

  const executeSupplierPayment = async () => {
    const amount = Number(paymentAmount || 0);
    if (!amount || amount <= 0) {
      toast.error("Payment amount is required");
      return;
    }
    if (amount > Number(purchase?.dueAmount || 0)) {
      toast.error("Payment amount cannot exceed this purchase due amount");
      return;
    }
    const purchaseBranchIds = [...new Set((purchase?.grnList || []).map((grn) => Number(grn.branchId)).filter(Boolean))];
    if (paymentCashSource === "CASH_DRAWER" && purchaseBranchIds.length > 1 && !paymentCashSourceBranchId) {
      toast.error("Please select the drawer branch");
      return;
    }

    try {
      setPaymentLoading(true);
      await suppliersAPI.recordPayment(purchase.supplierId, {
        purchaseId: purchase.purchaseId,
        amount,
        paymentMethod,
        cashSource: paymentCashSource,
        cashSourceBranchId: paymentCashSource === "CASH_DRAWER"
          ? Number(paymentCashSourceBranchId || purchaseBranchIds[0] || 0)
          : null,
        note: paymentNote || `Payment for purchase ${purchase.invoiceNo}`,
      });
      toast.success("Supplier payment recorded");
      setShowPaymentModal(false);
      await loadData();
    } catch (error) {
      console.error("Failed to record supplier payment", error);
      toast.error(error.response?.data?.message || "Failed to record supplier payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
  if (!purchase) return <div className="p-10 text-center text-red-500">Purchase record not found!</div>;

  const isCanceled = purchase.status === 'CANCELED';
  const canCancel = user?.role !== 'CASHIER' && !isCanceled;
  const purchaseDue = Number(purchase.dueAmount || 0);
  const canPaySupplier = user?.role !== 'CASHIER' && !isCanceled && purchaseDue > 0;
  const purchaseBranchOptions = [...new Map((purchase.grnList || [])
    .filter((grn) => grn.branchId)
    .map((grn) => [String(grn.branchId), { value: String(grn.branchId), label: grn.branchName || `Branch ${grn.branchId}` }])
  ).values()];

  return (
    <div className="page-enter mx-auto max-w-6xl space-y-6 pb-20">
      
      <PurchaseA4Print ref={printRef} />

      <div className="page-section-enter print:hidden flex items-center justify-between" style={{ animationDelay: "40ms" }}>
        <Button variant="secondary" onClick={() => navigate("/purchases")}>
          <ArrowLeft size={18} className="mr-2" /> Back to History
        </Button>
        
        <div className="flex gap-3">
          {canPaySupplier && (
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              onClick={handleOpenPayment}
            >
              <Wallet size={18} className="mr-2" />
              Pay Supplier
            </Button>
          )}

          {/* 🟢 Cancel Button එකේ රතු පාට අයින් කරලා Clean Slate පාටක් දුන්නා */}
          {canCancel && (
            <Button 
              className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm" 
              onClick={handleCancelClick}
              disabled={isCanceling}
            >
              <Ban size={18} className="mr-2 text-slate-500" /> 
              {isCanceling ? "Canceling..." : "Cancel Purchase"}
            </Button>
          )}

          <Button 
            className="bg-slate-800 text-white disabled:opacity-50 shadow-sm" 
            onClick={() => printRef.current?.printDocument(purchase)}
            disabled={isCanceled} 
          >
            <Printer size={18} className="mr-2" /> Print / PDF (A4)
          </Button>
        </div>
      </div>

      <Card className={`sales-panel-enter p-6 border-t-4 shadow-md transition-all ${isCanceled ? 'border-t-slate-400 bg-slate-50' : 'border-t-blue-600'}`} style={{ animationDelay: "90ms" }}>
        <div className="flex flex-col md:flex-row justify-between gap-6">
          
          <div>
            <div className="flex items-center gap-2 mb-1">
                <h1 className={`text-2xl font-bold ${isCanceled ? 'text-slate-500 line-through opacity-70' : 'text-slate-800'}`}>
                  {purchase.invoiceNo}
                </h1>
                
                {isCanceled ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                    CANCELED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                    COMPLETED
                  </span>
                )}
            </div>
            
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar size={14} />
              {new Date(purchase.createdAt).toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-400 font-mono">
                System ID: #{purchase.purchaseId}
            </div>

            {/* 🟢 Cancel වෙලා තියෙනකොට පෙන්වන මැසේජ් එකත් රතු පාට වෙනුවට Slate පාට කළා */}
            {isCanceled && purchase.cancelReason && (
              <div className="mt-4 text-sm text-slate-700 bg-slate-100 p-3 rounded-lg border border-slate-200 inline-block">
                <p><strong>Canceled At:</strong> {new Date(purchase.canceledAt).toLocaleString()}</p>
                <p className="mt-1"><strong>Reason:</strong> {purchase.cancelReason}</p>
              </div>
            )}
          </div>

          <div className="text-right">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-1">Supplier</h3>
            <div className="flex items-center justify-end gap-2 mb-2">
                <div className={`font-bold text-lg ${isCanceled ? 'text-slate-500' : 'text-slate-700'}`}>
                  {purchase.supplierName}
                </div>
                <Truck size={20} className={isCanceled ? "text-slate-400" : "text-blue-600"} />
            </div>
            
            <div className={`p-3 rounded-lg inline-block min-w-[200px] ${isCanceled ? 'bg-slate-100 opacity-80' : 'bg-slate-100'}`}>
                <div className="text-xs text-slate-500 uppercase font-bold">Grand Total</div>
                <div className={`text-2xl font-bold ${isCanceled ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {formatCurrency(purchase.grandTotal || 0)}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-sm">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Discount</div>
                    <div className="font-bold text-slate-600">{formatCurrency(purchase.discountAmount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Paid</div>
                    <div className="font-bold text-emerald-700">{formatCurrency(purchase.paidAmount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Due</div>
                    <div className={`font-bold ${purchaseDue > 0 ? "text-red-600" : "text-slate-500"}`}>
                      {formatCurrency(purchase.dueAmount || 0)}
                    </div>
                  </div>
                </div>
                {purchase.paymentMethod && Number(purchase.paidAmount || 0) > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Method</span>
                      <span className="font-semibold text-slate-700">{purchase.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cash Source</span>
                      <span className="font-semibold text-slate-700">{formatCashSource(purchase.cashSource)}</span>
                    </div>
                    {purchase.cashShiftId && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Shift</span>
                        <span className="font-semibold text-slate-700">#{purchase.cashShiftId}</span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

        </div>
      </Card>

      <div className="page-section-enter flex items-center gap-4 py-2 opacity-70" style={{ animationDelay: "130ms" }}>
        <div className="h-px bg-slate-300 flex-1"></div>
        <span className="text-slate-400 text-sm font-semibold uppercase">GRN Breakdown (By Branch)</span>
        <div className="h-px bg-slate-300 flex-1"></div>
      </div>

      <div className={`space-y-4 ${isCanceled ? 'opacity-70 grayscale-[30%]' : ''}`}>
        {purchase.grnList && purchase.grnList.map((grn, index) => {
            const isOpen = expandedGrnIds.includes(grn.id);

            return (
                <div
                  key={grn.id}
                  className="purchase-summary-card overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-200"
                  style={{ animationDelay: `${170 + Math.min(index, 6) * 40}ms` }}
                >
                    <div 
                        className={`p-4 flex flex-col md:flex-row justify-between items-center cursor-pointer hover:bg-slate-50 ${isOpen ? 'bg-slate-50 border-b' : ''}`}
                        onClick={() => toggleGrn(grn.id)}
                    >
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-700 text-lg">{grn.branchName}</div>
                                <div className="text-sm text-slate-500 font-mono flex items-center gap-2">
                                    <FileText size={12}/> {grn.grnNo}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 mt-3 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right">
                                <div className="text-xs text-slate-400 uppercase font-semibold">Sub Total</div>
                                <div className="font-bold text-slate-800 text-lg">
                                    {grn.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </div>
                            </div>
                            <div className="text-slate-400">
                                {isOpen ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                            </div>
                        </div>
                    </div>

                    {isOpen && (
                        <div className="page-section-enter bg-white" style={{ animationDelay: "70ms" }}>
                             {!grn.items || grn.items.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Package size={32} className="mx-auto mb-2 opacity-50"/>
                                    No items found for this GRN.
                                </div>
                             ) : (
                                <div className="app-table-wrap">
                                    <table className="app-table">
                                        <thead className="app-table-head">
                                            <tr>
                                                <th className="p-3 pl-6 w-10">#</th>
                                                <th className="p-3">Item Name</th>
                                                <th className="p-3">Barcode</th>
                                                <th className="p-3 text-right">Cost</th>
                                                <th className="p-3 text-right">Sell</th>
                                                <th className="p-3 text-center">Qty</th>
                                                <th className="p-3 text-right pr-6">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {grn.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50/30">
                                                    <td className="p-3 pl-6 text-slate-400">{idx + 1}</td>
                                                    <td className="p-3 font-medium text-slate-700">{item.itemName}</td>
                                                    <td className="p-3 text-slate-500 font-mono text-xs">{item.barcode}</td>
                                                    <td className="p-3 text-right">{item.costPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                    <td className="p-3 text-right text-slate-400">{item.sellingPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                    <td className="p-3 text-center">
                                                        <span className="bg-slate-100 px-2 py-1 rounded font-bold text-slate-700">
                                                            {item.qty}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-slate-800 pr-6">
                                                        {item.lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Supplier Payment" size="sm">
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Due</span>
                <span className="font-bold text-red-600">{formatCurrency(purchase.dueAmount || 0)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Supplier</span>
                <span className="font-semibold text-slate-700">{purchase.supplierName}</span>
              </div>
            </div>

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Amount</label>
            <input
              type="number"
              min="0"
              max={purchase.dueAmount || 0}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm outline-none transition focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Method</label>
            <CustomSelect
              value={paymentMethod}
              onChange={(value) => {
                setPaymentMethod(value);
                if (value === "BANK") setPaymentCashSource("BANK");
                if (value === "CASH" && paymentCashSource === "BANK") setPaymentCashSource("BRANCH_CASH");
              }}
              options={paymentMethodOptions}
              className="mb-4"
              buttonClassName="py-2 focus:ring-emerald-100"
            />

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Cash Source</label>
            <CustomSelect
              value={paymentCashSource}
              onChange={(value) => {
                setPaymentCashSource(value);
                if (value !== "CASH_DRAWER") setPaymentCashSourceBranchId("");
              }}
              options={cashSourceOptions}
              className="mb-4"
              buttonClassName="py-2 focus:ring-emerald-100"
            />

            {paymentCashSource === "CASH_DRAWER" && purchaseBranchOptions.length > 1 && (
              <>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Drawer Branch</label>
                <CustomSelect
                  value={paymentCashSourceBranchId}
                  onChange={setPaymentCashSourceBranchId}
                  options={purchaseBranchOptions}
                  valueKey="value"
                  labelKey="label"
                  className="mb-4"
                  buttonClassName="py-2 focus:ring-emerald-100"
                  placeholder="Select branch"
                />
              </>
            )}

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Note</label>
            <textarea
              rows="2"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="mb-6 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500"
              placeholder="Optional note"
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={executeSupplierPayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
      </Modal>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Purchase" size="sm">
            
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to cancel this purchase? This action will reverse the stock. Please provide a reason below.
            </p>
            
            <textarea
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none mb-6 text-sm bg-slate-50 text-slate-700 placeholder:text-slate-400 transition-all"
              rows="3"
              placeholder="Type cancellation reason here..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              autoFocus
            />
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setShowCancelModal(false)}
                disabled={isCanceling}
                className="hover:bg-slate-100"
              >
                Go Back
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all" 
                onClick={executeCancelPurchase}
                disabled={isCanceling}
              >
                {isCanceling ? "Processing..." : "Confirm Cancel"}
              </Button>
            </div>
      </Modal>

    </div>
  );
};

export default PurchaseDetailsPage;
