import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, CheckCircle2, Download, RefreshCw, Upload } from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import CustomSelect from "../components/common/CustomSelect";
import { categoriesAPI } from "../api/categories.api";
import { itemsAPI } from "../api/items.api";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { ItemType } from "../utils/constants";
import RecipeIngredientsImportPage from "./RecipeIngredientsImportPage";

const rowStatusClasses = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IMPORTED: "border-blue-200 bg-blue-50 text-blue-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
  SKIPPED: "border-slate-200 bg-slate-100 text-slate-600",
};

const itemTypeOptions = [
  { value: "NORMAL", label: "NORMAL" },
  { value: "WEIGHT", label: "WEIGHT" },
  { value: "VOLUME", label: "VOLUME" },
  { value: "RECIPE", label: "RECIPE" },
  { value: "SERVICE", label: "SERVICE" },
];

const unitOptions = [
  { value: "PCS", label: "PCS" },
  { value: "KG", label: "KG" },
  { value: "G", label: "G" },
  { value: "L", label: "L" },
  { value: "ML", label: "ML" },
  { value: "SERVICE", label: "SERVICE" },
];

const booleanOptions = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export default function ItemExcelImportPage({ initialTab = "items" }) {
  const fileInputRef = useRef(null);
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [categories, setCategories] = useState([]);
  const [subCategoryMap, setSubCategoryMap] = useState({});
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: String(category.id), label: category.name })),
    [categories]
  );

  const categoryNameById = useMemo(
    () =>
      categories.reduce((acc, category) => {
        acc[String(category.id)] = category.name;
        return acc;
      }, {}),
    [categories]
  );

  const summary = useMemo(
    () => ({
      ready: rows.filter((row) => row.status === "READY").length,
      imported: rows.filter((row) => row.status === "IMPORTED").length,
      error: rows.filter((row) => row.status === "ERROR").length,
      skipped: rows.filter((row) => row.status === "SKIPPED").length,
      selected: rows.filter((row) => row.selected ?? true).length,
    }),
    [rows]
  );

  useEffect(() => {
    loadCategories();
  }, [singleCategoryMode]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadCategories = async () => {
    try {
      const res = singleCategoryMode
        ? await categoriesAPI.getSingleCategories()
        : await categoriesAPI.getAll();
      setCategories(res.data || []);
    } catch (error) {
      toast.error("Failed to load categories");
    }
  };

  const loadSubCategories = async (categoryId) => {
    if (singleCategoryMode) return [];
    if (!categoryId) return [];
    if (subCategoryMap[String(categoryId)]) {
      return subCategoryMap[String(categoryId)];
    }

    try {
      const res = await categoriesAPI.getSubCategories(categoryId);
      const next = res.data || [];
      setSubCategoryMap((prev) => ({
        ...prev,
        [String(categoryId)]: next,
      }));
      return next;
    } catch (error) {
      toast.error("Failed to load sub-categories");
      return [];
    }
  };

  const ensureSubCategoriesLoaded = async (nextRows) => {
    if (singleCategoryMode) return;
    const categoryIds = [
      ...new Set(
        (nextRows || [])
          .map((row) => row.categoryId)
          .filter((categoryId) => categoryId !== null && categoryId !== undefined && categoryId !== "")
          .map((categoryId) => String(categoryId))
      ),
    ];
    await Promise.all(categoryIds.map((categoryId) => loadSubCategories(categoryId)));
  };

  const applyRows = async (nextRows, { keepImported = true } = {}) => {
    const normalizedRows = Array.isArray(nextRows) ? nextRows : [];
    await ensureSubCategoriesLoaded(normalizedRows);
    setRows(keepImported ? normalizedRows : normalizedRows.filter((row) => row.status !== "IMPORTED"));
  };

  const getSubCategoryOptions = (categoryId) =>
    (singleCategoryMode ? categories : subCategoryMap[String(categoryId)] || []).map((subCategory) => ({
      value: String(subCategory.id),
      label: subCategory.name,
    }));

  const downloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await itemsAPI.downloadImportTemplate();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "items-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const previewFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingFile(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await itemsAPI.previewImport(formData);
      await applyRows(res.data?.rows || []);
      toast.success(`Loaded ${res.data?.totalRows || 0} rows`);
    } catch (error) {
      setRows([]);
      toast.error(error?.response?.data?.message || "Failed to load Excel file");
    } finally {
      setLoadingFile(false);
    }
  };

  const resetImport = () => {
    setRows([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateRow = async (rowNumber, field, value) => {
    if (field === "categoryId") {
      const categoryId = value ? Number(value) : null;
      const categoryName = categoryId ? categoryNameById[String(categoryId)] || "" : "";
      if (categoryId) {
        await loadSubCategories(categoryId);
      }
      setRows((prev) =>
        prev.map((row) =>
          row.rowNumber === rowNumber
            ? {
                ...row,
                categoryId,
                categoryName,
                enteredMainCategory: categoryName,
                subCategoryId: null,
                subCategoryName: "",
                enteredSubCategory: "",
                status: row.status === "IMPORTED" ? row.status : "READY",
                message: row.status === "IMPORTED" ? row.message : "Edited",
              }
            : row
        )
      );
      return;
    }

    if (field === "subCategoryId") {
      setRows((prev) =>
        prev.map((row) => {
          if (row.rowNumber !== rowNumber) return row;
          const subCategoryId = value ? Number(value) : null;
          const option = getSubCategoryOptions(row.categoryId).find((item) => String(item.value) === String(subCategoryId || ""));
          return {
            ...row,
            ...(singleCategoryMode
              ? {
                  categoryId: null,
                  categoryName: "",
                  enteredMainCategory: "",
                }
              : {}),
            subCategoryId,
            subCategoryName: option?.label || "",
            enteredSubCategory: option?.label || "",
            status: row.status === "IMPORTED" ? row.status : "READY",
            message: row.status === "IMPORTED" ? row.message : "Edited",
          };
        })
      );
      return;
    }

    if (field === "branchIdsText") {
      const branchIds = value
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => Number(token))
        .filter(Number.isFinite);
      setRows((prev) =>
        prev.map((row) =>
          row.rowNumber === rowNumber
            ? { ...row, branchIds, status: row.status === "IMPORTED" ? row.status : "READY", message: "Edited" }
            : row
        )
      );
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.rowNumber === rowNumber
          ? { ...row, [field]: value, status: row.status === "IMPORTED" ? row.status : "READY", message: "Edited" }
          : row
      )
    );
  };

  const toggleSelected = (rowNumber) => {
    setRows((prev) =>
      prev.map((row) => (row.rowNumber === rowNumber ? { ...row, selected: !(row.selected ?? true) } : row))
    );
  };

  const importRows = async () => {
    if (!rows.length) {
      toast.error("No rows to import");
      return;
    }

    setImporting(true);
    try {
      const payload = {
        rows: rows.map((row) => ({
          ...row,
          categoryId: row.categoryId ? Number(row.categoryId) : null,
          subCategoryId: row.subCategoryId ? Number(row.subCategoryId) : null,
          branchIds: Array.isArray(row.branchIds) ? row.branchIds.map((id) => Number(id)) : [],
        })),
      };
      const res = await itemsAPI.commitImport(payload);
      const data = res.data || {};
      await applyRows(data.rows || [], { keepImported: false });

      if (data.importedCount) toast.success(`Imported ${data.importedCount} rows`);
      if (data.errorCount) toast.error(`${data.errorCount} rows still need fixing`);
      if (!data.errorCount && !data.skippedCount) resetImport();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-enter space-y-5 p-6">
      <div className="page-section-enter flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Excel Import</h1>
          <p className="text-sm text-slate-500">Import item rows and recipe ingredient joins from Excel.</p>
        </div>
      </div>

      <div className="inline-flex w-full max-w-md rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors ${
            activeTab === "items" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          Items
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("recipe-ingredients")}
          className={`h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors ${
            activeTab === "recipe-ingredients" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          Recipe Ingredients
        </button>
      </div>

      {activeTab === "items" ? (
        <>
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Required columns:</span>{" "}
              `importKey`, `barcode`, `name`, `subCategory` or `subCategoryId`, `costPrice`, `sellingPrice`, `reorderLevel`, `itemType`, `defaultUnit`, `active`, `posVisible`, `kotEnabled`, `branchIds`.
            </div>
            <div className="text-xs text-slate-500">
              Recipe items import here without ingredients. Add ingredient joins from the Recipe Ingredients tab.
            </div>
            {fileName ? <span className="ml-2 font-medium text-slate-800">{fileName}</span> : null}
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={downloadTemplate} disabled={downloadingTemplate}>
                <Download size={16} className="mr-2" />
                {downloadingTemplate ? "Downloading..." : "Items Template"}
              </Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={previewFile} />
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={loadingFile}>
                <Upload size={16} className="mr-2" />
                {loadingFile ? "Loading..." : "Upload Excel"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Ready: {summary.ready}</span>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700">Errors: {summary.error}</span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-700">Imported: {summary.imported}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">Selected: {summary.selected}</span>
            </div>
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          Upload an Excel file to load the preview table.
        </Card>
      ) : (
        <Card className="space-y-4 p-4">
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-[1780px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-3 py-2">Use</th>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Import Key</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Barcode</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">{singleCategoryMode ? "Category" : "Main Category"}</th>
                  {!singleCategoryMode && <th className="px-3 py-2">Sub Category</th>}
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Sell</th>
                  <th className="px-3 py-2">Reorder</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">POS</th>
                  <th className="px-3 py-2">KOT</th>
                  <th className="px-3 py-2">Ingredients</th>
                  <th className="px-3 py-2">Branch IDs</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const subCategoryOptions = getSubCategoryOptions(row.categoryId);
                  const statusClass = rowStatusClasses[row.status] || rowStatusClasses.SKIPPED;
                  return (
                    <tr key={row.rowNumber} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={row.selected ?? true}
                          onChange={() => toggleSelected(row.rowNumber)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-700">{row.rowNumber}</td>
                      <td className="px-3 py-3">
                        <input className="w-28 rounded-lg border border-slate-300 px-2 py-2" value={row.importKey || ""} onChange={(e) => updateRow(row.rowNumber, "importKey", e.target.value)} placeholder="R001" />
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>{row.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        <input className="w-28 rounded-lg border border-slate-300 px-2 py-2" value={row.barcode || ""} onChange={(e) => updateRow(row.rowNumber, "barcode", e.target.value)} placeholder="Auto" />
                      </td>
                      <td className="px-3 py-3">
                        <input className="w-44 rounded-lg border border-slate-300 px-2 py-2" value={row.name || ""} onChange={(e) => updateRow(row.rowNumber, "name", e.target.value)} />
                      </td>
                      <td className="px-3 py-3">
                        <CustomSelect
                          value={singleCategoryMode ? row.subCategoryId ? String(row.subCategoryId) : "" : row.categoryId ? String(row.categoryId) : ""}
                          onChange={(value) => updateRow(row.rowNumber, singleCategoryMode ? "subCategoryId" : "categoryId", value)}
                          options={categoryOptions}
                          valueKey="value"
                          labelKey="label"
                          placeholder="Category"
                          className="w-48"
                        />
                      </td>
                      {!singleCategoryMode && (
                        <td className="px-3 py-3">
                          <CustomSelect value={row.subCategoryId ? String(row.subCategoryId) : ""} onChange={(value) => updateRow(row.rowNumber, "subCategoryId", value)} options={subCategoryOptions} valueKey="value" labelKey="label" placeholder="Sub category" className="w-48" disabled={!row.categoryId} />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <CustomSelect value={row.itemType || ""} onChange={(value) => updateRow(row.rowNumber, "itemType", value)} options={itemTypeOptions} valueKey="value" labelKey="label" className="w-36" />
                      </td>
                      <td className="px-3 py-3">
                        <CustomSelect value={row.defaultUnit || ""} onChange={(value) => updateRow(row.rowNumber, "defaultUnit", value)} options={unitOptions} valueKey="value" labelKey="label" className="w-28" />
                      </td>
                      <td className="px-3 py-3">
                        <input type="number" min="0" step="0.01" className="w-28 rounded-lg border border-slate-300 px-2 py-2" value={row.costPrice ?? ""} onChange={(e) => updateRow(row.rowNumber, "costPrice", toNumberOrNull(e.target.value))} />
                      </td>
                      <td className="px-3 py-3">
                        <input type="number" min="0" step="0.01" className="w-28 rounded-lg border border-slate-300 px-2 py-2" value={row.sellingPrice ?? ""} onChange={(e) => updateRow(row.rowNumber, "sellingPrice", toNumberOrNull(e.target.value))} />
                      </td>
                      <td className="px-3 py-3">
                        <input type="number" min="0" step="0.001" className="w-28 rounded-lg border border-slate-300 px-2 py-2" value={row.reorderLevel ?? ""} onChange={(e) => updateRow(row.rowNumber, "reorderLevel", toNumberOrNull(e.target.value))} />
                      </td>
                      <td className="px-3 py-3">
                        <CustomSelect value={String(row.active ?? true)} onChange={(value) => updateRow(row.rowNumber, "active", value === "true")} options={booleanOptions} valueKey="value" labelKey="label" className="w-24" />
                      </td>
                      <td className="px-3 py-3">
                        <CustomSelect value={String(row.posVisible ?? true)} onChange={(value) => updateRow(row.rowNumber, "posVisible", value === "true")} options={booleanOptions} valueKey="value" labelKey="label" className="w-24" />
                      </td>
                      <td className="px-3 py-3">
                        <CustomSelect value={String(row.kotEnabled ?? false)} onChange={(value) => updateRow(row.rowNumber, "kotEnabled", value === "true")} options={booleanOptions} valueKey="value" labelKey="label" className="w-24" />
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                          {Array.isArray(row.ingredients) ? row.ingredients.length : 0}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <input className="w-28 rounded-lg border border-slate-300 px-2 py-2" value={Array.isArray(row.branchIds) ? row.branchIds.join(",") : ""} onChange={(e) => updateRow(row.rowNumber, "branchIdsText", e.target.value)} placeholder="1,2" disabled={row.itemType !== ItemType.SERVICE} />
                      </td>
                      <td className="px-3 py-3">
                        <div className={`flex min-w-[240px] items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                          row.status === "ERROR"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : row.status === "READY"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}>
                          {row.status === "ERROR" ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
                          <span>{row.message || "-"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">Imported rows are removed from the table. Error rows remain here for correction and retry.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetImport} disabled={loadingFile || importing}>
                <RefreshCw size={16} className="mr-2" />
                Reset
              </Button>
              <Button type="button" onClick={importRows} disabled={importing || rows.length === 0}>
                <Upload size={16} className="mr-2" />
                {importing ? "Importing..." : "Import Selected Rows"}
              </Button>
            </div>
          </div>
        </Card>
      )}
        </>
      ) : (
        <RecipeIngredientsImportPage embedded />
      )}
    </div>
  );
}
