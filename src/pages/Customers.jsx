import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Edit, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { customersAPI } from "../api/customers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatCurrency } from "../utils/formatters";

const CustomersListPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll();
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Phone", accessor: "phone" },
    { header: "Email", accessor: "email" },
    {
      header: "Credit Balance",
      render: (c) => (
        <span className={c.creditBalance > 0 ? "text-red-600 font-semibold" : ""}>
          {formatCurrency(c.creditBalance || 0)}
        </span>
      ),
    },
    {
      header: "Status",
      render: (c) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            c.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {c.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (c) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/customers/${c.id}`)}
            className="p-1 text-slate-700 hover:text-slate-900"
            title="View"
          >
            <Eye size={18} />
          </button>

          <button
            onClick={() => navigate(`/customers/${c.id}/edit`)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Edit size={18} />
          </button>

          <button
            onClick={async () => {
              try {
                await customersAPI.toggleActive(c.id);
                toast.success("Customer status updated");
                fetchCustomers();
              } catch {
                toast.error("Failed to update customer");
              }
            }}
            className="p-1 text-slate-600 hover:text-slate-800"
          >
            {c.active ? "Disable" : "Enable"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Customers</h1>

        <Button onClick={() => navigate("/customers/new")}>
          <Plus size={20} className="mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers by name or phone..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading customers..." />
          </div>
        ) : (
          <Table columns={columns} data={filteredCustomers} />
        )}
      </Card>
    </div>
  );
};

export default CustomersListPage;
