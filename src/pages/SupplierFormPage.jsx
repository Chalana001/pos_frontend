import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Save } from "lucide-react";

import { suppliersAPI } from "../api/suppliers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const SupplierFormPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    active: true,
    bankName: "",
    branchName: "",
    accountNumber: "",
    accountName: "",
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Supplier phone is required");
      return;
    }

    const hasBankDetails = [
      formData.bankName,
      formData.branchName,
      formData.accountNumber,
      formData.accountName,
    ].some((value) => String(value || "").trim());

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      active: formData.active,
      bank: hasBankDetails
        ? {
            bankName: formData.bankName.trim() || null,
            branchName: formData.branchName.trim() || null,
            accountNumber: formData.accountNumber.trim() || null,
            accountName: formData.accountName.trim() || null,
          }
        : null,
    };

    try {
      setSubmitting(true);
      const response = await suppliersAPI.create(payload);
      toast.success("Supplier created");
      navigate(`/suppliers/${response.data?.id || ""}`.replace(/\/$/, ""));
    } catch (error) {
      console.error("Failed to create supplier", error);
      toast.error(error.response?.data?.message || "Failed to create supplier");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Add Supplier</h1>
          <p className="mt-1 text-sm text-slate-500">Create a supplier profile for purchases and payable tracking.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/suppliers")} className="w-full justify-center sm:w-auto">
          <ArrowLeft size={18} className="mr-2" /> Back
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h2 className="text-lg font-bold text-slate-800">Supplier Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <div>
              <label className="label-text">Supplier Name *</label>
              <input
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="input w-full"
                placeholder="Ex: Perera Distributors"
                autoFocus
              />
            </div>
            <div>
              <label className="label-text">Phone *</label>
              <input
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="input w-full"
                placeholder="077xxxxxxx"
              />
            </div>
            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="input w-full"
                placeholder="supplier@example.com"
              />
            </div>
            <div>
              <label className="label-text">Status</label>
              <CustomSelect
                value={formData.active ? "ACTIVE" : "INACTIVE"}
                onChange={(nextValue) => updateField("active", nextValue === "ACTIVE")}
                options={statusOptions}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-text">Address</label>
              <textarea
                value={formData.address}
                onChange={(event) => updateField("address", event.target.value)}
                className="input w-full min-h-[90px]"
                placeholder="Supplier address"
              />
            </div>
          </div>

          <div className="border-y border-slate-100 bg-slate-50/50 p-4">
            <h2 className="text-lg font-bold text-slate-800">Bank Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <div>
              <label className="label-text">Bank Name</label>
              <input value={formData.bankName} onChange={(event) => updateField("bankName", event.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label-text">Branch Name</label>
              <input value={formData.branchName} onChange={(event) => updateField("branchName", event.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label-text">Account Number</label>
              <input value={formData.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label-text">Account Name</label>
              <input value={formData.accountName} onChange={(event) => updateField("accountName", event.target.value)} className="input w-full" />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
            <Button type="button" variant="secondary" onClick={() => navigate("/suppliers")} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
              <Save size={18} className="mr-2" />
              {submitting ? "Saving..." : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SupplierFormPage;
