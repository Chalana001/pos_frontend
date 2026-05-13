import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Truck } from "lucide-react";
import { toast } from "react-hot-toast";

import { suppliersAPI } from "../api/suppliers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatCurrency } from "../utils/formatters";

const SuppliersPage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.list();
      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load suppliers", error);
      toast.error("Failed to load suppliers");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.phone, supplier.email, supplier.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [query, suppliers]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">View supplier balances and purchase history.</p>
        </div>
        <Button onClick={() => navigate("/suppliers/new")} className="w-full justify-center sm:w-auto">
          <Plus size={18} className="mr-2" /> New Supplier
        </Button>
      </div>

      <Card className="overflow-hidden border border-slate-200 p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search supplier, phone, email, or address..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading suppliers..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 text-right font-medium">Payable</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => navigate(`/suppliers/${supplier.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <Truck size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{supplier.name}</div>
                            <div className="text-xs text-slate-500">{supplier.address || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{supplier.phone || "-"}</td>
                      <td className="px-6 py-4 text-slate-600">{supplier.email || "-"}</td>
                      <td className={`px-6 py-4 text-right font-bold ${Number(supplier.dueAmount || 0) > 0 ? "text-red-600" : "text-slate-500"}`}>
                        {formatCurrency(supplier.dueAmount || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${supplier.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {supplier.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <Eye size={18} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SuppliersPage;
