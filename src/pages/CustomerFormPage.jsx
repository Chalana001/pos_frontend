import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import Card from "../components/common/Card";
import CustomerForm from "../components/customers/CustomerForm";
import { customersAPI } from "../api/customers.api";

const CustomerFormPage = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [submitting, setSubmitting] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    imageUrl: "",
  });

  // ✅ load for edit
  useEffect(() => {
    const load = async () => {
      if (mode !== "edit") return;
      setLoadingCustomer(true);

      try {
        const res = await customersAPI.getById(id);
        const c = res.data;

        setFormData({
          name: c.name ?? "",
          phone: c.phone ?? "",
          address: c.address ?? "",
          email: c.email ?? "",
          imageUrl: c.imageUrl ?? "",
        });
      } catch {
        toast.error("Failed to load customer");
        navigate("/customers");
      } finally {
        setLoadingCustomer(false);
      }
    };

    load();
  }, [mode, id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address?.trim() || null,
        email: formData.email?.trim() || null,
        imageUrl: formData.imageUrl?.trim() || null,
      };

      if (mode === "edit") {
        await customersAPI.update(id, payload);
        toast.success("Customer updated ✅");
      } else {
        await customersAPI.create(payload);
        toast.success("Customer created ✅");
      }

      navigate("/customers");
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">
          {mode === "edit" ? "Edit Customer" : "Add New Customer"}
        </h1>
      </div>

      <Card>
        {loadingCustomer ? (
          <div className="py-12 text-slate-600">Loading customer...</div>
        ) : (
          <CustomerForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/customers")}
            submitting={submitting}
          />
        )}
      </Card>
    </div>
  );
};

export default CustomerFormPage;
