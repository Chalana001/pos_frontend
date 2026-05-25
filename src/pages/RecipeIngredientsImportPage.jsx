import React, { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Download, RefreshCw, Upload } from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { itemsAPI } from "../api/items.api";

const rowStatusClasses = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IMPORTED: "border-blue-200 bg-blue-50 text-blue-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
  SKIPPED: "border-slate-200 bg-slate-100 text-slate-600",
};

const toIngredientLabel = (ingredient) => {
  const id = ingredient.ingredientItemId || ingredient.ingredientId || ingredient.ingredientName || ingredient.ingredient || "-";
  const qty = ingredient.quantity ?? ingredient.qty ?? "";
  const unit = ingredient.qtyUnit || ingredient.unit || "";
  return `${id}: ${qty} ${unit}`.trim();
};

export default function RecipeIngredientsImportPage({ embedded = false }) {
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

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

  const resetImport = () => {
    setRows([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await itemsAPI.downloadRecipeIngredientsTemplate();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "recipe-ingredients-import-template.xlsx";
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
      const res = await itemsAPI.previewRecipeIngredientsImport(formData);
      setRows(res.data?.rows || []);
      toast.success(`Loaded ${res.data?.totalRows || 0} recipe rows`);
    } catch (error) {
      setRows([]);
      toast.error(error?.response?.data?.message || "Failed to load Excel file");
    } finally {
      setLoadingFile(false);
      if (event.target) {
        event.target.value = "";
      }
    }
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
          existingItemId: row.existingItemId ? Number(row.existingItemId) : null,
          recipeIngredientOnly: true,
          branchIds: [],
          ingredients: Array.isArray(row.ingredients)
            ? row.ingredients.map((ingredient) => ({
                ...ingredient,
                recipeItemId: ingredient.recipeItemId ? Number(ingredient.recipeItemId) : null,
                ingredientItemId: ingredient.ingredientItemId ? Number(ingredient.ingredientItemId) : null,
              }))
            : [],
        })),
      };
      const res = await itemsAPI.commitRecipeIngredientsImport(payload);
      const data = res.data || {};
      setRows((data.rows || []).filter((row) => row.status !== "IMPORTED"));

      if (data.importedCount) toast.success(`Imported ${data.importedCount} recipe rows`);
      if (data.errorCount) toast.error(`${data.errorCount} rows still need fixing`);
      if (!data.errorCount && !data.skippedCount) resetImport();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={embedded ? "space-y-5" : "page-enter space-y-5 p-6"}>
      <div className="page-section-enter flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Recipe Ingredients Import</h1>
          <p className="text-sm text-slate-500">Upload recipe ingredient rows after recipe and ingredient items exist.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={downloadTemplate} disabled={downloadingTemplate}>
            <Download size={16} className="mr-2" />
            {downloadingTemplate ? "Downloading..." : "Template"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={previewFile} />
          <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={loadingFile}>
            <Upload size={16} className="mr-2" />
            {loadingFile ? "Loading..." : "Upload Excel"}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Required columns:</span>{" "}
              `itemId`, `ingredientId` or `ingredientName`, `qty`, `qtyUnit`.
            </div>
            <div className="text-xs text-slate-500">
              `itemId` is the recipe item id. `ingredientName` must exactly match one normal, weight, or volume item. `qtyUnit` accepts PCS, G, KG, ML, or L.
            </div>
            {fileName ? <span className="font-medium text-slate-800">{fileName}</span> : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Ready: {summary.ready}</span>
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700">Errors: {summary.error}</span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-700">Imported: {summary.imported}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">Selected: {summary.selected}</span>
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
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-3 py-2">Use</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Recipe Item ID</th>
                  <th className="px-3 py-2">Recipe Item</th>
                  <th className="px-3 py-2">Ingredients</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
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
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>{row.status}</span>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-700">{row.existingItemId || "-"}</td>
                      <td className="px-3 py-3 text-slate-800">{row.name || "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[420px] flex-wrap gap-1">
                          {(row.ingredients || []).map((ingredient, index) => (
                            <span key={`${ingredient.ingredientItemId || "ingredient"}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                              {toIngredientLabel(ingredient)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.message || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={resetImport}>
              <RefreshCw size={16} className="mr-2" />
              Reset
            </Button>
            <Button type="button" onClick={importRows} disabled={importing || summary.selected === 0}>
              {importing ? "Importing..." : "Import Ingredients"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
