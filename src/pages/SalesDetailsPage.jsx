import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { salesAPI } from "../api/sales.api"; // 👈 API import එක (orders වලට point වෙනවා)
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import ReceiptPrinter from "../components/pos/ReceiptPrinter"; // 👈 ඔබේ Print Component එකට අදාළ නිවැරදි Path එක දෙන්න
import { 
  ArrowLeft, Printer, Calendar, User, 
  CreditCard, Package, Ban 
} from "lucide-react";

const SalesDetailsPage = () => {
  const { id } = useParams(); // මෙතන id කියන්නේ Invoice No එක
  const navigate = useNavigate();
  
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);

  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await salesAPI.getById(id);
      setSale(res.data);
    } catch (error) {
      console.error("Failed to load Sale details", error);
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
      orderType: sale.orderType || 'CASH'
    };

    const cartItems = sale.items.map(item => ({
      name: item.itemName,
      unitPrice: item.unitPrice,
      qty: item.qty,
      discountType: item.discountType || 'FIXED', 
      discountValue: item.discountValue || 0,
      lineTotal: item.lineTotal 
    }));

    const storeName = "Super Mart"; 
    const shiftData = {
      branchName: sale.branchId ? `Branch #${sale.branchId}` : "Main Branch",
      cashierName: sale.cashierUserId ? `Cashier #${sale.cashierUserId}` : "Cashier"
    };

    const customerData = sale.customerId ? { name: sale.customerName } : null;

    printRef.current.printOrder(orderData, cartItems, storeName, shiftData, customerData);
  };

  // 🚫 Cancel Order Function
  const handleCancelOrder = async () => {
    const reason = window.prompt("Are you sure you want to cancel this order?\n\nPlease enter a reason:");
    
    if (!reason || reason.trim() === "") {
        if(reason !== null) alert("Cancel reason is required!");
        return; 
    }

    try {
      setIsCanceling(true);
      // API එකට Cancel Request එක යවනවා
      await salesAPI.cancel(sale.invoiceNo, { reason: reason });
      
      alert("Order canceled successfully! Stock has been reversed.");
      
      // Page එක අලුත් Status එකත් එක්ක Refresh කරනවා
      loadData(); 
    } catch (error) {
      console.error("Failed to cancel order", error);
      alert(error.response?.data?.message || "Failed to cancel the order.");
    } finally {
      setIsCanceling(false);
    }
  };


  if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
  if (!sale) return <div className="p-10 text-center text-red-500">Sale record not found!</div>;

  const isCanceled = sale.status === 'CANCELED';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* 🖨️ Hidden Receipt Printer Component */}
      <ReceiptPrinter ref={printRef} />

      {/* --- TOP BAR --- */}
      <div className="flex justify-between items-center print:hidden">
        <Button variant="secondary" onClick={() => navigate("/sales")}>
          <ArrowLeft size={18} className="mr-2" /> Back to History
        </Button>
        
        <div className="flex gap-3">
            {/* 🔴 Cancel Button (Canceled නැත්නම් විතරක් පෙන්වන්න) */}
            {!isCanceled && (
                <Button 
                    className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors" 
                    onClick={handleCancelOrder}
                    disabled={isCanceling}
                >
                    <Ban size={18} className="mr-2" /> 
                    {isCanceling ? "Canceling..." : "Cancel Order"}
                </Button>
            )}

            <Button 
                className="bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50" 
                onClick={handlePrint} 
                disabled={isCanceled} // Canceled Orders Print කරන එක නතර කරලා තියෙන්නේ
            >
                <Printer size={18} className="mr-2" /> Print Receipt
            </Button>
        </div>
      </div>

      {/* --- MAIN INVOICE HEADER --- */}
      <Card className={`p-6 border-t-4 shadow-md transition-all ${isCanceled ? 'border-t-red-500 bg-red-50/30' : 'border-t-green-500'}`}>
        <div className="flex flex-col md:flex-row justify-between gap-6">
          
          {/* Left: Invoice Info */}
          <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl font-bold ${isCanceled ? 'text-red-700 line-through opacity-70' : 'text-slate-800'}`}>
                    {sale.invoiceNo}
                </h1>
                
                {/* 🏷️ Status Badge */}
                {isCanceled ? (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        CANCELED
                    </span>
                ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        {sale.orderType === 'CREDIT' ? 'CREDIT' : 'PAID'}
                    </span>
                )}
            </div>
            
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar size={14} />
              {new Date(sale.createdAt).toLocaleString()}
            </div>
            
            <div className="mt-3 text-xs text-slate-500 font-mono flex items-center gap-2">
               <CreditCard size={14}/> 
               Payment: <span className="font-semibold text-slate-700">{sale.orderType || 'CASH'}</span>
            </div>
            
            {/* 🔴 Cancel වුනා නම් හේතුව පෙන්වනවා */}
            {isCanceled && sale.cancelReason && (
                <div className="mt-3 text-sm text-red-600 bg-red-100/50 p-2 rounded border border-red-100 inline-block">
                    <b>Reason:</b> {sale.cancelReason}
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
            
            <div className={`p-3 rounded-lg inline-block min-w-[200px] ${isCanceled ? 'bg-slate-200' : 'bg-slate-100'}`}>
                <div className="text-xs text-slate-500 uppercase font-bold">Grand Total</div>
                <div className={`text-2xl font-bold ${isCanceled ? 'text-slate-500 line-through' : 'text-green-600'}`}>
                    {sale.grandTotal?.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-sm text-slate-500">LKR</span>
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
      <Card className={`p-0 overflow-hidden shadow-sm ${isCanceled ? 'opacity-70 grayscale-[50%]' : ''}`}>
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
                                        {item.qty}
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
      
    </div>
  );
};

export default SalesDetailsPage;