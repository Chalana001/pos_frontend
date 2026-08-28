import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, Plus, Trash2, Printer, Minus, RefreshCw } from "lucide-react";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import BarcodeLabel from "../components/barcode/BarcodeLabel";

import { itemsAPI } from "../api/items.api";
import { barcodeLabelSettingsAPI } from "../api/barcodeLabelSettings.api";
import { printerAgentAPI } from "../api/printerAgent.api";

import { useSearchOnType } from "../hooks/useSearchOnType";
import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_BARCODE_LABEL_SETTINGS, normalizeBarcodeLabelSettings } from "../utils/barcodeLabelSettings";
import { buildBarcodePrintHtml } from "../utils/buildBarcodePrintHtml";
import { BRAND_NAME_UPPER } from "../utils/branding";

const BarcodePrintPage = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const shopName = user?.shopName || BRAND_NAME_UPPER;
  const printContainerRef = useRef(null);

  const [labelSettings, setLabelSettings] = useState(DEFAULT_BARCODE_LABEL_SETTINGS);
  const [printList, setPrintList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [directPrinting, setDirectPrinting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useSearchOnType(setSearchQuery);
  const [searchResults, setSearchResults] = useState([]);

  // 🔴 අලුතින් එකතු කරපු state එක: Recent Items කීයක් ගන්නවද කියන එක
  const [recentLimit, setRecentLimit] = useState(20);

  // Branch-wise barcode label design (falls back to defaults for "All Branches" / offline)
  useEffect(() => {
    const branchId = Number(selectedBranchId);
    if (!branchId) {
      setLabelSettings(DEFAULT_BARCODE_LABEL_SETTINGS);
      return;
    }

    let cancelled = false;
    barcodeLabelSettingsAPI
      .getByBranch(branchId)
      .then((res) => {
        if (!cancelled) setLabelSettings(normalizeBarcodeLabelSettings(res.data));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLabelSettings(DEFAULT_BARCODE_LABEL_SETTINGS);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBranchId]);

  // 1. Live API Call: අලුත්ම Items ටික ගැනීම (Limit එකත් එක්ක)
  const loadRecentItems = async (limitToFetch) => {
    setLoading(true);
    try {
      // 🔴 මෙතන limit එක backend එකට යවනවා
      const res = await itemsAPI.getRecent(limitToFetch, Number(selectedBranchId) || undefined);
      const data = res.data || [];
      
      const initialCart = data.map(item => ({ ...item, printQty: 1 }));
      setPrintList(initialCart);
      
      toast.success(`Loaded last ${limitToFetch} items`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load recent items");
    } finally {
      setLoading(false);
    }
  };

  // Page එක ලෝඩ් වෙද්දී default limit එකට (20) items ගන්නවා
  useEffect(() => {
    loadRecentItems(recentLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadRecent = () => {
    if (recentLimit < 1) {
      toast.error("Limit must be at least 1");
      return;
    }
    loadRecentItems(recentLimit);
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length > 2) {
      try {
        const res = await itemsAPI.searchForPrint(query, Number(selectedBranchId) || undefined);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error("Search error:", err);
      }
    } else {
      setSearchResults([]);
    }
  };

  // 3. Cart එකට Add කිරීම
  const handleAddItem = (item) => {
    const exists = printList.find((i) => i.id === item.id);
    if (exists) {
      setPrintList(printList.map(i => i.id === item.id ? { ...i, printQty: i.printQty + 1 } : i));
      toast.success("Increased quantity");
    } else {
      setPrintList([{ ...item, printQty: 1 }, ...printList]);
      toast.success("Added to print list");
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // 4. Qty වෙනස් කිරීම සහ Remove කිරීම
  const updateQty = (id, amount) => {
    setPrintList(printList.map(i => {
      if (i.id === id) {
        const newQty = i.printQty + amount;
        return { ...i, printQty: newQty > 0 ? newQty : 1 };
      }
      return i;
    }));
  };

  const removeItem = (id) => {
    setPrintList(printList.filter(i => i.id !== id));
  };

  // Browser printing for barcode labels.
  // We DON'T use window.print() on the live page: that relies on a
  // `visibility:hidden` hack over the whole app, which leaves the app's full
  // layout occupying space (blank pages) and breaks on small label paper sizes
  // because the absolutely-positioned labels can't paginate. Instead we print a
  // clean standalone document (only the labels) inside a hidden iframe, with an
  // explicit `@page { size: labelW×labelH }`, so it renders correctly whatever
  // paper size the browser dialog is set to.
  const printLabelsViaBrowser = () =>
    new Promise((resolve) => {
      const html = buildBarcodePrintHtml(printContainerRef.current?.outerHTML || "", labelSettings);

      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      Object.assign(iframe.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
      });
      document.body.appendChild(iframe);

      const cleanup = () => {
        // Keep the iframe around briefly so the print dialog can read from it.
        window.setTimeout(() => {
          iframe.remove();
          resolve();
        }, 1000);
      };

      iframe.onload = () => {
        // Let the barcode <img> data URLs decode before printing.
        window.setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (err) {
            console.error(err);
          } finally {
            cleanup();
          }
        }, 200);
      };

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    });

  const handlePrint = async () => {
    if (printList.length === 0) {
      toast.error("Print list is empty");
      return;
    }

    if (labelSettings.directPrintEnabled && labelSettings.printerName) {
      try {
        setDirectPrinting(true);
        const html = buildBarcodePrintHtml(printContainerRef.current?.outerHTML || "", labelSettings);
        await printerAgentAPI.printBarcodes({
          printerName: labelSettings.printerName,
          html,
          paperWidth: `${labelSettings.labelWidthMm}mm`,
          copies: labelSettings.printerCopies,
        });
        toast.success("Sent to printer");
        return;
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Direct print failed — falling back to browser print");
      } finally {
        setDirectPrinting(false);
      }
    }

    await printLabelsViaBrowser();
  };

  return (
    <div className="page-enter space-y-6">
      
      {/* --- Header Section --- */}
      <div className="page-section-enter flex items-center justify-between gap-4 print:hidden" style={{ animationDelay: "80ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Print Barcodes</h1>
        <Button onClick={handlePrint} disabled={printList.length === 0 || loading || directPrinting}>
          <Printer size={18} className="mr-2" />
          {directPrinting ? "Sending to Printer..." : "Print All Barcodes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 print:hidden md:grid-cols-3">
        
        {/* --- Left Column: Search & Load Recent --- */}
        <div className="md:col-span-1 space-y-6">
          
          {/* 🔴 අලුත් Card එක: Load Recent Items */}
          <Card className="sales-panel-enter sales-panel-hover" style={{ animationDelay: "130ms" }}>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Load Recent Items</h3>
            <div className="flex gap-2">
              <input aria-label="Enter limit (e.g. 50)"
                type="number"
                min="1"
                max="500"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={recentLimit}
                onChange={(e) => setRecentLimit(Number(e.target.value))}
                placeholder="Enter limit (e.g. 50)"
              />
              <Button 
                onClick={handleLoadRecent} 
                disabled={loading}
                variant="secondary"
                className="whitespace-nowrap"
              >
                <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Load
              </Button>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              This will clear the current queue and load the latest items.
            </p>
          </Card>

          {/* Search Card */}
          <Card className="sales-panel-enter sales-panel-hover" style={{ animationDelay: "180ms" }}>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Add Items to Print</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input aria-label="Search by name or barcode..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name or barcode..."
                ref={searchRef}
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100 custom-scrollbar">
                {searchResults.map(item => (
                  <div key={item.id} className="sales-cart-item flex items-center justify-between p-3 transition-colors hover:bg-slate-50">
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.barcode}</p>
                    </div>
                    <button 
                      onClick={() => handleAddItem(item)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md ml-2 flex-shrink-0"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* --- Right Column: Print Cart --- */}
        <div className="md:col-span-2">
          <Card className="sales-panel-enter" style={{ animationDelay: "230ms" }}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-medium text-slate-600">Print Queue</h3>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                {printList.length} Items
              </span>
            </div>

            {loading ? (
              <div className="py-12">
                <LoadingSpinner size="lg" text="Loading items..." />
              </div>
            ) : printList.length === 0 ? (
              <div className="py-12 text-center text-slate-600">
                <Printer size={48} className="mx-auto mb-3 opacity-20" />
                <p>Queue is empty. Search or load items to print.</p>
              </div>
            ) : (
              <div className="custom-scrollbar max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {printList.map((item) => (
                  <div key={item.id} style={{ animationDelay: `${150 + printList.indexOf(item) * 35}ms` }} className="sales-cart-item sales-panel-hover flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 transition-colors hover:border-blue-300 sm:flex-nowrap">
                    
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 truncate">{item.name}</h4>
                      <div className="flex gap-4 mt-1 text-xs text-slate-500">
                        <span>Barcode: <span className="font-mono font-medium text-slate-700">{item.barcode}</span></span>
                        <span>Price: Rs. {item.sellingPrice?.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-300 rounded-md overflow-hidden">
                        <button onClick={() => updateQty(item.id, -1)} className="inline-flex h-11 w-11 items-center justify-center bg-slate-50 hover:bg-slate-200 text-slate-600 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-slate-700">{item.printQty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="inline-flex h-11 w-11 items-center justify-center bg-slate-50 hover:bg-slate-200 text-slate-600 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      {/* Delete Button */}
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>


      <div ref={printContainerRef} className="hidden print:flex print-container">
        {printList.map(item =>
          Array.from({ length: item.printQty }).map((_, idx) => (
            <BarcodeLabel key={`${item.id}-${idx}`} item={item} settings={labelSettings} shopName={shopName} />
          ))
        )}
      </div>

    </div>
  );
};

export default BarcodePrintPage;
