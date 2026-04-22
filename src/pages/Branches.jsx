import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, Plus, Building2, Edit, Trash2, ImagePlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { branchesAPI } from "../api/branches.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";

import Card from "../components/common/Card";
import Table from "../components/common/Table";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";

const ALL_BRANCH_OPTION = { id: 0, name: "All Branches" };

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

const MAX_LOGO_SIZE_BYTES = 100 * 1024;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const Branches = () => {
  const navigate = useNavigate();
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
    logo: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: "",
    logo: "",
    active: true,
  });

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await branchesAPI.getAll(activeOnly ? true : undefined);
      const list = res.data || [];
      setLocalBranches(list);

      // ✅ update BranchContext dropdown list too
      if (setBranches) {
        const filtered = list.filter((b) => Number(b.id) !== 0);
        setBranches(isAdmin ? [ALL_BRANCH_OPTION, ...filtered] : filtered);
      }
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
      logo: b.logo || "",
      active: b.active ?? true,
    });
    setEditOpen(true);
  };

  const handleLogoFile = async (file, mode) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error("Logo must be 100KB or smaller");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (mode === "create") {
        setCreateForm((prev) => ({ ...prev, logo: dataUrl }));
      } else {
        setEditForm((prev) => ({ ...prev, logo: dataUrl }));
      }
    } catch (err) {
      toast.error("Failed to load logo");
    }
  };

  const clearLogo = (mode) => {
    if (mode === "create") {
      setCreateForm((prev) => ({ ...prev, logo: "" }));
      return;
    }
    setEditForm((prev) => ({ ...prev, logo: "" }));
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
        logo: createForm.logo || null,
      });
      toast.success("Branch created");
      setCreateOpen(false);
      setCreateForm({ code: "", name: "", address: "", phone: "", logo: "" });
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
        logo: editForm.logo || null,
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
    {
      header: "Logo",
      render: (b) => (
        b.logo ? (
          <img
            src={b.logo}
            alt={`${b.name} logo`}
            className="h-10 w-10 rounded-lg border border-slate-200 object-contain bg-white p-1"
          />
        ) : (
          <span className="text-xs text-slate-400">No logo</span>
        )
      ),
    },
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

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate("/receipt-settings")} disabled={!isAdmin}>
            Receipt Design
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!isAdmin}>
            <Plus size={18} className="mr-2" />
            Create Branch
          </Button>
        </div>
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

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Logo</label>
            <div className="mt-2 rounded-xl border border-dashed border-slate-300 p-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <ImagePlus size={18} />
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoFile(e.target.files?.[0], "create")}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">Recommended: small square logo, max 100KB.</p>

              {createForm.logo ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <img src={createForm.logo} alt="Create branch logo preview" className="h-16 w-16 rounded-lg border bg-white object-contain p-1" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">Logo preview ready</div>
                    <div className="text-xs text-slate-500">This image will be stored in the branch record.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearLogo("create")}
                    className="rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    title="Remove logo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : null}
            </div>
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
            <label className="text-sm font-medium text-slate-700">Logo</label>
            <div className="mt-2 rounded-xl border border-dashed border-slate-300 p-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <ImagePlus size={18} />
                Upload New Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoFile(e.target.files?.[0], "edit")}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">Recommended: small square logo, max 100KB.</p>

              {editForm.logo ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <img src={editForm.logo} alt="Edit branch logo preview" className="h-16 w-16 rounded-lg border bg-white object-contain p-1" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">Current logo preview</div>
                    <div className="text-xs text-slate-500">Uploading a new image replaces the existing branch logo.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearLogo("edit")}
                    className="rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    title="Remove logo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  No logo uploaded for this branch.
                </div>
              )}
            </div>
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
