import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { bankAccountsAPI } from "../api/bankAccounts.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";

const INITIAL_FORM = {
  id: null,
  name: "",
  accountNumber: "",
  bankName: "",
  active: true,
};

const BankAccountsPage = () => {
  const navigate = useNavigate();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await bankAccountsAPI.list();
      setBankAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load bank accounts", error);
      toast.error("Failed to load bank accounts");
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEditModal = (bankAccount) => {
    setForm({
      id: bankAccount.id,
      name: bankAccount.name || "",
      accountNumber: bankAccount.accountNumber || "",
      bankName: bankAccount.bankName || "",
      active: bankAccount.active !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(INITIAL_FORM);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Bank account name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      accountNumber: form.accountNumber.trim(),
      bankName: form.bankName.trim(),
      active: form.active,
    };

    try {
      setSaving(true);
      if (form.id) {
        await bankAccountsAPI.update(form.id, payload);
        toast.success("Bank account updated");
      } else {
        await bankAccountsAPI.create(payload);
        toast.success("Bank account added");
      }
      await loadBankAccounts();
      closeModal();
    } catch (error) {
      console.error("Failed to save bank account", error);
      toast.error(error?.response?.data?.message || "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bankAccount) => {
    try {
      setDeletingId(bankAccount.id);
      const response = await bankAccountsAPI.remove(bankAccount.id);
      const action = response.data?.action;
      if (action === "DEACTIVATED") {
        toast.success("Bank account has drops recorded against it, so it was deactivated");
      } else {
        toast.success("Bank account deleted");
      }
      await loadBankAccounts();
      if (Number(form.id) === Number(bankAccount.id)) {
        closeModal();
      }
    } catch (error) {
      console.error("Failed to delete bank account", error);
      toast.error(error?.response?.data?.message || "Failed to delete bank account");
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      header: "Account",
      render: (bankAccount) => (
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-blue-600" />
          <div>
            <div className="font-semibold text-slate-800">{bankAccount.name}</div>
            {bankAccount.bankName && (
              <div className="text-xs text-slate-500">{bankAccount.bankName}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Account No.",
      render: (bankAccount) => <span className="text-slate-600">{bankAccount.accountNumber || "-"}</span>,
    },
    {
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      render: (bankAccount) => (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
          bankAccount.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
        }`}>
          {bankAccount.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Drops Recorded",
      headerClassName: "text-center",
      className: "text-center font-medium",
      render: (bankAccount) => bankAccount.usageCount || 0,
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (bankAccount) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openEditModal(bankAccount);
            }}
            className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-blue-600"
            title="Edit bank account"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(bankAccount);
            }}
            disabled={deletingId === bankAccount.id}
            className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-red-600 disabled:opacity-50"
            title={bankAccount.usageCount > 0 ? "In-use accounts will be deactivated" : "Delete bank account"}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col justify-between gap-4 sm:flex-row sm:items-center" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bank Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Maintain the bank accounts cash drops can be assigned to. Deactivated accounts stay on old
            records but can't be picked for new drops.
          </p>
        </div>

        <Button onClick={openAddModal}>
          <Plus size={20} className="mr-2" />
          Add Bank Account
        </Button>
      </div>

      <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "90ms" }}>
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading bank accounts..." />
          </div>
        ) : (
          <Table
            columns={columns}
            data={bankAccounts}
            onRowClick={(bankAccount) => navigate(`/cash-drops/bank-accounts/${bankAccount.id}`)}
          />
        )}
      </Card>

      <Modal isOpen={showModal} onClose={closeModal} title={form.id ? "Edit Bank Account" : "Add Bank Account"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Account Name *</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Commercial Bank - 001"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Bank Name</label>
            <input
              value={form.bankName}
              onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))}
              placeholder="e.g. Commercial Bank"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Account Number</label>
            <input
              value={form.accountNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
              placeholder="e.g. 8001234567"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <div className="font-medium text-slate-800">Active</div>
              <div className="text-xs text-slate-500">Inactive accounts stay in old records but cannot be picked for new drops.</div>
            </div>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : form.id ? "Update Bank Account" : "Add Bank Account"}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BankAccountsPage;
