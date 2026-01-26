import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { purchasesAPI } from "../api/purchases.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { ArrowLeft, Printer, Calendar, FileText, MapPin, Truck } from "lucide-react";

const PurchaseDetailsPage = () => {
  const { id } = useParams(); // URL එකෙන් ID එක ගන්නවා (e.g. /purchases/5)
  const navigate = useNavigate();
  
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await purchasesAPI.getById(id);
      setGrn(res.data);
    } catch (error) {
      console.error("Failed to load GRN details", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
  if (!grn) return <div className="p-10 text-center text-red-500">GRN not found!</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      
      {/* --- TOP BAR --- */}
      <div className="flex justify-between items-center">
        <Button variant="secondary" onClick={() => navigate("/purchases")}>
          <ArrowLeft size={18} className="mr-2" /> Back to List
        </Button>
        <Button className="bg-slate-800 text-white">
          <Printer size={18} className="mr-2" /> Print GRN
        </Button>
      </div>

      {/* --- INVOICE HEADER DETAILS --- */}
      <Card className="p-6 border-t-4 border-t-blue-600">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          
          {/* Left: GRN Info */}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">{grn.grnNo}</h1>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar size={14} />
              {new Date(grn.receivedAt).toLocaleString()}
            </div>
            <div className="mt-4 flex items-center gap-2 text-slate-700 bg-blue-50 p-2 rounded w-fit">
              <FileText size={16} className="text-blue-600"/>
              <span className="font-semibold">Ref / Invoice:</span> 
              <span>{grn.note || "N/A"}</span>
            </div>
          </div>

          {/* Middle: Branch Info */}
          <div className="text-right md:text-left">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-1">Received At</h3>
            <div className="flex items-start gap-2">
                <MapPin size={18} className="text-purple-600 mt-1" />
                <div>
                    <div className="font-bold text-slate-700">{grn.branchName}</div>
                    <div className="text-xs text-slate-500">Stock Updated</div>
                </div>
            </div>
          </div>

          {/* Right: Supplier Info */}
          <div className="text-right">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-1">Supplier</h3>
            <div className="flex items-center justify-end gap-2">
                <div className="font-bold text-slate-700 text-lg">{grn.supplierName}</div>
                <Truck size={20} className="text-green-600" />
            </div>
            <div className="text-xs text-slate-500 mt-1">Status: Paid</div>
          </div>

        </div>
      </Card>

      {/* --- ITEMS TABLE --- */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b">
            <tr>
              <th className="p-4 w-10">#</th>
              <th className="p-4">Item Name</th>
              <th className="p-4">Barcode</th>
              <th className="p-4 text-right">Cost Price</th>
              <th className="p-4 text-right">Sell Price</th>
              <th className="p-4 text-center">Qty</th>
              <th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grn.items.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="p-4 text-slate-400">{index + 1}</td>
                <td className="p-4 font-medium text-slate-700">{item.itemName}</td>
                <td className="p-4 text-slate-500 font-mono">{item.barcode}</td>
                <td className="p-4 text-right">{item.costPrice.toLocaleString()}</td>
                <td className="p-4 text-right text-slate-400">{item.sellingPrice.toLocaleString()}</td>
                <td className="p-4 text-center font-bold bg-slate-50">{item.qty}</td>
                <td className="p-4 text-right font-bold text-slate-800">{item.lineTotal.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t">
            <tr>
              <td colSpan="6" className="p-4 text-right font-bold text-slate-600 uppercase">Grand Total</td>
              <td className="p-4 text-right font-bold text-blue-600 text-xl">
                LKR {grn.totalAmount.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

    </div>
  );
};

export default PurchaseDetailsPage;