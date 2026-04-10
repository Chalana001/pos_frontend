import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { purchasesAPI } from "../api/purchases.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import PurchaseA4Print from "../components/purchase/PurchaseA4Print";
import { useAuth } from "../context/AuthContext"; 
import { 
  ArrowLeft, Printer, Calendar, FileText, 
  Truck, ChevronDown, ChevronUp, MapPin, Package, Ban 
} from "lucide-react";
import { toast } from "react-hot-toast"; 

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

  if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
  if (!purchase) return <div className="p-10 text-center text-red-500">Purchase record not found!</div>;

  const isCanceled = purchase.status === 'CANCELED';
  const canCancel = user?.role !== 'CASHIER' && !isCanceled;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      <PurchaseA4Print ref={printRef} />

      <div className="flex justify-between items-center print:hidden">
        <Button variant="secondary" onClick={() => navigate("/purchases")}>
          <ArrowLeft size={18} className="mr-2" /> Back to History
        </Button>
        
        <div className="flex gap-3">
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

      <Card className={`p-6 border-t-4 shadow-md transition-all ${isCanceled ? 'border-t-slate-400 bg-slate-50' : 'border-t-blue-600'}`}>
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
                    {purchase.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-sm text-slate-500">LKR</span>
                </div>
            </div>
          </div>

        </div>
      </Card>

      <div className="flex items-center gap-4 py-2 opacity-70">
        <div className="h-px bg-slate-300 flex-1"></div>
        <span className="text-slate-400 text-sm font-semibold uppercase">GRN Breakdown (By Branch)</span>
        <div className="h-px bg-slate-300 flex-1"></div>
      </div>

      <div className={`space-y-4 ${isCanceled ? 'opacity-70 grayscale-[30%]' : ''}`}>
        {purchase.grnList && purchase.grnList.map((grn) => {
            const isOpen = expandedGrnIds.includes(grn.id);

            return (
                <div key={grn.id} className="bg-white border rounded-lg shadow-sm overflow-hidden transition-all duration-200">
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
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200 bg-white">
                             {!grn.items || grn.items.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Package size={32} className="mx-auto mb-2 opacity-50"/>
                                    No items found for this GRN.
                                </div>
                             ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100/50 text-slate-500 uppercase font-semibold text-xs border-b">
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

      {/* --- 🟢 BEAUTIFUL CANCEL MODAL (BLUE & SLATE THEME) --- */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 mb-3 text-blue-600">
              <div className="p-2 bg-blue-50 rounded-full">
                <Ban size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Cancel Purchase</h3>
            </div>
            
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
            
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchaseDetailsPage;