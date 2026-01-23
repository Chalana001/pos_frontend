import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import Card from "../components/common/Card";
import Button from "../components/common/Button";

import { customersAPI } from "../api/customers.api";
import { formatCurrency } from "../utils/formatters";

import CustomerNotesTab from "../components/customers/CustomerNotesTab";
import CustomerOrdersTab from "../components/customers/CustomerOrdersTab";

const CustomerViewPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [tab, setTab] = useState("orders"); // orders | notes
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);

  // caching tabs
  const [openedTabs, setOpenedTabs] = useState({
    orders: false,
    notes: false,
  });

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      // ✅ ONLY profile call
      const res = await customersAPI.getById(id);
      setCustomer(res.data);
    } catch {
      toast.error("Failed to load customer");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };

  const onTabChange = (t) => {
    setTab(t);
    setOpenedTabs((prev) => ({ ...prev, [t]: true }));
  };

  // mark default tab opened
  useEffect(() => {
    setOpenedTabs((prev) => ({ ...prev, orders: true }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Customer Profile</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/customers")}>
            Back
          </Button>
          <Button onClick={() => navigate(`/customers/${id}/edit`)}>Edit</Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="py-12 text-slate-600">Loading customer...</div>
        ) : (
          <div className="space-y-6">
            {/* Top Summary */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Image */}
              <div className="w-full lg:w-56">
                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                    {customer?.imageUrl ? (
                      <img
                        src={customer.imageUrl}
                        alt="customer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-sm text-slate-500 px-4 text-center">
                        No image
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Customer ID: {id}</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                      {customer?.name || "—"}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {customer?.phone || "—"}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        customer?.active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {customer?.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-700">
                  <div className="text-xs text-slate-500 mb-1">Address</div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    {customer?.address || "—"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Due Amount</div>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        (customer?.dueAmount || 0) > 0
                          ? "text-red-600"
                          : "text-slate-800"
                      }`}
                    >
                      {formatCurrency(customer?.dueAmount || 0)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Credit Limit</div>
                    <div className="text-xl font-bold mt-1 text-slate-800">
                      {formatCurrency(customer?.creditLimit || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => onTabChange("orders")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  tab === "orders"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Orders
              </button>

              <button
                onClick={() => onTabChange("notes")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  tab === "notes"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Notes
              </button>
            </div>

            {/* Tab content */}
            {tab === "orders" ? (
              openedTabs.orders ? (
                <CustomerOrdersTab customerId={id} />
              ) : (
                <div className="text-sm text-slate-500">Open orders tab to load data.</div>
              )
            ) : openedTabs.notes ? (
              <CustomerNotesTab customerId={id} />
            ) : (
              <div className="text-sm text-slate-500">Open notes tab to load data.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CustomerViewPage;
