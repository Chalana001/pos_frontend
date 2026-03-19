import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal"; // 👈 Modal එක import කරගන්න

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

  // Payment States 👈 අලුතින් එකතු කරපු ඒවා
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  useEffect(() => {
    setOpenedTabs((prev) => ({ ...prev, orders: true }));
  }, []);

  // 👈 Payment එක handle කරන Function එක
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);

    if (!amount || amount <= 0) {
      return toast.error("Please enter a valid amount");
    }
    if (amount > customer.dueAmount) {
      return toast.error("Amount cannot exceed the total due amount");
    }

    setPaymentLoading(true);
    try {
      // payment method එක "CASH" විදිහට hardcode කරලා යවනවා (ඕන නම් dropdown එකක් දාන්නත් පුළුවන්)
      await customersAPI.recordPayment(id, { amount, paymentMethod: "CASH" });
      
      toast.success("Payment recorded successfully!");
      setShowPaymentModal(false);
      setPaymentAmount("");
      
      // ✅ Payment එක success වුණාම customer data ටික ආයේ අරන් due amount එක අප්ඩේට් කරනවා
      fetchCustomer(); 
      
      // පොඩි trick එකක්: orders tab එකේ තියෙන data ටිකත් refresh වෙන්න ඕනෙ නම් 
      // ඔයාට orders tab එක re-mount කරන්න පුළුවන්, නැත්නම් page එක reload කරන්න පුළුවන්
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setPaymentLoading(false);
    }
  };

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
                  
                  {/* Due Amount Box (මෙතන තමයි Pay Now button එක දාන්නේ) */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Due Amount</div>
                    <div className="flex items-center justify-between mt-1">
                      <div
                        className={`text-xl font-bold ${
                          (customer?.dueAmount || 0) > 0
                            ? "text-red-600"
                            : "text-slate-800"
                        }`}
                      >
                        {formatCurrency(customer?.dueAmount || 0)}
                      </div>
                      
                      {/* ණය තියෙනවා නම් විතරක් Pay Now Button එක පෙන්නන්න */}
                      {(customer?.dueAmount || 0) > 0 && (
                        <Button 
                          size="sm" 
                          onClick={() => setShowPaymentModal(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        >
                          Pay Now
                        </Button>
                      )}
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

      {/* 👈 Payment Modal එක */}
      <Modal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        title="Settle Due Amount"
      >
        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center mb-4">
            <span className="text-sm text-slate-600 font-medium">Total Due Amount</span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(customer?.dueAmount || 0)}
            </span>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                Rs.
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={customer?.dueAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                placeholder="0.00"
                required
              />
            </div>
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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