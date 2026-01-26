import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { purchasesAPI } from "../api/purchases.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { Plus, Search, Eye } from "lucide-react";

const PurchaseListPage = () => {
  const navigate = useNavigate();
  
  // --- STATE VARIABLES ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination & Search States
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Search හෝ Page වෙනස් වෙනකොට Data අදිනවා
  useEffect(() => {
    fetchData();
  }, [page, search]); // Search වෙනස් වුනාමත් call වෙනවා

  const fetchData = async () => {
    setLoading(true);
    try {
      // Backend එකට Page Number සහ Search Term යවනවා
      const res = await purchasesAPI.list({
        search: search,
        page: page,
        size: pageSize
      });
      
      // Backend Response එකෙන් Data ටික Set කරගන්නවා
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
    setPage(0); // Search කරනකොට මුල් පිටුවට (Page 0) යන්න ඕන
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Purchase History</h1>
          <p className="text-slate-500 text-sm">View and manage supplier GRNs</p>
        </div>
        <Button onClick={() => navigate("/purchases/new")} className="bg-blue-600">
          <Plus size={18} className="mr-2" /> New Purchase
        </Button>
      </div>

      {/* --- SEARCH BAR --- */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by GRN, Supplier, or Invoice..."
            className="input pl-10 w-full"
            value={search}
            onChange={handleSearch} 
          />
        </div>
      </Card>

      {/* --- TABLE --- */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Ref / Invoice</th> {/* කලින් මෙතන GRN No තිබුනේ */}
                <th className="p-4">Supplier</th>
                <th className="p-4">Branch</th>
                <th className="p-4">GRN No</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">Loading...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">No records found.</td>
                </tr>
              ) : (
                // මෙතන filteredData නෙවෙයි, කෙලින්ම data පාවිච්චි කරන්න
                data.map((grn) => (
                  <tr key={grn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600">
                        {new Date(grn.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-medium text-blue-600">
                        {/* Note එක Invoice Number විදියට පාවිච්චි කරනවා */}
                        {grn.note || "-"}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                        {grn.supplierName}
                    </td>
                    <td className="p-4">
                        <span className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                            {grn.branchName}
                        </span>
                    </td>
                    <td className="p-4 text-slate-500">
                        {grn.grnNo}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-700">
                        {grn.totalAmount.toLocaleString()} 
                    </td>
                    <td className="p-4 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            Completed
                        </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                            onClick={() => navigate(`/purchases/${grn.id}`)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                            title="View Details"
                        >
                            <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION CONTROLS (Table Footer) --- */}
        <div className="flex justify-between items-center p-4 bg-slate-50 border-t">
            <span className="text-sm text-slate-500">
                Showing {data.length} records (Total: {totalElements})
            </span>
            <div className="flex gap-2">
                <Button 
                    variant="secondary" 
                    size="sm"
                    disabled={page === 0} 
                    onClick={() => setPage(p => p - 1)}
                >
                    Previous
                </Button>
                <span className="px-3 py-1 text-sm bg-white border rounded flex items-center">
                    Page {page + 1} of {totalPages || 1}
                </span>
                <Button 
                    variant="secondary" 
                    size="sm"
                    disabled={page >= totalPages - 1} 
                    onClick={() => setPage(p => p + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default PurchaseListPage;