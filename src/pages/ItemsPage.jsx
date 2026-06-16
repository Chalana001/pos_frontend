import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { AlertTriangle, Plus, Edit, Search, Tag, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api";
import { useAuth } from "../context/AuthContext";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { getConfigurableFeatureAvailability } from "../utils/subscriptionFeatures";
import { hasPermission } from "../utils/permissions";
import { formatCurrency } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";
import TablePagination from "../components/common/TablePagination";
import Modal from "../components/common/Modal";
import { ItemType } from "../utils/constants"; // 🟢 Constant එක Import කළා
import { useSearchOnType } from "../hooks/useSearchOnType";

const buildItemTypeOptions = (configuration, availability) => [
  { value: "ALL", label: "All Types" },
  { value: ItemType.NORMAL, label: "Normal" },
  ...(availability.weightItemsEnabled && configuration?.weightItemsEnabled ? [{ value: ItemType.WEIGHT, label: "Weight" }] : []),
  ...(availability.weightItemsEnabled && configuration?.weightItemsEnabled ? [{ value: ItemType.VOLUME, label: "Volume" }] : []),
  ...(availability.servicesEnabled && configuration?.servicesEnabled ? [{ value: ItemType.SERVICE, label: "Service" }] : []),
  ...(availability.recipeItemsEnabled && configuration?.recipeItemsEnabled ? [{ value: ItemType.RECIPE, label: "Recipe" }] : []),
];

const statusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const kotOptions = [
  { value: "ALL", label: "All KOT" },
  { value: "KOT", label: "KOT Enabled" },
  { value: "NO_KOT", label: "No KOT" },
];

const priceFieldOptions = [
  { value: "SELLING", label: "Selling" },
  { value: "COST", label: "Cost" },
];

const priceOperatorOptions = [
  { value: "ALL", label: "Any Price" },
  { value: "EQUAL", label: "Price =" },
  { value: "GREATER_THAN", label: "Price >" },
  { value: "LESS_THAN", label: "Price <" },
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const ItemsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const kotEnabled = configuration?.kotEnabled !== false;
  const featureAvailability = useMemo(
    () => getConfigurableFeatureAvailability(user?.planName),
    [user?.planName]
  );
  const itemTypeOptions = useMemo(
    () => buildItemTypeOptions(configuration, featureAvailability),
    [configuration, featureAvailability]
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useSearchOnType(setSearchQuery);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [itemType, setItemType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [kotFilter, setKotFilter] = useState("ALL");
  const [priceField, setPriceField] = useState("SELLING");
  const [priceOperator, setPriceOperator] = useState("ALL");
  const [priceAmount, setPriceAmount] = useState("");
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteCheck, setDeleteCheck] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 500); 

    return () => clearTimeout(timer);
  }, [searchQuery, page, categoryId, subCategoryId, itemType, status, kotFilter, priceField, priceOperator, priceAmount, singleCategoryMode]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    if (itemType === "ALL") return;
    if (itemTypeOptions.some((option) => option.value === itemType)) return;
    setItemType("ALL");
    setPage(0);
  }, [itemType, itemTypeOptions]);

  useEffect(() => {
    if ((configuration.recipeItemsEnabled && kotEnabled) || kotFilter === "ALL") return;
    setKotFilter("ALL");
    setPage(0);
  }, [configuration.recipeItemsEnabled, kotEnabled, kotFilter]);

  useEffect(() => {
    setCategoryId("");
    setSubCategoryId("");
    setSubCategories([]);
    setPage(0);
  }, [singleCategoryMode]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = singleCategoryMode
          ? await categoriesAPI.getSingleCategories()
          : await categoriesAPI.getAll();
        setCategories(response.data || []);
      } catch (error) {
        toast.error("Failed to load item filters");
      }
    };

    fetchCategories();
  }, [singleCategoryMode]);

  useEffect(() => {
    if (singleCategoryMode || !categoryId) {
      setSubCategories([]);
      setSubCategoryId("");
      return;
    }

    const fetchSubCategories = async () => {
      try {
        const response = await categoriesAPI.getSubCategories(categoryId);
        setSubCategories(response.data || []);
      } catch (error) {
        setSubCategories([]);
        setSubCategoryId("");
        toast.error("Failed to load sub categories");
      }
    };

    fetchSubCategories();
  }, [categoryId, singleCategoryMode]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await itemsAPI.getAll({
        search: searchQuery,
        page: page,
        size: pageSize,
        categoryId: singleCategoryMode ? undefined : categoryId || undefined,
        subCategoryId: singleCategoryMode ? categoryId || undefined : subCategoryId || undefined,
        itemType: itemType !== "ALL" ? itemType : undefined,
        active: status === "ALL" ? undefined : status === "ACTIVE",
        kotEnabled: kotFilter === "ALL" ? undefined : kotFilter === "KOT",
        priceField,
        priceOperator: priceOperator !== "ALL" && priceAmount !== "" ? priceOperator : undefined,
        priceAmount: priceOperator !== "ALL" && priceAmount !== "" ? Number(priceAmount) : undefined,
      });
      
      const itemsArray = res.data.content ? res.data.content : (Array.isArray(res.data) ? res.data : []);
      
      setItems(itemsArray);
      setTotalPages(res.data.totalPages || 0);
      setTotalItems(res.data.totalElements || itemsArray.length);
      
    } catch (error) {
      console.error("Fetch items error:", error);
      toast.error("Failed to fetch items");
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => setPage(0);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    resetPage();
  };

  const handleCategoryChange = (value) => {
    setCategoryId(value);
    setSubCategoryId("");
    resetPage();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryId("");
    setSubCategoryId("");
    setItemType("ALL");
    setStatus("ALL");
    setKotFilter("ALL");
    setPriceField("SELLING");
    setPriceOperator("ALL");
    setPriceAmount("");
    setPage(0);
  };

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }
    const maxPage = totalPages > 0 ? totalPages : 1;
    setPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  const openDeleteModal = async (item) => {
    setDeleteLoading(true);
    setDeleteModalOpen(true);
    setDeleteCheck({
      itemId: item.id,
      itemName: item.name,
      canDelete: false,
      reasons: [],
    });
    try {
      const response = await itemsAPI.deleteCheck(item.id);
      setDeleteCheck(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to check item delete status");
      setDeleteModalOpen(false);
      setDeleteCheck(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeleteCheck(null);
  };

  const handlePermanentDelete = async () => {
    if (!deleteCheck?.itemId || !deleteCheck.canDelete) return;
    setDeleteLoading(true);
    try {
      await itemsAPI.delete(deleteCheck.itemId);
      toast.success("Item deleted permanently");
      setDeleteModalOpen(false);
      setDeleteCheck(null);
      fetchItems();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data?.detail || "Failed to delete item");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deleteCheck?.itemId) return;
    setDeleteLoading(true);
    try {
      await itemsAPI.deactivate(deleteCheck.itemId);
      toast.success("Item deactivated");
      setDeleteModalOpen(false);
      setDeleteCheck(null);
      fetchItems();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to deactivate item");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo(() => [
    { 
      header: "Barcode", 
      accessor: "barcode",
      render: (i) => <span className="font-mono font-bold text-slate-600">{i.barcode}</span> 
    },
    { 
      header: "Name", 
      render: (i) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">{i.name}</span>
          {/* 🟢 Enum එක පාවිච්චි කිරීම */}
          {i.itemType === ItemType.SERVICE && <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded w-fit mt-1">Service</span>}
          {i.itemType === ItemType.WEIGHT && <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded w-fit mt-1">Weight Item</span>}
          {i.itemType === ItemType.VOLUME && <span className="text-[10px] uppercase font-bold text-cyan-600 bg-cyan-100 px-1.5 py-0.5 rounded w-fit mt-1">Volume Item</span>}
          {i.itemType === ItemType.RECIPE && <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded w-fit mt-1">Recipe</span>}
          {kotEnabled && i.isKotEnabled && <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded w-fit mt-1">KOT</span>}
          {i.posVisible === false && <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">Hidden in POS</span>}
        </div>
      )
    },
    { 
      header: "Category", 
      render: (item) => (
        <div className="flex flex-col">
           <div className="flex items-center gap-1">
              <Tag size={14} className="text-blue-500" />
              <span className="font-medium text-slate-700 text-sm">
                  {(singleCategoryMode ? item.subCategoryName || item.categoryName : item.categoryName) || "Uncategorized"}
              </span>
           </div>
           {!singleCategoryMode && item.subCategoryName && (
               <span className="text-xs text-slate-400 ml-5 border-l-2 border-slate-200 pl-2 mt-0.5">
                  {item.subCategoryName}
               </span>
           )}
        </div>
      ),
    },
    { header: "Cost", render: (i) => formatCurrency(i.costPrice) },
    { 
      header: "Selling", 
      render: (i) => <span className="font-bold text-slate-800">{formatCurrency(i.sellingPrice)}</span> 
    },
    { 
      header: "Reorder", 
      render: (i) => (
        <div className="text-center">
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                {i.itemType === ItemType.SERVICE ? "-" : i.reorderLevel}
            </span>
        </div>
      )
    },
    { header: "Created", render: (i) => <span className="text-xs text-slate-400">{formatDateTime(i.createdAt)}</span> },
    {
      header: "Status",
      render: (i) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-bold ${
            i.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {i.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (i) =>
        hasPermission(user.role, "MANAGE_ITEMS") ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/items/${i.id}/edit`)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => openDeleteModal(i)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : null,
    },
  ], [navigate, singleCategoryMode, user.role]);

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
  ];

  const subCategoryOptions = [
    { value: "", label: "All Sub Categories" },
    ...subCategories.map((subCategory) => ({
      value: String(subCategory.id),
      label: subCategory.name,
    })),
  ];

  return (
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex items-center justify-between" style={{ animationDelay: "80ms" }}>
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Items Registry</h1>
            <p className="text-slate-500 text-sm">Manage products and pricing</p>
        </div>

        {hasPermission(user.role, "MANAGE_ITEMS") && (
          <Button onClick={() => navigate("/items/new")}>
            <Plus size={20} className="mr-2" />
            Add Item
          </Button>
        )}
      </div>

      <Card className="sales-panel-enter sales-panel-hover p-0 overflow-hidden" style={{ animationDelay: "130ms" }}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-3 min-[440px]:grid-cols-3 min-[620px]:grid-cols-4 xl:grid-cols-12 xl:items-center">
            <div className="relative col-span-full min-[440px]:col-span-3 min-[620px]:col-span-4 xl:col-span-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search name, barcode, or category..."
                ref={searchRef}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
              <CustomSelect
                value={categoryId}
                onChange={handleCategoryChange}
                options={categoryOptions}
                valueKey="value"
                labelKey="label"
                placeholder="All Categories"
                buttonClassName="h-10 rounded-lg"
              />
            </div>

            {!singleCategoryMode && (
              <div className="col-span-1 xl:col-span-2">
                <CustomSelect
                  value={subCategoryId}
                  onChange={(value) => {
                    setSubCategoryId(value);
                    resetPage();
                  }}
                  options={subCategoryOptions}
                  valueKey="value"
                  labelKey="label"
                  placeholder="All Sub Categories"
                  disabled={!categoryId}
                  buttonClassName="h-10 rounded-lg"
                />
              </div>
            )}

            <div className="col-span-1 xl:col-span-2">
              <CustomSelect
                value={itemType}
                onChange={(value) => {
                  setItemType(value);
                  resetPage();
                }}
                options={itemTypeOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-10 rounded-lg"
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
              <CustomSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  resetPage();
                }}
                options={statusOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-10 rounded-lg"
              />
            </div>

            {configuration.recipeItemsEnabled && kotEnabled && (
              <div className="col-span-1 xl:col-span-2">
                <CustomSelect
                  value={kotFilter}
                  onChange={(value) => {
                    setKotFilter(value);
                    resetPage();
                  }}
                  options={kotOptions}
                  valueKey="value"
                  labelKey="label"
                  buttonClassName="h-10 rounded-lg"
                />
              </div>
            )}

            <div className="col-span-1 xl:col-span-2">
              <CustomSelect
                value={priceField}
                onChange={(value) => {
                  setPriceField(value);
                  resetPage();
                }}
                options={priceFieldOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-10 rounded-lg"
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
              <CustomSelect
                value={priceOperator}
                onChange={(value) => {
                  setPriceOperator(value);
                  resetPage();
                }}
                options={priceOperatorOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-10 rounded-lg"
              />
            </div>

            <div className="col-span-full min-[440px]:col-span-3 min-[620px]:col-span-2 xl:col-span-2">
              <input
                type="number"
                min="0"
                value={priceAmount}
                onChange={(e) => {
                  setPriceAmount(e.target.value);
                  resetPage();
                }}
                placeholder="Price"
                disabled={priceOperator === "ALL"}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
              <Button type="button" variant="secondary" onClick={clearFilters} className="h-10 w-full px-4 text-sm">
                Clear
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Loading items..." />
          </div>
        ) : (
          <Table columns={columns} data={items} /> 
        )}

        <TablePagination
          summary={`Showing ${items.length} of ${totalItems} items. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          loading={loading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
      </Card>

      <Modal isOpen={deleteModalOpen} onClose={closeDeleteModal} title="Delete Item" size="md">
        <div className="space-y-5">
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
            <div>
              <div className="font-semibold text-slate-900">{deleteCheck?.itemName || "Item"}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Permanent delete is allowed only when this item has no sale, stock, purchase, recipe, processing, promotion, or warranty references.
              </p>
            </div>
          </div>

          {deleteLoading && !deleteCheck?.reasons?.length ? (
            <LoadingSpinner size="md" text="Checking item references..." />
          ) : deleteCheck?.canDelete ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              This item has no history or active references. You can delete it permanently.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-800">Cannot delete permanently</div>
              <ul className="mt-3 space-y-2">
                {(deleteCheck?.reasons || []).map((reason) => (
                  <li key={reason} className="text-sm text-slate-600">
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-slate-500">
                Use deactivate to hide this item from POS while keeping old records safe.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeDeleteModal} disabled={deleteLoading}>
              Cancel
            </Button>
            {deleteCheck?.canDelete ? (
              <Button type="button" variant="danger" onClick={handlePermanentDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </Button>
            ) : (
              <Button type="button" variant="danger" onClick={handleDeactivate} disabled={deleteLoading || !deleteCheck?.itemId}>
                {deleteLoading ? "Deactivating..." : "Deactivate Instead"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ItemsPage;
