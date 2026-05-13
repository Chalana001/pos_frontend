import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { customersAPI } from "../../api/customers.api";
import { formatCurrency } from "../../utils/formatters";
import CustomSelect from "../common/CustomSelect";

const paymentTypeOptions = [
  { value: "ALL", label: "All" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
];

const CustomerOrdersTab = ({ customerId }) => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [paymentType, setPaymentType] = useState("ALL");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params = {
          page: 0,
          size: 20,
          orderType: paymentType,
        };

        const res = await customersAPI.getOrders(customerId, params);
        setOrders(res.data?.items || []);
      } catch {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [customerId, paymentType]);

  return (
    <div className="space-y-4">
      <div className="page-section-enter flex items-center justify-between gap-3" style={{ animationDelay: "70ms" }}>
        <div className="text-sm text-slate-600">Customer Orders (Cash/Credit)</div>

        <CustomSelect
          value={paymentType}
          onChange={setPaymentType}
          options={paymentTypeOptions}
          valueKey="value"
          labelKey="label"
          className="w-[180px]"
        />
      </div>

      <div
        className="sales-panel-enter shell-panel shell-panel-hover overflow-hidden rounded-xl border border-slate-200 bg-white"
        style={{ animationDelay: "110ms" }}
      >
        <div className="border-b bg-slate-50 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Orders</h3>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No orders found.</div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell !px-4">Invoice</th>
                  <th className="app-table-head-cell !px-4">Date</th>
                  <th className="app-table-head-cell !px-4 text-right">Total</th>
                  <th className="app-table-head-cell !px-4 text-right">Paid</th>
                  <th className="app-table-head-cell !px-4 text-right">Balance</th>
                  <th className="app-table-head-cell !px-4 text-center">Type</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {orders.map((order) => (
                  <tr key={order.id} className="app-table-row-clickable border-b last:border-0">
                    <td className="app-table-cell !px-4 font-medium text-slate-800">
                      {order.invoiceNo || `#${order.id}`}
                    </td>
                    <td className="app-table-cell !px-4 text-slate-600">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="app-table-cell !px-4 text-right">{formatCurrency(order.grandTotal || 0)}</td>
                    <td className="app-table-cell !px-4 text-right">{formatCurrency(order.paidAmount || 0)}</td>
                    <td className="app-table-cell !px-4 text-right font-semibold">{formatCurrency(order.dueAmount || 0)}</td>
                    <td className="app-table-cell !px-4 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          order.orderType === "CREDIT"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {order.orderType || "—"}
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
