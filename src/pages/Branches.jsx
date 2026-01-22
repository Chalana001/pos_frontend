import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, Plus, Building2, Edit, Trash2 } from "lucide-react";

import { branchesAPI } from "../api/branches.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";

import Card from "../components/common/Card";
import Table from "../components/common/Table";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const Branches = () => {
  const { user } = useAuth();
  const { setBranches } = useBranch(); // refresh main dropdown after changes

  const isAdmin = user?.role === "ADMIN";

  const [branches, setLocalBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch] = useState("");

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // forms
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    address: "",
    phone: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: "",
    active: true,
  });

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await branchesAPI.getAll(activeOnly ? true : undefined);
      const list = res.data || [];
      setLocalBranches(list);

      // ✅ update BranchContext dropdown list too
      if (setBranches) setBranches(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;

    return branches.filter((b) => {
      return (
        b.name?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        b.phone?.toLowerCase().includes(q)
      );
    });
  }, [branches, search]);

  const openEdit = (b) => {
    setSelected(b);
    setEditForm({
      name: b.name || "",
      address: b.address || "",
      phone: b.phone || "",
      active: b.active ?? true,
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.code || !createForm.name) {
      toast.error("Code and Name are required");
      return;
    }
    try {
      await branchesAPI.create({
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        address: createForm.address?.trim() || null,
        phone: createForm.phone?.trim() || null,
      });
      toast.success("Branch created");
      setCreateOpen(false);
      setCreateForm({ code: "", name: "", address: "", phone: "" });
      loadBranches();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create branch");
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await branchesAPI.update(selected.id, {
        name: editForm.name?.trim() || null,
        address: editForm.address?.trim() || null,
        phone: editForm.phone?.trim() || null,
        active: editForm.active,
      });
      toast.success("Branch updated");
      setEditOpen(false);
      loadBranches();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update branch");
    }
  };

  const handleDeactivate = async (b) => {
    if (!window.confirm(`Deactivate branch "${b.name}" ?`)) return;

    try {
      await branchesAPI.deactivate(b.id);
      toast.success("Branch deactivated");
      loadBranches();
    } catch (err) {
      console.error(err);
      toast.error("Failed to deactivate branch");
    }
  };

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Code", accessor: "code" },
    { header: "Name", accessor: "name" },
    { header: "Address", accessor: "address" },
    { header: "Phone", accessor: "phone" },
    {
      header: "Status",
      render: (b) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            b.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {b.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (b) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!isAdmin}
            onClick={() => openEdit(b)}
            title={!isAdmin ? "Admin only" : ""}
          >
            <Edit size={16} className="mr-1" />
            Edit
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!isAdmin || !b.active}
            onClick={() => handleDeactivate(b)}
            title={!isAdmin ? "Admin only" : !b.active ? "Already inactive" : ""}
          >
            <Trash2 size={16} className="mr-1" />
            Deactivate
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Branch Management</h1>

        <Button onClick={() => setCreateOpen(true)} disabled={!isAdmin}>
          <Plus size={18} className="mr-2" />
          Create Branch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Total Branches</h3>
              <p className="text-2xl font-bold text-slate-800">{branches.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">View</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active only
          </label>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Search</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading branches..." />
          </div>
        ) : (
          <Table columns={columns} data={filtered} />
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Branch">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Code</label>
            <input
              className="input mt-1"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              placeholder="BR001"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              className="input mt-1"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Main Branch"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <input
              className="input mt-1"
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              placeholder="Address"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              className="input mt-1"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="077..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Branch - ${selected?.name || ""}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              className="input mt-1"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <input
              className="input mt-1"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              className="input mt-1"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editForm.active}
                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate}>Save</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Branches;
