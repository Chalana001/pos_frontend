import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { purchasesAPI } from "../api/purchases.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { 
  ArrowLeft, Printer, Calendar, FileText, 
  Truck, ChevronDown, ChevronUp, MapPin, Package 
} from "lucide-react";

const PurchaseDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);

  // Expand වෙලා තියෙන GRN IDs තියාගන්න Array එකක්
  const [expandedGrnIds, setExpandedGrnIds] = useState([]);

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
    } finally {
      setLoading(false);
    }
  };

  // Expand / Collapse Function
  const toggleGrn = (grnId) => {
    if (expandedGrnIds.includes(grnId)) {
      setExpandedGrnIds(prev => prev.filter(id => id !== grnId)); // වහනවා
    } else {
      setExpandedGrnIds(prev => [...prev, grnId]); // අරිනවා
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
  if (!purchase) return <div className="p-10 text-center text-red-500">Purchase record not found!</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* --- TOP BAR --- */}
      <div className="flex justify-between items-center print:hidden">
        <Button variant="secondary" onClick={() => navigate("/purchases")}>
          <ArrowLeft size={18} className="mr-2" /> Back to History
        </Button>
        <Button className="bg-slate-800 text-white" onClick={() => window.print()}>
          <Printer size={18} className="mr-2" /> Print Summary
        </Button>
      </div>

      {/* --- MAIN INVOICE HEADER (PARENT) --- */}
      <Card className="p-6 border-t-4 border-t-blue-600 shadow-md">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          
          {/* Left: Invoice Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-800">{purchase.invoiceNo}</h1>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                    Completed
                </span>
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar size={14} />
              {new Date(purchase.createdAt).toLocaleString()}
            </div>
            <div className="mt-3 text-xs text-slate-400 font-mono">
                System ID: #{purchase.purchaseId}
            </div>
          </div>

          {/* Right: Supplier & Total */}
          <div className="text-right">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-1">Supplier</h3>
            <div className="flex items-center justify-end gap-2 mb-2">
                <div className="font-bold text-slate-700 text-lg">{purchase.supplierName}</div>
                <Truck size={20} className="text-blue-600" />
            </div>
            
            <div className="bg-slate-100 p-3 rounded-lg inline-block min-w-[200px]">
                <div className="text-xs text-slate-500 uppercase font-bold">Grand Total</div>
                <div className="text-2xl font-bold text-slate-800">
                    {purchase.grandTotal.toLocaleString()} <span className="text-sm text-slate-500">LKR</span>
                </div>
            </div>
          </div>

        </div>
      </Card>

      {/* --- SEPARATOR --- */}
      <div className="flex items-center gap-4 py-2">
        <div className="h-px bg-slate-300 flex-1"></div>
        <span className="text-slate-400 text-sm font-semibold uppercase">GRN Breakdown (By Branch)</span>
        <div className="h-px bg-slate-300 flex-1"></div>
      </div>

      {/* --- BRANCH WISE GRN LIST --- */}
      <div className="space-y-4">
        {purchase.grnList && purchase.grnList.map((grn) => {
            const isOpen = expandedGrnIds.includes(grn.id);

            return (
                <div key={grn.id} className="bg-white border rounded-lg shadow-sm overflow-hidden transition-all duration-200">
                    
                    {/* 1. GRN HEADER (Clickable) */}
                    <div 
                        className={`p-4 flex flex-col md:flex-row justify-between items-center cursor-pointer hover:bg-slate-50 ${isOpen ? 'bg-slate-50 border-b' : ''}`}
                        onClick={() => toggleGrn(grn.id)}
                    >
                        {/* Branch & GRN No */}
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-700 text-lg">{grn.branchName}</div>
                                <div className="text-sm text-slate-500 font-mono flex items-center gap-2">
                                    <FileText size={12}/> {grn.grnNo}
                                </div>
                            </div>
                        </div>

                        {/* Total & Arrow */}
                        <div className="flex items-center gap-6 mt-3 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right">
                                <div className="text-xs text-slate-400 uppercase font-semibold">Sub Total</div>
                                <div className="font-bold text-slate-800 text-lg">
                                    {grn.totalAmount.toLocaleString()}
                                </div>
                            </div>
                            <div className="text-slate-400">
                                {isOpen ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                            </div>
                        </div>
                    </div>

                    {/* 2. GRN ITEMS TABLE (Collapsible) */}
                    {isOpen && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200 bg-white">
                             {/* Items නැත්නම් Message එකක් */}
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
                                        {/* Optional: Sub Total Row for items check */}
                                        {/* <tfoot className="bg-slate-50 border-t">
                                            <tr>
                                                <td colSpan="6" className="p-2 text-right text-xs font-bold text-slate-400 uppercase">Items Total</td>
                                                <td className="p-2 pr-6 text-right font-bold text-slate-600">{grn.totalAmount.toLocaleString()}</td>
                                            </tr>
                                        </tfoot> */}
                                    </table>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            );
        })}
      </div>

    </div>
  );
};

export default PurchaseDetailsPage;