import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { customersAPI } from "../api/customers.api";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import CustomSelect from "../components/common/CustomSelect";
import Modal from "../components/common/Modal";
import CustomerNotesTab from "../components/customers/CustomerNotesTab";
import CustomerOrdersTab from "../components/customers/CustomerOrdersTab";
import { formatCurrency, formatDate } from "../utils/formatters";

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
];

const CustomerViewPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [tab, setTab] = useState("orders");
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [openedTabs, setOpenedTabs] = useState({
    orders: false,
    notes: false,
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const res = await customersAPI.getById(id);
        setCustomer(res.data);
      } catch {
        toast.error("Failed to load customer");
        navigate("/customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, navigate]);

  useEffect(() => {
    setOpenedTabs((prev) => ({ ...prev, orders: true }));
  }, []);

  const onTabChange = (nextTab) => {
    setTab(nextTab);
    setOpenedTabs((prev) => ({ ...prev, [nextTab]: true }));
  };

  const refreshCustomer = async () => {
    const res = await customersAPI.getById(id);
    setCustomer(res.data);
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    const amount = parseFloat(paymentAmount);

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > (customer?.dueAmount || 0)) {
      toast.error("Amount cannot exceed the total due amount");
      return;
    }

    setPaymentLoading(true);
    try {
      await customersAPI.recordPayment(id, { amount, paymentMethod });
      toast.success("Payment recorded successfully!");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentMethod("CASH");
      await refreshCustomer();
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex items-center justify-between" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Customer Profile</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/customers")}>
            Back
          </Button>
          <Button onClick={() => navigate(`/customers/${id}/edit`)}>Edit</Button>
        </div>
      </div>

      <Card className="sales-panel-enter" style={{ animationDelay: "90ms" }}>
        {loading ? (
          <div className="py-12 text-slate-600">Loading customer...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="w-full lg:w-56">
                <div
                  className="profile-detail-card shell-panel shell-panel-hover overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  style={{ animationDelay: "130ms" }}
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
                    {customer?.imageUrl ? (
                      <img src={customer.imageUrl} alt="customer" className="h-full w-full object-cover" />
                    ) : (
                      <div className="px-4 text-center text-sm text-slate-500">No image</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="page-section-enter flex-1" style={{ animationDelay: "170ms" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Customer ID: {id}</div>
                    <div className="mt-1 text-2xl font-bold text-slate-800">{customer?.name || "—"}</div>
                    <div className="mt-1 text-sm text-slate-600">{customer?.phone || "—"}</div>
                  </div>

                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        customer?.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {customer?.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-700">
                  <div className="mb-1 text-xs text-slate-500">Address</div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    {customer?.address || "—"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div
                    className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4"
                    style={{ animationDelay: "210ms" }}
                  >
                    <div className="text-xs text-slate-500">Added Date</div>
                    <div className="mt-1 text-xl font-bold text-slate-800">
                      {customer?.createdAt ? formatDate(customer.createdAt) : "-"}
                    </div>
                  </div>

                  <div
                    className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4"
                    style={{ animationDelay: "250ms" }}
                  >
                    <div className="text-xs text-slate-500">Due Amount</div>
                    <div className="mt-1 flex items-center justify-between">
                      <div
                        className={`text-xl font-bold ${
                          (customer?.dueAmount || 0) > 0 ? "text-red-600" : "text-slate-800"
                        }`}
                      >
                        {formatCurrency(customer?.dueAmount || 0)}
                      </div>

                      {(customer?.dueAmount || 0) > 0 && (
                        <Button
                          size="sm"
                          onClick={() => setShowPaymentModal(true)}
                          className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>

                  <div
                    className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4"
                    style={{ animationDelay: "290ms" }}
                  >
                    <div className="text-xs text-slate-500">Credit Limit</div>
                    <div className="mt-1 text-xl font-bold text-slate-800">
                      {formatCurrency(customer?.creditLimit || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => onTabChange("orders")}
                className={`profile-tab-chip rounded-lg px-4 py-2 text-sm font-medium ${
                  tab === "orders" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                style={{ animationDelay: "120ms" }}
              >
                Orders
              </button>

              <button
                onClick={() => onTabChange("notes")}
                className={`profile-tab-chip rounded-lg px-4 py-2 text-sm font-medium ${
                  tab === "notes" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                style={{ animationDelay: "160ms" }}
              >
                Notes
              </button>
            </div>

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

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Settle Due Amount">
        <form onSubmit={handlePaymentSubmit} className="space-y-4 p-6">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-sm font-medium text-slate-600">Total Due Amount</span>
            <span className="text-lg font-bold text-red-600">{formatCurrency(customer?.dueAmount || 0)}</span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Payment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-500">Rs.</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={customer?.dueAmount}
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Payment Method</label>
            <CustomSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={paymentMethodOptions}
              buttonClassName="px-4 py-3 font-semibold focus:ring-blue-100"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={paymentLoading}
            >
              {paymentLoading ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerViewPage;
