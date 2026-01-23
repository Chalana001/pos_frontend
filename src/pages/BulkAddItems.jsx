import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import AccordionSection from "../components/items/BulkItemForm";
import { branchesAPI } from "../api/branches.api";
import { itemsAPI } from "../api/items.api";

const uuid = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

const num = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const emptyDraft = () => ({
    // image
    imageUrl: "",

    // general
    name: "",
    barcode: "",
    category: "",
    subCategory: "",
    costPrice: "",
    sellingPrice: "",
    reorderLevel: "",
    description: "",

    // manage stock
    branchStocks: [], // [{branchId, qty, selected}]
});

export default function BulkAddItems() {
    const [branches, setBranches] = useState([]);
    const [draft, setDraft] = useState(emptyDraft());
    const [cart, setCart] = useState([]);
    const [saving, setSaving] = useState(false);

    // Accordion open states
    const [openImage, setOpenImage] = useState(true);
    const [openGeneral, setOpenGeneral] = useState(true);
    const [openStock, setOpenStock] = useState(true);

    const buildBulkPayload = (cart) => {
        const map = new Map(); // barcode -> grouped item

        for (const row of cart) {
            const barcode = row.barcode?.trim();
            if (!barcode) continue;

            // create grouped item if first time
            if (!map.has(barcode)) {
                map.set(barcode, {
                    itemCreateRequest: {
                        name: row.name,
                        barcode: row.barcode,
                        imageUrl: row.imageUrl || "",
                        category: row.category || "",
                        subCategory: row.subCategory || "",
                        costPrice: row.costPrice,
                        sellingPrice: row.sellingPrice,
                        reorderLevel: row.reorderLevel ?? 0,
                        description: row.description || "",
                    },
                    stocks: [],
                });
            }

            // add stock line
            map.get(barcode).stocks.push({
                branchId: row.branchId,
                quantity: row.quantity,
            });
        }

        return {
            items: Array.from(map.values()),
        };
    };

    // ========================
    // Load branches
    // ========================
    useEffect(() => {
        (async () => {
            try {
                const res = await branchesAPI.getAll(true); // active only
                const list = res.data || [];
                setBranches(list);

                // init branchStocks
                setDraft((d) => ({
                    ...d,
                    branchStocks: list.map((b) => ({
                        branchId: b.id,
                        qty: 0,
                        selected: false,
                    })),
                }));
            } catch (e) {
                toast.error("Failed to load branches");
            }
        })();
    }, []);

    const branchMap = useMemo(() => {
        const m = new Map();
        branches.forEach((b) => m.set(b.id, b));
        return m;
    }, [branches]);

    // ========================
    // Helpers
    // ========================
    const updateDraft = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

    const selectedCount = draft.branchStocks.filter((x) => x.selected).length;

    const imageBadge = draft.imageUrl?.trim() ? "1 Image" : "0 Image";

    const generalFilledCount = useMemo(() => {
        let c = 0;
        if (draft.name.trim()) c++;
        if (draft.barcode.trim()) c++;
        if (draft.category.trim()) c++;
        if (draft.subCategory.trim()) c++;
        if (String(draft.costPrice).trim()) c++;
        if (String(draft.sellingPrice).trim()) c++;
        if (String(draft.reorderLevel).trim()) c++;
        if (draft.description.trim()) c++;
        return c;
    }, [draft]);

    const generalBadge = `${generalFilledCount}/8`;

    const stockBadge = `${selectedCount}/${branches.length}`;

    // ========================
    // Manage stock table
    // ========================
    const toggleSelect = (branchId) => {
        setDraft((d) => ({
            ...d,
            branchStocks: d.branchStocks.map((x) =>
                x.branchId === branchId ? { ...x, selected: !x.selected } : x
            ),
        }));
    };

    const setQty = (branchId, qty) => {
        setDraft((d) => ({
            ...d,
            branchStocks: d.branchStocks.map((x) =>
                x.branchId === branchId ? { ...x, qty: Number(qty) } : x
            ),
        }));
    };

    const selectAll = () => {
        setDraft((d) => ({
            ...d,
            branchStocks: d.branchStocks.map((x) => ({ ...x, selected: true })),
        }));
    };

    const clearAll = () => {
        setDraft((d) => ({
            ...d,
            branchStocks: d.branchStocks.map((x) => ({ ...x, selected: false })),
        }));
    };

    // ========================
    // Add to cart (Option A)
    // Creates rows: Item + Branch
    // ========================
    const validateGeneral = () => {
        if (!draft.name.trim()) return "Item name is required";
        if (!draft.barcode.trim()) return "Barcode is required";

        const cost = num(draft.costPrice);
        const sell = num(draft.sellingPrice);
        if (cost === null || cost < 0) return "Cost price invalid";
        if (sell === null || sell < 0) return "Selling price invalid";

        return null;
    };

    const addToList = () => {
        const err = validateGeneral();
        if (err) return toast.error(err);

        const selected = draft.branchStocks.filter((x) => x.selected);
        if (selected.length === 0) return toast.error("Select at least 1 branch");

        // validate qty for selected
        for (const s of selected) {
            if (!s.qty || s.qty <= 0) return toast.error("Quantity must be > 0 for selected branches");
        }

        const baseItem = {
            name: draft.name.trim(),
            barcode: draft.barcode.trim(),
            imageUrl: draft.imageUrl?.trim() || "",
            category: draft.category?.trim() || "",
            subCategory: draft.subCategory?.trim() || "",
            costPrice: num(draft.costPrice),
            sellingPrice: num(draft.sellingPrice),
            reorderLevel: num(draft.reorderLevel) ?? 0,
            description: draft.description?.trim() || "",
        };

        // Create cart rows for each selected branch
        const newRows = selected.map((s) => ({
            tempId: uuid(),
            ...baseItem,
            branchId: s.branchId,
            quantity: Number(s.qty),
        }));

        // Merge duplicates: same barcode + same branch -> qty add
        setCart((prev) => {
            let updated = [...prev];
            for (const row of newRows) {
                const idx = updated.findIndex(
                    (x) => x.barcode === row.barcode && x.branchId === row.branchId
                );
                if (idx >= 0) {
                    updated[idx] = {
                        ...updated[idx],
                        quantity: updated[idx].quantity + row.quantity,
                        // keep latest general values
                        ...row,
                        tempId: updated[idx].tempId,
                    };
                } else {
                    updated.push(row);
                }
            }
            return updated;
        });

        // Reset (keep branches but clear selections + qty)
        setDraft((d) => ({
            ...emptyDraft(),
            branchStocks: d.branchStocks.map((x) => ({
                ...x,
                selected: false,
                qty: 0,
            })),
        }));

        toast.success("Added to list");
    };

    // Cart actions
    const removeRow = (tempId) => setCart((p) => p.filter((x) => x.tempId !== tempId));

    // edits a single row only (branch+item line)
    const editRow = (tempId) => {
        const row = cart.find((x) => x.tempId === tempId);
        if (!row) return;

        // load item info into draft
        setDraft((d) => ({
            ...d,
            imageUrl: row.imageUrl || "",
            name: row.name || "",
            barcode: row.barcode || "",
            category: row.category || "",
            subCategory: row.subCategory || "",
            costPrice: row.costPrice ?? "",
            sellingPrice: row.sellingPrice ?? "",
            reorderLevel: row.reorderLevel ?? "",
            description: row.description || "",
            branchStocks: d.branchStocks.map((bs) =>
                bs.branchId === row.branchId
                    ? { ...bs, selected: true, qty: row.quantity }
                    : { ...bs, selected: false, qty: 0 }
            ),
        }));

        removeRow(tempId);

        // open sections for easy edit
        setOpenGeneral(true);
        setOpenStock(true);
    };

    // ========================
    // Save all
    // ========================
    const saveAll = async () => {
        if (cart.length === 0) return toast.error("List is empty");

        setSaving(true);
        try {
            const payload = buildBulkPayload(cart);

            await itemsAPI.createBulk(payload);

            toast.success(`Saved ${payload.items.length} items successfully`);
            setCart([]);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Bulk save failed");
        } finally {
            setSaving(false);
        }
    };


    const totalLines = cart.length;
    const totalQty = cart.reduce((a, x) => a + (x.quantity || 0), 0);

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Bulk Add Items</h1>

                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setCart([])} disabled={saving || cart.length === 0}>
                        Clear List
                    </Button>
                    <Button onClick={saveAll} disabled={saving || cart.length === 0}>
                        {saving ? "Saving..." : `Save All (${totalLines})`}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
                {/* LEFT SIDE */}
                <div className="col-span-12 lg:col-span-5 space-y-4">
                    {/* Product Image */}
                    <AccordionSection
                        title="Product Image"
                        subtitle="Paste image URL to preview"
                        badge={imageBadge}
                        isOpen={openImage}
                        onToggle={() => setOpenImage((v) => !v)}
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Image URL</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2"
                                value={draft.imageUrl}
                                onChange={(e) => updateDraft("imageUrl", e.target.value)}
                                placeholder="https://..."
                            />

                            <div className="border rounded-lg h-64 flex items-center justify-center overflow-hidden bg-gray-50">
                                {draft.imageUrl ? (
                                    <img
                                        src={draft.imageUrl}
                                        alt="preview"
                                        className="max-h-full max-w-full object-contain"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                ) : (
                                    <span className="text-gray-400 text-sm">Image preview will appear here</span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => toast("You can replace by pasting a new URL")}
                                >
                                    Replace
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => updateDraft("imageUrl", "")}
                                    disabled={!draft.imageUrl}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    </AccordionSection>

                    {/* General Information */}
                    <AccordionSection
                        title="General Information"
                        badge={generalBadge}
                        isOpen={openGeneral}
                        onToggle={() => setOpenGeneral((v) => !v)}
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Name *</label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={draft.name}
                                    onChange={(e) => updateDraft("name", e.target.value)}
                                    placeholder="Ex: Sugar 1Kg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2 col-span-1">
                                    <label className="text-sm font-medium">Barcode *</label>
                                    <input
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={draft.barcode}
                                        onChange={(e) => updateDraft("barcode", e.target.value)}
                                        placeholder="123456"
                                    />
                                    <div className="text-xs text-gray-400">
                                        Barcode generator will be added later.
                                    </div>
                                </div>

                                <div className="space-y-2 col-span-1">
                                    <label className="text-sm font-medium">Category</label>
                                    <input
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={draft.category}
                                        onChange={(e) => updateDraft("category", e.target.value)}
                                        placeholder="Type now (later dropdown)"
                                    />
                                </div>

                                <div className="space-y-2 col-span-1">
                                    <label className="text-sm font-medium">Sub Category</label>
                                    <input
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={draft.subCategory}
                                        onChange={(e) => updateDraft("subCategory", e.target.value)}
                                        placeholder="Type now (later dropdown)"
                                    />
                                </div>

                                <div className="space-y-2 col-span-1">
                                    <label className="text-sm font-medium">Cost Price *</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={draft.costPrice}
                                        onChange={(e) => updateDraft("costPrice", e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2 col-span-1">
                                    <label className="text-sm font-medium">Selling Price *</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={draft.sellingPrice}
                                        onChange={(e) => updateDraft("sellingPrice", e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2 col-span-1">
                                    <label className="text-sm font-medium">Reorder Level</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={draft.reorderLevel}
                                        onChange={(e) => updateDraft("reorderLevel", e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
                                    value={draft.description}
                                    onChange={(e) => updateDraft("description", e.target.value)}
                                    placeholder="Optional description..."
                                />
                            </div>
                        </div>
                    </AccordionSection>

                    {/* Manage Stock */}
                    <AccordionSection
                        title="Manage Stock"
                        subtitle="Select branches and set initial quantities."
                        badge={stockBadge}
                        isOpen={openStock}
                        onToggle={() => setOpenStock((v) => !v)}
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-gray-600">
                                    Selected: <span className="font-medium">{selectedCount}</span> / {branches.length}
                                </div>
                                <div className="flex gap-3">
                                    <button className="text-blue-600 hover:underline" onClick={selectAll} type="button">
                                        Select All
                                    </button>
                                    <button className="text-gray-500 hover:underline" onClick={clearAll} type="button">
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left">
                                            <th className="px-3 py-2">Branch</th>
                                            <th className="px-3 py-2 text-right">Quantity</th>
                                            <th className="px-3 py-2 text-right">Select</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {draft.branchStocks.map((bs) => (
                                            <tr key={bs.branchId} className="border-t">
                                                <td className="px-3 py-2">
                                                    {branchMap.get(bs.branchId)?.name || `#${bs.branchId}`}
                                                </td>

                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        className="w-28 border rounded-lg px-2 py-1 text-right"
                                                        value={bs.qty}
                                                        onChange={(e) => setQty(bs.branchId, e.target.value)}
                                                        disabled={!bs.selected}
                                                    />
                                                </td>

                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="checkbox"
                                                        checked={bs.selected}
                                                        onChange={() => toggleSelect(bs.branchId)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pt-2">
                                <Button onClick={addToList} className="w-full">
                                    + Add to List
                                </Button>
                            </div>

                            <div className="text-xs text-gray-500">
                                Tip: If same barcode + same branch already exists in list, qty will auto add.
                            </div>
                        </div>
                    </AccordionSection>
                </div>

                {/* RIGHT SIDE: Cart */}
                <div className="col-span-12 lg:col-span-7">
                    <Card className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Items List</h2>
                                <p className="text-sm text-gray-500">
                                    Lines: {totalLines} • Total Qty: {totalQty}
                                </p>
                            </div>
                        </div>

                        {cart.length === 0 ? (
                            <div className="border rounded-lg p-8 text-center text-gray-500">
                                No items added yet. Add items from the form.
                            </div>
                        ) : (
                            <div className="overflow-auto border rounded-lg">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left">
                                            <th className="px-3 py-2">Branch</th>
                                            <th className="px-3 py-2">Item</th>
                                            <th className="px-3 py-2">Barcode</th>
                                            <th className="px-3 py-2 text-right">Qty</th>
                                            <th className="px-3 py-2 text-right">Cost</th>
                                            <th className="px-3 py-2 text-right">Sell</th>
                                            <th className="px-3 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {cart.map((row) => (
                                            <tr key={row.tempId} className="border-t">
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {branchMap.get(row.branchId)?.name || `#${row.branchId}`}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{row.barcode}</td>
                                                <td className="px-3 py-2 text-right">{row.quantity}</td>
                                                <td className="px-3 py-2 text-right">{row.costPrice}</td>
                                                <td className="px-3 py-2 text-right">{row.sellingPrice}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="px-2 py-1 rounded border hover:bg-gray-50"
                                                            onClick={() => editRow(row.tempId)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="px-2 py-1 rounded border hover:bg-red-50"
                                                            onClick={() => removeRow(row.tempId)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
