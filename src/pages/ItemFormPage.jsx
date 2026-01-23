import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";

import { itemsAPI } from "../api/items.api";
import { branchesAPI } from "../api/branches.api";

import { ChevronDown, ChevronRight, Plus, X, Image as ImageIcon } from "lucide-react";

/* -----------------------------
  Collapsible Section UI
------------------------------ */
const Section = ({ title, open, onToggle, right, children }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition"
      >
        <h3 className="font-semibold text-slate-800">{title}</h3>

        <div className="flex items-center gap-3">
          {right}
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {open && <div className="p-5">{children}</div>}
    </div>
  );
};

const ItemFormPage = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);

  // sections
  const [secGeneral, setSecGeneral] = useState(true);
  const [secStock, setSecStock] = useState(true);
  const [secLabels, setSecLabels] = useState(false);

  // form data
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    category: "",
    subCategory: "",
    description: "",
    costPrice: "",
    sellingPrice: "",
    reorderLevel: "",
    imageUrl: "",
  });

  // image preview error
  const [imgError, setImgError] = useState(false);

  // branches + stock
  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [qtyMap, setQtyMap] = useState({}); // {branchId: qty}

  // labels UI
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState("");

  // confirm modal
  const [showConfirm, setShowConfirm] = useState(false);

  /* -----------------------------
    Load branches (create only)
  ------------------------------ */
  useEffect(() => {
    const loadBranches = async () => {
      if (mode !== "create") return;
      try {
        const res = await branchesAPI.getAll();
        const list = Array.isArray(res.data) ? res.data : [];
        setBranches(list);

        const q = {};
        list.forEach((b) => (q[b.id] = 0));
        setQtyMap(q);
      } catch {
        toast.error("Failed to load branches");
      }
    };
    loadBranches();
  }, [mode]);

  /* -----------------------------
    Load item (edit only)
  ------------------------------ */
  useEffect(() => {
    const load = async () => {
      if (mode !== "edit") return;
      setLoadingItem(true);
      try {
        const res = await itemsAPI.getById(id);
        const item = res.data;

        setFormData({
          name: item.name ?? "",
          barcode: item.barcode ?? "",
          category: item.category ?? "",
          subCategory: item.subCategory ?? "",
          description: item.description ?? "",
          costPrice: item.costPrice ?? "",
          sellingPrice: item.sellingPrice ?? "",
          reorderLevel: item.reorderLevel ?? "",
          imageUrl: item.imageUrl ?? "",
        });
      } catch {
        toast.error("Failed to load item");
        navigate("/items");
      } finally {
        setLoadingItem(false);
      }
    };
    load();
  }, [mode, id, navigate]);

  const selectedBranchObjs = useMemo(
    () => branches.filter((b) => selectedBranches.includes(b.id)),
    [branches, selectedBranches]
  );

  const toggleBranch = (branchId) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((x) => x !== branchId) : [...prev, branchId]
    );
    setQtyMap((prev) => {
      if (prev[branchId] !== undefined) return prev;
      return { ...prev, [branchId]: 0 };
    });
  };

  const selectAllBranches = () => setSelectedBranches(branches.map((b) => b.id));
  const clearBranches = () => setSelectedBranches([]);

  /* -----------------------------
    Labels UI
  ------------------------------ */
  const addLabel = () => {
    const v = labelInput.trim();
    if (!v) return;
    if (labels.includes(v)) return setLabelInput("");
    setLabels((prev) => [...prev, v]);
    setLabelInput("");
  };

  const removeLabel = (v) => setLabels((prev) => prev.filter((x) => x !== v));

  /* -----------------------------
    Create/Edit Submit
  ------------------------------ */
  const handleCreateClick = () => {
    if (!formData.name.trim() || !formData.barcode.trim()) {
      toast.error("Please fill required fields");
      setSecGeneral(true);
      return;
    }
    if (selectedBranches.length === 0) {
      toast.error("Select at least one branch");
      setSecStock(true);
      return;
    }
    setShowConfirm(true);
  };

  const submitCreateWithStocks = async () => {
    setSubmitting(true);
    try {
      const payload = {
        itemCreateRequest: {
          name: formData.name.trim(),
          barcode: formData.barcode.trim(),
          category: formData.category?.trim() || null,
          subCategory: formData.subCategory?.trim() || null,
          description: formData.description?.trim() || null,
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice),
          reorderLevel: Number(formData.reorderLevel || 0),
          imageUrl: formData.imageUrl?.trim() || null,
          active: true,
        },
        stocks: selectedBranches.map((branchId) => ({
          branchId,
          quantity: Math.max(0, Number(qtyMap[branchId] || 0)),
        })),
      };
      console.log("Payload:", payload);

      await itemsAPI.createWithStocks(payload);

      toast.success("Item created ✅");
      navigate("/items");
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const submitEdit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category?.trim() || null,
        subCategory: formData.subCategory?.trim() || null,
        description: formData.description?.trim() || null,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        reorderLevel: Number(formData.reorderLevel || 0),
        imageUrl: formData.imageUrl?.trim() || null,
      };

      await itemsAPI.update(id, payload);

      toast.success("Item updated ✅");
      navigate("/items");
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">
          {mode === "edit" ? "Edit Item" : "Add New Item"}
        </h1>
      </div>

      <Card>
        {loadingItem ? (
          <div className="py-12 text-slate-600">Loading item...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ✅ LEFT COLUMN: Product Image */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden h-full">
                <div className="px-5 py-4 bg-slate-50 border-b">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <ImageIcon size={18} />
                    Product Image
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Paste image URL to preview
                  </p>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, imageUrl: e.target.value });
                        setImgError(false);
                      }}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                      {formData.imageUrl && !imgError ? (
                        <img
                          src={formData.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <div className="text-center text-slate-500 text-sm px-4">
                          {imgError ? "Invalid image URL" : "Image preview will appear here"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* UI only for now */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                      disabled
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                      disabled
                    >
                      Remove
                    </button>
                  </div>

                  <button
                    type="button"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                    disabled
                  >
                    + Add Another Image
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ RIGHT COLUMN: General + Stock + Labels stacked */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. General */}
              <Section
                title="General Information"
                open={secGeneral}
                onToggle={() => setSecGeneral((v) => !v)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                    />
                  </div>

                  {/* Barcode */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Barcode *
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="input"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Barcode generator will be added later.
                    </p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input"
                      placeholder="Type now (later dropdown)"
                    />
                  </div>

                  {/* Sub Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sub Category
                    </label>
                    <input
                      type="text"
                      value={formData.subCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, subCategory: e.target.value })
                      }
                      className="input"
                      placeholder="Type now (later dropdown)"
                    />
                  </div>

                  {/* Cost */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cost Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  {/* Selling */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, sellingPrice: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  {/* Reorder */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reorderLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, reorderLevel: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Optional description..."
                    />
                  </div>
                </div>
              </Section>

              {/* 2. Manage Stock */}
              {mode === "create" && (
                <Section
                  title="Manage Stock"
                  open={secStock}
                  onToggle={() => setSecStock((v) => !v)}
                  right={
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {selectedBranches.length}/{branches.length}
                    </span>
                  }
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Select branches and set initial quantities.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllBranches}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={clearBranches}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3">Branch</th>
                            <th className="text-right px-4 py-3 w-40">Quantity</th>
                            <th className="text-center px-4 py-3 w-24">Select</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branches.map((b) => {
                            const checked = selectedBranches.includes(b.id);
                            return (
                              <tr
                                key={b.id}
                                className="border-b last:border-0 hover:bg-slate-50"
                              >
                                <td className="px-4 py-3 font-medium text-slate-700">
                                  {b.name}
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    disabled={!checked}
                                    className={`input text-right ${!checked ? "opacity-50" : ""}`}
                                    value={qtyMap[b.id] ?? 0}
                                    onChange={(e) => {
                                      const v = Math.max(0, Number(e.target.value || 0));
                                      setQtyMap((prev) => ({ ...prev, [b.id]: v }));
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={checked}
                                    onChange={() => toggleBranch(b.id)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Section>
              )}

              {/* 3. Labels */}
              <Section
                title="Label and Certificate"
                open={secLabels}
                onToggle={() => setSecLabels((v) => !v)}
              >
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      className="input flex-1"
                      placeholder="Add label (later sync with backend)"
                    />
                    <Button type="button" onClick={addLabel}>
                      <Plus size={18} className="mr-2" />
                      Add
                    </Button>
                  </div>

                  {labels.length === 0 ? (
                    <div className="text-sm text-slate-500">No labels added yet.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {labels.map((l) => (
                        <div
                          key={l}
                          className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm"
                        >
                          {l}
                          <button
                            type="button"
                            onClick={() => removeLabel(l)}
                            className="text-slate-500 hover:text-slate-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Certificates upload will be implemented later.
                  </div>
                </div>
              </Section>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/items")}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                {mode === "edit" ? (
                  <Button type="button" onClick={submitEdit} disabled={submitting}>
                    {submitting ? "Saving..." : "Save"}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleCreateClick} disabled={submitting}>
                    {submitting ? "Saving..." : "Save"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Confirm Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => {
          if (!submitting) setShowConfirm(false);
        }}
        title="Confirm Create Item"
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-700">
            Create this item for{" "}
            <span className="font-semibold">{selectedBranches.length}</span> branch(es)?
          </div>

          <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-semibold">{formData.name}</div>
            <div className="text-xs text-slate-500">{formData.barcode}</div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
            >
              Back
            </Button>
            <Button type="button" onClick={submitCreateWithStocks} disabled={submitting}>
              {submitting ? "Saving..." : "Confirm & Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ItemFormPage;
