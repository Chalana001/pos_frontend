import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { categoriesAPI } from "../api/categories.api";
import { itemsAPI } from "../api/items.api";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { isSingleCategoryMode } from "../utils/categoryMode";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Modal from "../components/common/Modal";
import ResizableSplit from "../components/common/ResizableSplit";

const INITIAL_FORM = { id: null, type: "MAIN", name: "", parentId: "" };
const ITEMS_PAGE_SIZE = 100;

/**
 * Category management: add, rename and delete the two-level tree, and see what
 * still links to each row before touching it.
 *
 * Deletes are refused server-side while any item points at the row, so the
 * dialog lists the offending items instead of confirming. In single-category
 * mode the tree is one level deep, the hidden "General" parent holds every row,
 * and the parent picker stays out of the way.
 */
const CategoryManagementPage = () => {
  const navigate = useNavigate();
  const { configuration } = useAppConfiguration();
  const singleMode = isSingleCategoryMode(configuration);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [linkedItems, setLinkedItems] = useState([]);
  const [itemsViewer, setItemsViewer] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.usage();
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load categories", error);
      toast.error("Failed to load categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => setForm(INITIAL_FORM);

  const parentOptions = useMemo(
    () => categories.map((category) => ({ id: String(category.id), name: category.name })),
    [categories]
  );

  const generalCategoryId = useMemo(() => {
    if (!singleMode) return null;
    const general = categories.find((category) => category.name?.toLowerCase() === "general");
    return general ? String(general.id) : null;
  }, [categories, singleMode]);

  const fetchItemsForCategory = async (category) => {
    const unwrap = (response) =>
      response.data?.content ?? (Array.isArray(response.data) ? response.data : []);

    if (singleMode || category.type === "SUB") {
      const response = await itemsAPI.getAll({ subCategoryId: category.id, size: ITEMS_PAGE_SIZE });
      return unwrap(response);
    }

    // A main category holds no items of its own; ask for each child's instead.
    const responses = await Promise.all(
      (category.subCategories || []).map((sub) =>
        itemsAPI.getAll({ subCategoryId: sub.id, size: ITEMS_PAGE_SIZE })
      )
    );
    return responses.flatMap(unwrap);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSaving(true);
      if (form.id) {
        if (form.type === "SUB") {
          await categoriesAPI.updateSubCategory(form.id, { name });
        } else {
          await categoriesAPI.update(form.id, { name });
        }
        toast.success("Category updated");
      } else if (singleMode) {
        await categoriesAPI.createSingleCategory({ name });
        toast.success("Category added");
      } else if (form.type === "SUB") {
        if (!form.parentId) {
          toast.error("Choose a main category for the sub-category");
          return;
        }
        await categoriesAPI.createSubCategory({ name, categoryId: Number(form.parentId) });
        toast.success("Sub-category added");
      } else {
        await categoriesAPI.create({ name });
        toast.success("Category added");
      }
      await loadCategories();
      resetForm();
    } catch (error) {
      console.error("Failed to save category", error);
      toast.error(error?.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setForm({
      id: category.id,
      type: category.type,
      name: category.name || "",
      parentId: category.parentId ? String(category.parentId) : "",
    });
  };

  const openItemsViewer = async (category) => {
    try {
      const items = await fetchItemsForCategory(category);
      setLinkedItems(items);
      setItemsViewer(category);
    } catch (error) {
      console.error("Failed to load linked items", error);
      toast.error("Failed to load linked items");
    }
  };

  const requestDelete = async (category) => {
    try {
      const items = await fetchItemsForCategory(category);
      setLinkedItems(items);
      setPendingDelete(category);
    } catch (error) {
      console.error("Failed to check category usage", error);
      toast.error("Failed to check category usage");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const category = pendingDelete;
    try {
      setDeletingId(category.id);
      if (category.type === "SUB") {
        await categoriesAPI.removeSubCategory(category.id);
      } else {
        await categoriesAPI.remove(category.id);
      }
      toast.success(`Category "${category.name}" deleted`);
      setPendingDelete(null);
      await loadCategories();
      if (Number(form.id) === Number(category.id)) resetForm();
    } catch (error) {
      console.error("Failed to delete category", error);
      toast.error(error?.response?.data?.message || "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  const editingGeneral = singleMode && form.id && generalCategoryId && String(form.id) === generalCategoryId;
  const saveLabel = saving
    ? "Saving..."
    : form.id
      ? "Update Category"
      : form.type === "SUB"
        ? "Add Sub-Category"
        : "Add Category";

  const rows = useMemo(() => {
    if (singleMode) {
      const general = categories.find((category) => category.name?.toLowerCase() === "general");
      return (general?.subCategories || []).map((sub) => ({
        ...sub,
        type: "SUB",
        parentId: general.id,
      }));
    }
    return categories.flatMap((category) => [
      { ...category, type: "MAIN", parentId: null },
      ...(category.subCategories || []).map((sub) => ({
        ...sub,
        type: "SUB",
        parentId: category.id,
      })),
    ]);
  }, [categories, singleMode]);

  const renderName = (category) => {
    const isSub = category.type === "SUB";
    const label = (
      <div className={`flex items-center gap-2 ${isSub && !singleMode ? "pl-6" : ""}`}>
        {isSub && !singleMode ? (
          <span className="h-3.5 w-3.5 rounded-bl-md border-b-2 border-l-2 border-slate-300" aria-hidden="true" />
        ) : null}
        <Tag size={16} className="text-accent" />
        <span className="font-semibold text-slate-800">{category.name}</span>
      </div>
    );
    return singleMode && category.name?.toLowerCase() === "general" ? (
      <div>
        {label}
        <div className="mt-0.5 pl-9 text-xs text-slate-500">
          Built-in parent for single-category mode
        </div>
      </div>
    ) : label;
  };

  const renderTypeChip = (category) =>
    singleMode ? null : (
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${
          category.type === "MAIN"
            ? "bg-accent-soft text-accent"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {category.type === "MAIN" ? "Main" : "Sub"}
      </span>
    );

  const renderItemsBadge = (category) => {
    const count = Number(category.itemCount || 0);
    if (count === 0) {
      return <span className="text-sm text-slate-400">0</span>;
    }
    return (
      <button
        type="button"
        onClick={() => openItemsViewer(category)}
        className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent transition hover:brightness-95"
        title="View linked items"
      >
        {count}
      </button>
    );
  };

  const renderActions = (category) => {
    const disabled = deletingId === category.id;
    return (
      <div className="flex justify-end gap-2">
        <button
          aria-label={`Edit category ${category.name}`}
          type="button"
          onClick={() => handleEdit(category)}
          className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-accent"
          title="Rename category"
        >
          <Pencil size={16} />
        </button>
        <button
          aria-label={`Delete category ${category.name}`}
          type="button"
          onClick={() => requestDelete(category)}
          disabled={disabled}
          className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-danger disabled:opacity-50"
          title={Number(category.itemCount || 0) > 0 ? "In use: reassign items first" : "Delete category"}
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  const deleteBlocked = pendingDelete && linkedItems.length > 0;
  const deleteMessage = pendingDelete
    ? deleteBlocked
      ? `This category is linked to ${linkedItems.length} item${linkedItems.length === 1 ? "" : "s"}. Reassign or delete those items first.`
      : `Delete "${pendingDelete.name}"? This cannot be undone.${
          pendingDelete.type === "MAIN" && (pendingDelete.subCategories || []).length > 0
            ? " Its sub-categories will be deleted too."
            : ""
        }`
    : "";

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Categories</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add, rename and remove product categories. A category can be deleted only when no item
          uses it.
        </p>
      </div>

      <ResizableSplit storageKey="pos_split_categories" initialWidth={420} min={360} max={620}>
        <Card
          className="admin-panel-card"
          title={form.id ? "Edit Category" : "Add Category"}
          style={{ animationDelay: "90ms" }}
          action={
            form.id ? (
              <Button variant="secondary" size="sm" onClick={resetForm}>
                Cancel Edit
              </Button>
            ) : null
          }
        >
          <div className="space-y-4">
            {!singleMode && (
              <div>
                <label className="text-sm font-medium text-slate-700">Type</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {["MAIN", "SUB"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, type, parentId: "" }))}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        form.type === type
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {type === "MAIN" ? "Main Category" : "Sub-Category"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!singleMode && form.type === "SUB" && !form.id && (
              <div>
                <label className="text-sm font-medium text-slate-700">Parent Category</label>
                <div className="mt-1">
                  <CustomSelect
                    value={form.parentId}
                    onChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}
                    options={parentOptions}
                    placeholder="Choose a main category"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="categorymanagementpage-name" className="text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="categorymanagementpage-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={
                  form.type === "SUB" && !singleMode ? "Tea, Coffee, Soft Drinks" : "Beverages, Snacks, Grocery"
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {editingGeneral && (
              <p className="rounded-xl bg-warning-soft px-4 py-3 text-xs text-warning">
                This category belongs to single-category mode and cannot be renamed or deleted.
              </p>
            )}

            <Button onClick={handleSave} disabled={saving || editingGeneral} className="w-full">
              <Plus size={16} className="mr-2" />
              {saveLabel}
            </Button>
          </div>
        </Card>

        <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "130ms" }}>
          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading categories..." />
            </div>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table min-w-[720px]">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-table-head-cell">Name</th>
                    {!singleMode && <th className="app-table-head-cell text-center">Type</th>}
                    <th className="app-table-head-cell text-center">Items</th>
                    <th className="app-table-head-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app-table-body">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={singleMode ? 3 : 4} className="app-table-empty">
                        No categories yet. Add the first one on the left.
                      </td>
                    </tr>
                  ) : (
                    rows.map((category) => (
                      <tr key={`${category.type}-${category.id}`}>
                        <td className="app-table-cell">{renderName(category)}</td>
                        {!singleMode && (
                          <td className="app-table-cell text-center">{renderTypeChip(category)}</td>
                        )}
                        <td className="app-table-cell text-center">{renderItemsBadge(category)}</td>
                        <td className="app-table-cell">{renderActions(category)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ResizableSplit>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={deleteBlocked ? "Category in use" : "Delete category"}
        message={deleteMessage}
        confirmLabel="Delete"
        confirmDisabled={deleteBlocked}
        busy={deletingId !== null}
      >
        {deleteBlocked && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            {linkedItems.slice(0, 10).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{item.name}</span>
                {item.barcode ? <span className="text-xs text-slate-400">{item.barcode}</span> : null}
              </li>
            ))}
            {linkedItems.length > 10 && (
              <li className="pt-1 text-xs text-slate-500">…and {linkedItems.length - 10} more</li>
            )}
          </ul>
        )}
      </ConfirmDialog>

      <Modal
        isOpen={!!itemsViewer}
        onClose={() => setItemsViewer(null)}
        title={itemsViewer ? `Items in "${itemsViewer.name}"` : ""}
        size="lg"
      >
        {linkedItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No items are linked to this category.</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table min-w-[560px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Item</th>
                  <th className="app-table-head-cell">Barcode</th>
                  <th className="app-table-head-cell text-right">Price</th>
                  <th className="app-table-head-cell text-right">Stock</th>
                  <th className="app-table-head-cell text-right">Open</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {linkedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="app-table-cell font-medium text-slate-800">{item.name}</td>
                    <td className="app-table-cell text-slate-500">{item.barcode || "—"}</td>
                    <td className="app-table-cell text-right text-slate-700">
                      {item.sellingPrice != null ? Number(item.sellingPrice).toFixed(2) : "—"}
                    </td>
                    <td className="app-table-cell text-right text-slate-700">
                      {item.availableQty != null ? item.availableQty : "—"}
                    </td>
                    <td className="app-table-cell">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/items/${item.id}/edit`)}
                          className="rounded-lg bg-slate-50 p-2 text-slate-500 transition hover:text-accent"
                          title={`Open ${item.name}`}
                          aria-label={`Open item ${item.name}`}
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CategoryManagementPage;
