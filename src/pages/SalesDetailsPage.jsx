import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { salesAPI } from "../api/sales.api"; 
import { receiptSettingsAPI } from "../api/receiptSettings.api";
import { openPdfBlob } from "../utils/pdf";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import ReceiptPrinter from "../components/pos/ReceiptPrinter"; 
import { useAuth } from "../context/AuthContext"; 
import { formatQuantityWithUnit } from "../utils/formatters";
import { 
  ArrowLeft, Printer, Calendar, User, 
  CreditCard, Package, Ban, Wallet 
} from "lucide-react";
import { toast } from "react-hot-toast"; // 🟢 Toast එක Import කළා
import { hasPermission } from "../utils/permissions";
import { hasPlanFeature } from "../utils/subscriptionFeatures";
import { BRAND_NAME_UPPER } from "../utils/branding";

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
];

const getPaymentLabel = (sale) => {
  const paidAmount = Number(sale?.paidAmount || 0);
  const dueAmount = Number(sale?.dueAmount || 0);
  const method = (sale?.paymentMethod || "CASH").replace("_", " ");

  if (paidAmount > 0 && dueAmount > 0) return `${method} + Credit`;
  if (dueAmount > 0) return "Credit";
  return sale?.orderType === "CREDIT" ? "Credit" : method;
};

const SalesDetailsPage = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const { user } = useAuth(); 

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState(null);

  // 🟢 Modal එකට අදාළ States 
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await salesAPI.getById(id);
      setSale(res.data);
      if (res.data?.branchId) {
        try {
          const settingsRes = await receiptSettingsAPI.getByBranch(res.data.branchId);
          setReceiptSettings(settingsRes.data);
        } catch (settingsError) {
          console.error("Failed to load receipt settings", settingsError);
          setReceiptSettings(null);
        }
      } else {
        setReceiptSettings(null);
      }
    } catch (error) {
      console.error("Failed to load Sale details", error);
      toast.error("Failed to load sale details");
    } finally {
      setLoading(false);
    }
  };

  // 🖨️ Print Function
  const handlePrint = () => {
    if (!sale || !printRef.current) return;

    const orderData = {
      invoiceNo: sale.invoiceNo,
      subTotal: sale.subTotal,
      billDiscount: sale.billDiscount,
      netTotal: sale.grandTotal, 
      paidAmount: sale.paidAmount,
      dueAmount: sale.dueAmount,
      paymentMethod: sale.paymentMethod,
      orderType: sale.orderType || 'CASH',
      branchName: sale.branchName,
      branchAddress: sale.branchAddress,
      branchPhone: sale.branchPhone,
      branchLogo: sale.branchLogo,
      createdAt: sale.createdAt
    };

    const cartItems = sale.items.map(item => ({
      name: item.itemName,
      unitPrice: item.unitPrice,
      qty: item.qty,
      qtyUnit: item.qtyUnit,
      discountType: item.discountType || 'FIXED', 
      discountValue: item.discountValue || 0,
      lineTotal: item.lineTotal 
    }));

    const storeName = user?.shopName || BRAND_NAME_UPPER; 
    
    const shiftData = {
      cashierName: sale.cashierName || (sale.cashierUserId ? `Cashier #${sale.cashierUserId}` : "Cashier")
    };

    const customerData = sale.customerId ? { name: sale.customerName } : null;

    printRef.current.printOrder(orderData, cartItems, storeName, shiftData, customerData, receiptSettings);
  };

  const handlePrintFullInvoice = async () => {
    if (!sale) return;

    try {
      const response = await salesAPI.downloadInvoicePdf(sale.invoiceNo);
      openPdfBlob(response.data, `${sale.invoiceNo}.pdf`);
    } catch (error) {
      console.error("Failed to open invoice PDF", error);
      toast.error(error?.response?.data?.message || "Failed to open invoice PDF");
    }
  };

  const handleOpenPayment = () => {
    setPaymentAmount(String(Math.max(0, Number(sale?.dueAmount || 0))));
    setPaymentMethod("CASH");
    setPaymentNote("");
    setShowPaymentModal(true);
  };

  const executeSalePayment = async () => {
    const amount = Number(paymentAmount || 0);
    const saleDue = Number(sale?.dueAmount || 0);

    if (!amount || amount <= 0) {
      toast.error("Payment amount is required");
      return;
    }
    if (amount > saleDue) {
      toast.error("Payment amount cannot exceed this sale due amount");
      return;
    }

    try {
      setPaymentLoading(true);
      await salesAPI.recordPayment(sale.invoiceNo, {
        amount,
        paymentMethod,
        note: paymentNote || `Payment for sale ${sale.invoiceNo}`,
      });
      toast.success("Sale payment recorded");
      setShowPaymentModal(false);
      await loadData();
    } catch (error) {
      console.error("Failed to record sale payment", error);
      toast.error(error.response?.data?.message || "Failed to record sale payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  // 🟢 1. Open Modal
  const handleCancelClick = () => {
    setCancelReason(""); 
    setShowCancelModal(true);
  };

  // 🟢 2. Execute Cancel (Modal එකෙන් Confirm කරාම)
  const executeCancelSale = async () => {
    if (!cancelReason.trim()) {
      toast.error("Cancel reason is required!");
      return; 
    }

    try {
      setIsCanceling(true);
      await salesAPI.cancel(sale.invoiceNo, { reason: cancelReason });
      
      toast.success("Order canceled successfully! Stock has been reversed.");
      setShowCancelModal(false); // Modal එක වහනවා
      loadData(); // Data අලුත් කරනවා
    } catch (error) {
      console.error("Failed to cancel order", error);
      toast.error(error.response?.data?.message || "Failed to cancel the order.");
    } finally {
      setIsCanceling(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
  if (!sale) return <div className="p-10 text-center text-red-500">Sale record not found!</div>;

  const isCanceled = sale.status === 'CANCELED';
  const canCancelOrder =
    hasPermission(user?.role, "CANCEL_ORDERS") &&
    hasPlanFeature(user?.planName, "ORDER_CANCEL");
  const saleDue = Number(sale.dueAmount || 0);
  const canPaySale = !isCanceled && sale.customerId && saleDue > 0;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 🖨️ Hidden Receipt Printer Component */}
      <ReceiptPrinter ref={printRef} />

      {/* --- TOP BAR --- */}
      <div className="flex justify-between items-center print:hidden">
        <Button variant="secondary" onClick={() => navigate("/sales")}>
          <ArrowLeft size={18} className="mr-2" /> Back to History
        </Button>
        
        <div className="flex gap-3">
            {canPaySale && (
                <Button
                    className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm"
                    onClick={handleOpenPayment}
                >
                    <Wallet size={18} className="mr-2 text-slate-500" />
                    Pay Due
                </Button>
            )}
            {/* 🟢 Cancel Button (Updated Design) */}
            {!isCanceled && canCancelOrder && (
                <Button 
                    className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm" 
                    onClick={handleCancelClick}
                    disabled={isCanceling}
                >
                    <Ban size={18} className="mr-2 text-slate-500" /> 
                    {isCanceling ? "Canceling..." : "Cancel Order"}
                </Button>
            )}

            <Button 
                className="bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 shadow-sm" 
                onClick={handlePrint} 
                disabled={isCanceled} 
            >
                <Printer size={18} className="mr-2" /> Print Receipt
            </Button>
            <Button
                className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm"
                onClick={handlePrintFullInvoice}
                disabled={isCanceled}
            >
                <Printer size={18} className="mr-2" /> Full Invoice PDF
            </Button>
        </div>
      </div>

      {/* --- MAIN INVOICE HEADER --- */}
      <Card className={`p-6 border-t-4 shadow-md transition-all ${isCanceled ? 'border-t-slate-400 bg-slate-50' : 'border-t-green-500'}`}>
        <div className="flex flex-col md:flex-row justify-between gap-6">
          
          {/* Left: Invoice Info */}
          <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl font-bold ${isCanceled ? 'text-slate-500 line-through opacity-70' : 'text-slate-800'}`}>
                    {sale.invoiceNo}
                </h1>
                
                {/* 🏷️ Status Badge */}
                {isCanceled ? (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                        CANCELED
                    </span>
                ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        {getPaymentLabel(sale)}
                    </span>
                )}
            </div>
            
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar size={14} />
              {new Date(sale.createdAt).toLocaleString()}
            </div>
            
            <div className="mt-3 text-xs text-slate-500 font-mono flex items-center gap-2">
               <CreditCard size={14}/> 
               Payment: <span className="font-semibold text-slate-700">{getPaymentLabel(sale)}</span>
            </div>

            <div className="mt-2 text-xs text-slate-500 font-mono flex items-center gap-2">
               <User size={14}/>
               Sold By: <span className="font-semibold text-slate-700">{sale.cashierName || "Unknown"}</span>
            </div>
            
            {/* 🔴 Cancel Reason display update */}
            {isCanceled && sale.cancelReason && (
                <div className="mt-4 text-sm text-slate-700 bg-slate-100 p-3 rounded-lg border border-slate-200 inline-block">
                    <b>Cancel Reason:</b> {sale.cancelReason}
                </div>
            )}
          </div>

          {/* Right: Customer & Total */}
          <div className="text-right">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-1">Customer</h3>
            <div className="flex items-center justify-end gap-2 mb-3">
                <div className={`font-bold text-lg ${isCanceled ? 'text-slate-500' : 'text-slate-700'}`}>
                    {sale.customerName || "Walk-in Customer"}
                </div>
                <div className="bg-blue-100 p-1.5 rounded-full text-blue-600">
                    <User size={18} />
                </div>
            </div>
            
            <div className={`p-3 rounded-lg inline-block min-w-[200px] ${isCanceled ? 'bg-slate-100 opacity-80' : 'bg-slate-100'}`}>
                <div className="text-xs text-slate-500 uppercase font-bold">Grand Total</div>
                <div className={`text-2xl font-bold ${isCanceled ? 'text-slate-500 line-through' : 'text-green-600'}`}>
                    {sale.grandTotal?.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-sm text-slate-500">LKR</span>
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
                    <div className="flex justify-between gap-8">
                        <span className="text-slate-500">Paid</span>
                        <span className="font-semibold text-emerald-700">
                            {(sale.paidAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} LKR
                        </span>
                    </div>
                    <div className="flex justify-between gap-8">
                        <span className="text-slate-500">Due</span>
                        <span className={`font-semibold ${(sale.dueAmount || 0) > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                            {(sale.dueAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} LKR
                        </span>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </Card>

      {/* --- SEPARATOR --- */}
      <div className="flex items-center gap-4 py-2 opacity-70">
        <div className="h-px bg-slate-300 flex-1"></div>
        <span className="text-slate-400 text-sm font-semibold uppercase">Purchased Items</span>
        <div className="h-px bg-slate-300 flex-1"></div>
      </div>

      {/* --- ITEMS TABLE --- */}
      <Card className={`p-0 overflow-hidden shadow-sm ${isCanceled ? 'opacity-70 grayscale-[30%]' : ''}`}>
        {!sale.items || sale.items.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
                <Package size={32} className="mx-auto mb-2 opacity-50"/>
                No items found for this invoice.
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-xs border-b">
                        <tr>
                            <th className="p-4 w-10">#</th>
                            <th className="p-4">Item Name</th>
                            <th className="p-4">Barcode</th>
                            <th className="p-4 text-right">Unit Price</th>
                            <th className="p-4 text-center">Qty</th>
                            <th className="p-4 text-right">Discount</th>
                            <th className="p-4 text-right pr-6">Line Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sale.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-400">{idx + 1}</td>
                                <td className="p-4 font-medium text-slate-700">{item.itemName}</td>
                                <td className="p-4 text-slate-500 font-mono text-xs">{item.barcode}</td>
                                <td className="p-4 text-right text-slate-600">
                                    {item.unitPrice?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="p-4 text-center">
                                    <span className="bg-slate-100 border px-2 py-1 rounded font-bold text-slate-700">
                                        {formatQuantityWithUnit(item.qty, item.qtyUnit)}
                                    </span>
                                </td>
                                <td className="p-4 text-right text-red-500 text-xs">
                                    {item.discountValue > 0 ? `- ${item.discountValue.toLocaleString()}` : '-'}
                                </td>
                                <td className="p-4 text-right font-bold text-slate-800 pr-6">
                                    {item.lineTotal?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </Card>

      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-3 text-blue-600">
              <div className="p-2 bg-blue-50 rounded-full">
                <Wallet size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Sale Due Payment</h3>
            </div>

            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Due</span>
                <span className="font-bold text-red-600">
                  {saleDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} LKR
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold text-slate-700">{sale.customerName}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Invoice</span>
                <span className="font-semibold text-slate-700">{sale.invoiceNo}</span>
              </div>
            </div>

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Amount</label>
            <input
              type="number"
              min="0"
              max={saleDue}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Method</label>
            <CustomSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={paymentMethodOptions}
              className="mb-4"
              buttonClassName="py-2 focus:ring-blue-100"
            />

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Note</label>
            <textarea
              rows="2"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="mb-6 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
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
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={executeSalePayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- 🟢 BEAUTIFUL CANCEL MODAL (BLUE & SLATE THEME) --- */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 mb-3 text-blue-600">
              <div className="p-2 bg-blue-50 rounded-full">
                <Ban size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Cancel Order</h3>
            </div>
            
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to cancel this order? This action will reverse the stock. Please provide a reason below.
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
                onClick={executeCancelSale}
                disabled={isCanceling}
              >
                {isCanceling ? "Processing..." : "Confirm Cancel"}
              </Button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesDetailsPage;
