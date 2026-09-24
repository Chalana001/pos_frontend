import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Save } from "lucide-react";

import { suppliersAPI } from "../api/suppliers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import DraftRestoreBar from "../components/common/DraftRestoreBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import useUnsavedWork from "../hooks/useUnsavedWork";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

/** Bump when the draft payload changes shape, so an older draft is discarded rather than fed to fields it cannot fill. */
const SUPPLIER_DRAFT_SCHEMA_VERSION = 1;

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  active: true,
  bankName: "",
  branchName: "",
  accountNumber: "",
  accountName: "",
};

/**
 * Create a supplier, or edit one.
 *
 * One component serves both because the fields are identical; `useParams().id` is the
 * whole difference, which is how CustomerFormPage does it too.
 *
 * The phone number is optional. It used to be required in three places at once (this
 * form, the entity, and a NOT NULL column), which is why a supplier could not be
 * recorded from a delivery note that carried only a name.
 */
const SupplierFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [formData, setFormData] = useState(EMPTY_FORM);
  // What the fields looked like when they were loaded or last saved. Anything different
  // is work worth protecting.
  const [baseline, setBaseline] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const response = await suppliersAPI.getById(id);
        const supplier = response.data ?? {};
        const bank = supplier.bankDetails ?? {};
        const loaded = {
          name: supplier.name ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          active: supplier.active !== false,
          bankName: bank.bankName ?? "",
          branchName: bank.branchName ?? "",
          accountNumber: bank.accountNumber ?? "",
          accountName: bank.accountName ?? "",
        };
        if (cancelled) return;
        setFormData(loaded);
        setBaseline(loaded);
      } catch (error) {
        console.error("Failed to load supplier", error);
        toast.error("Failed to load supplier");
        navigate("/suppliers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isDirty = useMemo(
    () => Object.keys(EMPTY_FORM).some((key) => formData[key] !== baseline[key]),
    [formData, baseline]
  );

  // Referentially stable unless a field actually moves: the hook autosaves on identity change.
  const draftPayload = useMemo(() => ({ ...formData }), [formData]);

  const { pendingDraft, discardDraft, clearDraft } = useUnsavedWork({
    kind: "supplier",
    // A new supplier and an edit of supplier 7 are different pieces of work; without the
    // id they would be offered each other's drafts.
    entityId: id ?? null,
    schemaVersion: SUPPLIER_DRAFT_SCHEMA_VERSION,
    isDirty,
    payload: draftPayload,
  });

  const restoreDraft = () => {
    const saved = pendingDraft?.payload;
    if (!saved) return;
    setFormData((prev) => ({ ...prev, ...saved }));
    discardDraft();
    toast.success("Draft restored");
  };

  const hasBankDetails = ["bankName", "branchName", "accountNumber", "accountName"]
    .some((field) => String(formData[field] || "").trim());

  const bankPayload = {
    bankName: formData.bankName.trim() || null,
    branchName: formData.branchName.trim() || null,
    accountNumber: formData.accountNumber.trim() || null,
    accountName: formData.accountName.trim() || null,
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    // No phone-number check on purpose. Blank is sent as null, and the backend stores
    // NULL, so any number of suppliers can exist without a number -- the unique index
    // tolerates unlimited NULLs but only one ''.

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      active: formData.active,
      // Creating with an empty bank section must not write an empty child row, so the
      // object is omitted. On edit it is sent explicitly, which is how clearing every
      // field removes bank details that were there before.
      bank: hasBankDetails
        ? bankPayload
        : isEdit
          ? { bankName: null, branchName: null, accountNumber: null, accountName: null }
          : null,
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await suppliersAPI.update(id, payload);
        toast.success("Supplier updated");
        clearDraft();
        navigate(`/suppliers/${id}`);
      } else {
        const response = await suppliersAPI.create(payload);
        toast.success("Supplier created");
        clearDraft();
        navigate(`/suppliers/${response.data?.id || ""}`.replace(/\/$/, ""));
      }
    } catch (error) {
      console.error("Failed to save supplier", error);
      toast.error(error.response?.data?.message || "Failed to save supplier");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" text="Loading supplier..." />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{isEdit ? "Edit Supplier" : "Add Supplier"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEdit
              ? "Update the supplier's contact and bank details."
              : "Create a supplier profile for purchases and payable tracking."}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/suppliers")} className="w-full justify-center sm:w-auto">
          <ArrowLeft size={18} className="mr-2" /> Back
        </Button>
      </div>

      <DraftRestoreBar
        draft={pendingDraft}
        label="You have unsaved supplier details"
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />

      <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "90ms" }}>
        <form onSubmit={handleSubmit}>
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h2 className="text-lg font-bold text-slate-800">Supplier Details</h2>
          </div>

          <div className="page-section-enter grid grid-cols-1 gap-4 p-6 md:grid-cols-2" style={{ animationDelay: "130ms" }}>
            <div>
              <label htmlFor="supplierformpage-supplier-name" className="label-text">Supplier Name *</label>
              <input id="supplierformpage-supplier-name"
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="input w-full"
                placeholder="Ex: Perera Distributors"
                maxLength={255}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="supplierformpage-phone" className="label-text">Phone</label>
              <input id="supplierformpage-phone"
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="input w-full"
                placeholder="077xxxxxxx (optional)"
                maxLength={20}
              />
            </div>
            <div>
              <label htmlFor="supplierformpage-email" className="label-text">Email</label>
              <input id="supplierformpage-email"
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

          <div className="page-section-enter grid grid-cols-1 gap-4 p-6 md:grid-cols-2" style={{ animationDelay: "180ms" }}>
            <div>
              <label htmlFor="supplierformpage-bank-name" className="label-text">Bank Name</label>
              <input id="supplierformpage-bank-name" value={formData.bankName} onChange={(event) => updateField("bankName", event.target.value)} className="input w-full" />
            </div>
            <div>
              <label htmlFor="supplierformpage-branch-name" className="label-text">Branch Name</label>
              <input id="supplierformpage-branch-name" value={formData.branchName} onChange={(event) => updateField("branchName", event.target.value)} className="input w-full" />
            </div>
            <div>
              <label htmlFor="supplierformpage-account-number" className="label-text">Account Number</label>
              <input id="supplierformpage-account-number" value={formData.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} className="input w-full" />
            </div>
            <div>
              <label htmlFor="supplierformpage-account-name" className="label-text">Account Name</label>
              <input id="supplierformpage-account-name" value={formData.accountName} onChange={(event) => updateField("accountName", event.target.value)} className="input w-full" />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
            <Button type="button" variant="secondary" onClick={() => navigate("/suppliers")} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
              <Save size={18} className="mr-2" />
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SupplierFormPage;

