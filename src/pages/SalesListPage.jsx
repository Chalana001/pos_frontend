import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { salesAPI } from "../api/sales.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useBranch } from "../context/BranchContext"; // 🔴 Branch Context එක import කළා
import { Search, ChevronRight, ShoppingCart } from "lucide-react";

const SalesListPage = () => {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch(); // 🔴 තෝරාගත් Branch ID එක ගන්නවා
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchData();
  }, [page, search, selectedBranchId]); // 🔴 branchId එක වෙනස් වුනත් Data ආයෙත් ගන්නවා

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🔴 API call එකට branchId එකත් යවනවා (0 නම් නොයවා ඉන්නත් පුළුවන්, ඒත් යවන එක හොඳයි)
      const res = await salesAPI.list({
        search: search,
        page: page,
        size: pageSize,
        branchId: selectedBranchId > 0 ? selectedBranchId : null // 0 නම් null යවනවා (All branches)
      });
      setData(res.data.content || []); 
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Failed to load sales", error);
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
          <h1 className="text-3xl font-bold text-slate-800">Sales History</h1>
          <p className="text-slate-500 text-sm">Manage Customer Invoices & Transactions</p>
        </div>
        <Button onClick={() => navigate("/pos")} className="bg-blue-600">
          <ShoppingCart size={18} className="mr-2" /> Open POS
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Invoice No or Customer..."
            className="input pl-10 w-full border border-slate-300 rounded-md p-2"
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
                <th className="p-4">Customer</th>
                <th className="p-4 text-center">Status</th> {/* 🔴 Status Column එක */}
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">No records found.</td></tr>
              ) : (
                data.map((sale) => (
                  <tr 
                    key={sale.id} 
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${sale.status === 'CANCELED' ? 'opacity-60 bg-red-50/20' : ''}`} // 🔴 Cancel වුණු ඒවා පොඩ්ඩක් වෙනස් කරලා පෙන්වනවා
                    onClick={() => navigate(`/sales/${sale.invoiceNo}`)} 
                  >
                    <td className="p-4 text-slate-600">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`p-4 font-bold ${sale.status === 'CANCELED' ? 'text-red-500 line-through' : 'text-blue-600'}`}>
                      {sale.invoiceNo}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {sale.customerName || "Walk-in Customer"}
                    </td>
                    
                    {/* 🔴 Status Badge */}
                    <td className="p-4 text-center">
                       <span className={`px-2 py-1 rounded text-xs font-bold border ${
                           sale.status === 'CANCELED' 
                           ? 'bg-red-100 text-red-700 border-red-200' 
                           : 'bg-green-100 text-green-700 border-green-200'
                       }`}>
                           {sale.status || 'COMPLETED'}
                       </span>
                    </td>

                    <td className="p-4 text-center">
                       <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                           {sale.orderType || 'CASH'}
                       </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800 text-lg">
                      {sale.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
        
        {/* Pagination Controls Here */}
        <div className="flex justify-between items-center p-4 bg-slate-50 border-t">
              <span className="text-sm text-slate-500">Page {page + 1} of {totalPages === 0 ? 1 : totalPages}</span>
              <div className="flex gap-2">
                  <Button disabled={page === 0} onClick={() => setPage(page - 1)} variant="secondary" className="px-3 py-1 text-sm">Prev</Button>
                  <Button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} variant="secondary" className="px-3 py-1 text-sm">Next</Button>
              </div>
        </div>
      </Card>
    </div>
  );
};

export default SalesListPage;