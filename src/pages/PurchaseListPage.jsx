import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { purchasesAPI } from "../api/purchases.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { Plus, Search, ChevronRight } from "lucide-react";

const PurchaseListPage = () => {
  const navigate = useNavigate();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    fetchData();
  }, [page, search]); 

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await purchasesAPI.list({
        search: search,
        page: page,
        size: pageSize
      });
      setData(res.data.content || []); 
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (error) {
      console.error("Failed to load purchases", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Purchase History</h1>
          <p className="text-slate-500 text-sm">Manage Supplier Invoices & GRNs</p>
        </div>
        <Button onClick={() => navigate("/purchases/new")} className="bg-blue-600">
          <Plus size={18} className="mr-2" /> New Purchase
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Invoice No or Supplier..."
            className="input pl-10 w-full"
            value={search}
            onChange={handleSearch} 
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Supplier</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-center">GRNs</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-6 text-center text-slate-500">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-slate-500">No records found.</td></tr>
              ) : (
                data.map((purchase) => (
                  <tr 
                    key={purchase.purchaseId} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/purchases/${purchase.purchaseId}`)} // Navigate to Details
                  >
                    <td className="p-4 text-slate-600">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-bold text-blue-600">
                      {purchase.invoiceNo}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {purchase.supplierName}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800 text-lg">
                      {purchase.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                       <span className="bg-slate-100 border px-2 py-1 rounded text-xs font-semibold text-slate-500">
                           View Details
                       </span>
                    </td>
                    <td className="p-4 text-slate-400">
                        <ChevronRight size={18}/>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls Here (Same as before) */}
        <div className="flex justify-between items-center p-4 bg-slate-50 border-t">
             {/* ... Pagination Buttons ... */}
        </div>
      </Card>
    </div>
  );
};

export default PurchaseListPage;