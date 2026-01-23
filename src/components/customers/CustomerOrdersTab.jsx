import React, { useEffect, useState } from "react";
import { customersAPI } from "../../api/customers.api";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../utils/formatters";

const CustomerOrdersTab = ({ customerId }) => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  // filters (optional)
  const [paymentType, setPaymentType] = useState("ALL"); // ALL | CASH | CREDIT

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page: 0, size: 20 };
      if (paymentType !== "ALL") params.paymentType = paymentType;

      const res = await customersAPI.getOrders(customerId, params);

      // assume backend returns list or {items}
      const data = res.data?.items ?? res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Customer Orders (Cash/Credit)
        </div>

        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All</option>
          <option value="CASH">Cash</option>
          <option value="CREDIT">Credit</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b">
          <h3 className="font-semibold text-slate-800">Orders</h3>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Invoice</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Paid</th>
                  <th className="text-right px-4 py-3">Balance</th>
                  <th className="text-center px-4 py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {o.invoiceNo || `#${o.id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(o.total || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(o.paid || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(o.balance || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          o.paymentType === "CREDIT"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {o.paymentType || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrdersTab;
