import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Eye, Plus, RefreshCw, Save } from "lucide-react";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Modal from "../components/common/Modal";
import Table from "../components/common/Table";
import { stockAPI } from "../api/stock.api";
import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import { ItemType } from "../utils/constants";
import { formatCurrency, formatDateTime, formatQuantityWithUnit } from "../utils/formatters";

const unitOptions = [
  { value: "PCS", label: "PCS" },
  { value: "KG", label: "KG" },
  { value: "G", label: "G" },
  { value: "L", label: "L" },
  { value: "ML", label: "ML" },
];

const primaryUnit = (item) => {
  if (item?.itemType === ItemType.WEIGHT) return "KG";
  if (item?.itemType === ItemType.VOLUME) return "L";
  return item?.defaultUnit || "PCS";
};

const formatQty = (qty, unit) => formatQuantityWithUnit(qty, unit || "PCS");

const scaledDefaultQty = (defaultQty, sourceQty) => {
  const baseQty = Number(defaultQty || 0);
  const multiplier = Number(sourceQty || 0);
  if (!baseQty || !multiplier) return "";
  const calculated = Number((baseQty * multiplier).toFixed(3));
  return Number.isFinite(calculated) ? String(calculated) : "";
};

const applyOutputTemplate = (outputs, sourceQty) =>
  outputs.map((output) => ({
    ...output,
    qty: scaledDefaultQty(output.defaultQty, sourceQty),
  }));

const emptyForm = {
  selectedSourceId: "",
  selectedBatchId: "",
  sourceQty: "",
  sourceQtyUnit: "PCS",
  outputs: [],
  note: "",
};

const StockProcessingPage = () => {
  const { selectedBranchId } = useBranch();
  const { user } = useAuth();
  const branchId = selectedBranchId || user?.branchId || 0;

  const [sources, setSources] = useState([]);
  const [history, setHistory] = useState([]);
  const [historySourceId, setHistorySourceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const selectedSource = useMemo(
    () => sources.find((source) => String(source.id) === String(form.selectedSourceId)),
    [form.selectedSourceId, sources]
  );

  const sourceBatches = useMemo(
    () => (selectedSource?.batches || []).filter((batch) => Number(batch.qty || 0) > 0),
    [selectedSource]
  );

  const batchOptions = useMemo(
    () => sourceBatches.map((batch) => ({
      ...batch,
      label: `${batch.batchId || batch.id} | ${formatQty(batch.displayQty ?? batch.qty, batch.displayUnit || selectedSource?.defaultUnit)} | ${formatCurrency(batch.price)}`,
    })),
    [selectedSource?.defaultUnit, sourceBatches]
  );

  const loadSources = async () => {
    const response = await stockAPI.processingSources({ branchId });
    setSources(Array.isArray(response.data) ? response.data : []);
  };

  const loadHistory = async (sourceId = historySourceId) => {
    const response = await stockAPI.processingHistory({
      branchId,
      sourceItemId: sourceId || undefined,
      page: 0,
      size: 50,
    });
    setHistory(response.data?.content || []);
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadSources(), loadHistory()]);
    } catch {
      toast.error("Failed to load stock processing data");
      setSources([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const openCreateModal = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setCreateOpen(false);
    setForm(emptyForm);
  };

  const handleHistorySourceFilter = async (sourceId) => {
    setHistorySourceId(sourceId);
    try {
      await loadHistory(sourceId);
    } catch {
      toast.error("Failed to load history");
    }
  };

  const handleSourceChange = async (sourceId) => {
    const source = sources.find((item) => String(item.id) === String(sourceId));
    setForm((prev) => ({
      ...prev,
      selectedSourceId: sourceId,
      selectedBatchId: "",
      sourceQty: "",
      sourceQtyUnit: primaryUnit(source),
      outputs: [],
      note: "",
    }));

    if (!sourceId) return;

    try {
      const response = await stockAPI.processingOutputs(sourceId);
      const rows = Array.isArray(response.data) ? response.data : [];
      setForm((prev) => ({
        ...prev,
        outputs: applyOutputTemplate(rows.map((row) => ({
          outputItemId: row.outputItemId,
          outputName: row.outputName,
          itemType: row.itemType,
          defaultQty: row.defaultQty ?? "",
          defaultQtyUnit: row.defaultQtyUnit || primaryUnit(row),
          defaultSellingPrice: row.defaultSellingPrice ?? 0,
          sellingPrice: row.defaultSellingPrice ?? 0,
          qty: "",
          qtyUnit: primaryUnit(row),
          waste: !!row.waste,
        })), ""),
      }));
    } catch {
      toast.error("Failed to load linked output items");
    }
  };

  const updateOutput = (index, field, value) => {
    setForm((prev) => {
      const nextOutputs = [...prev.outputs];
      nextOutputs[index] = { ...nextOutputs[index], [field]: value };
      return { ...prev, outputs: nextOutputs };
    });
  };

  const handleSave = async () => {
    if (!form.selectedSourceId || !form.selectedBatchId || Number(form.sourceQty || 0) <= 0) {
      toast.error("Select source, batch and process quantity");
      return;
    }

    const outputPayload = form.outputs
      .filter((output) => Number(output.qty || 0) > 0)
      .map((output) => ({
        outputItemId: Number(output.outputItemId),
        qty: Number(output.qty),
        qtyUnit: output.qtyUnit,
        sellingPrice: Number(output.sellingPrice || 0),
        waste: !!output.waste,
      }));

    if (!outputPayload.some((output) => !output.waste)) {
      toast.error("Enter at least one non-waste output quantity");
      return;
    }

    setSaving(true);
    try {
      await stockAPI.createProcessing({
        branchId: Number(branchId),
        sourceItemId: Number(form.selectedSourceId),
        sourceBatchId: Number(form.selectedBatchId),
        sourceQty: Number(form.sourceQty),
        sourceQtyUnit: form.sourceQtyUnit,
        note: form.note.trim() || null,
        outputs: outputPayload,
      });
      toast.success("Stock processed successfully");
      setCreateOpen(false);
      setForm(emptyForm);
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process stock");
    } finally {
      setSaving(false);
    }
  };

  const historyColumns = useMemo(
    () => [
      { header: "Date", render: (row) => formatDateTime(row.processedAt) },
      { header: "Source", render: (row) => row.sourceItemName },
      { header: "Consumed", render: (row) => formatQty(row.sourceDisplayQty, row.sourceQtyUnit) },
      {
        header: "Outputs",
        render: (row) => (
          <div className="space-y-1">
            {(row.outputs || []).slice(0, 3).map((output) => (
              <div key={`${row.id}-${output.outputItemId}`} className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{output.outputItemName}</span>{" "}
                {formatQty(output.displayQty, output.qtyUnit)}
                {output.waste ? <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-red-600">Waste</span> : null}
              </div>
            ))}
            {(row.outputs || []).length > 3 && (
              <div className="text-xs font-semibold text-slate-500">+{row.outputs.length - 3} more</div>
            )}
          </div>
        ),
      },
      { header: "Cost", render: (row) => formatCurrency(row.sourceCost) },
      {
        header: "",
        render: () => (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            <Eye size={13} /> View
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Stock Processing</h1>
          <p className="mt-1 text-sm text-slate-500">Convert source stock into output items and review processing history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={refreshAll}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button type="button" onClick={openCreateModal}>
            <Plus size={16} className="mr-2" />
            New Processing
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
          <CustomSelect
            value={historySourceId}
            onChange={handleHistorySourceFilter}
            options={[{ id: "", name: "All Sources" }, ...sources]}
            valueKey="id"
            labelKey="name"
            placeholder="Filter by source"
          />
        </div>

        {loading ? (
          <LoadingSpinner size="lg" text="Loading processing history..." />
        ) : (
          <Table columns={historyColumns} data={history} onRowClick={setDetailsRecord} />
        )}
      </Card>

      <Modal isOpen={createOpen} onClose={closeCreateModal} title="New Stock Processing" size="xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Source Item</label>
              <CustomSelect
                value={form.selectedSourceId}
                onChange={handleSourceChange}
                options={sources}
                valueKey="id"
                labelKey="name"
                placeholder="Select source"
              />
            </div>

            {selectedSource && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="font-semibold text-slate-800">{selectedSource.name}</div>
                <div className="mt-1 text-slate-500">{selectedSource.barcode || "No barcode"}</div>
                <div className="mt-3 rounded-lg bg-white px-3 py-2 font-semibold text-emerald-700">
                  Available: {formatQty(selectedSource.availableQty, primaryUnit(selectedSource))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Source Batch</label>
              <CustomSelect
                value={form.selectedBatchId}
                onChange={(value) => setForm((prev) => ({ ...prev, selectedBatchId: value }))}
                options={batchOptions}
                valueKey="batchId"
                labelKey="label"
                placeholder="Select batch"
                disabled={!selectedSource}
              />
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Process Qty</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.sourceQty}
                  onChange={(e) => {
                    const nextSourceQty = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      sourceQty: nextSourceQty,
                      outputs: applyOutputTemplate(prev.outputs, nextSourceQty),
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
                <CustomSelect
                  value={form.sourceQtyUnit}
                  onChange={(value) => setForm((prev) => ({ ...prev, sourceQtyUnit: value }))}
                  options={unitOptions}
                  valueKey="value"
                  labelKey="label"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-slate-800">Output Quantities</h2>
              </div>
              <div className="space-y-3 p-4">
                {form.outputs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    Select a source item with linked outputs.
                  </div>
                ) : (
                  <>
                    <div className="hidden md:grid md:grid-cols-[minmax(0,1.6fr)_120px_120px_110px_72px] md:gap-3 md:px-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output Item</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sell Price</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</div>
                    </div>

                    {form.outputs.map((output, index) => (
                      <div key={output.outputItemId} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.6fr)_120px_120px_110px_72px]">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">Output Item</div>
                          <div className="truncate font-semibold text-slate-800">{output.outputName}</div>
                          <div className="text-xs text-slate-500">{output.itemType}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span>Default Qty: {formatQty(output.defaultQty, output.defaultQtyUnit)}</span>
                            {!output.waste && <span>Default Sell: {formatCurrency(output.defaultSellingPrice ?? 0)}</span>}
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">Qty</div>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={output.qty}
                            onChange={(e) => updateOutput(index, "qty", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Qty"
                          />
                        </div>

                        <div>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">Sell Price</div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={output.sellingPrice}
                            onChange={(e) => updateOutput(index, "sellingPrice", e.target.value)}
                            disabled={output.waste}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            placeholder="Batch sell price"
                          />
                        </div>

                        <div>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">Unit</div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                            {output.qtyUnit}
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">Type</div>
                          <div className={`flex h-[42px] items-center justify-center rounded-lg px-2 text-xs font-bold ${output.waste ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                            {output.waste ? "Waste" : "Stock"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <textarea
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  rows={2}
                  placeholder="Note"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={saving || form.outputs.length === 0}>
                    <Save size={16} className="mr-2" />
                    {saving ? "Saving..." : "Process Stock"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!detailsRecord}
        onClose={() => setDetailsRecord(null)}
        title={detailsRecord ? `Processing #${detailsRecord.id}` : "Processing Details"}
        size="xl"
      >
        {detailsRecord && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">Source</div>
                <div className="mt-1 font-semibold text-slate-800">{detailsRecord.sourceItemName}</div>
                <div className="text-xs text-slate-500">{detailsRecord.sourceBarcode || "No barcode"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">Consumed</div>
                <div className="mt-1 font-semibold text-slate-800">
                  {formatQty(detailsRecord.sourceDisplayQty, detailsRecord.sourceQtyUnit)}
                </div>
                <div className="text-xs text-slate-500">Batch {detailsRecord.sourceBatchCode || detailsRecord.sourceBatchId}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">Cost</div>
                <div className="mt-1 font-semibold text-slate-800">{formatCurrency(detailsRecord.sourceCost)}</div>
                <div className="text-xs text-slate-500">{formatDateTime(detailsRecord.processedAt)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Output Details</div>
              <div className="divide-y divide-slate-100">
                {(detailsRecord.outputs || []).map((output) => (
                  <div key={`${detailsRecord.id}-${output.outputItemId}`} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_130px_130px_130px_120px]">
                    <div>
                      <div className="font-semibold text-slate-800">{output.outputItemName}</div>
                      <div className="text-xs text-slate-500">{output.outputBarcode || "No barcode"}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-700">{formatQty(output.displayQty, output.qtyUnit)}</div>
                    <div className="text-sm text-slate-600">{formatCurrency(output.allocatedCost)}</div>
                    <div className="text-sm text-slate-600">{output.waste ? "-" : formatCurrency(output.sellingPrice)}</div>
                    <div>
                      <span className={`rounded px-2 py-1 text-xs font-bold ${output.waste ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                        {output.waste ? "Waste" : `Batch ${output.createdBatchId || "-"}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">Processed By</div>
                <div className="mt-1 font-semibold text-slate-800">{detailsRecord.processedByUsername || "-"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">Note</div>
                <div className="mt-1 text-sm text-slate-700">{detailsRecord.note || "-"}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StockProcessingPage;
