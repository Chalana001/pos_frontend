import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Barcode from "react-barcode";
import { Search, Plus, Trash2, Printer, Minus, RefreshCw } from "lucide-react";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";

import { itemsAPI } from "../api/items.api"; 

const BarcodePrintPage = () => {
  const [printList, setPrintList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // 🔴 අලුතින් එකතු කරපු state එක: Recent Items කීයක් ගන්නවද කියන එක
  const [recentLimit, setRecentLimit] = useState(20);

  // 1. Live API Call: අලුත්ම Items ටික ගැනීම (Limit එකත් එක්ක)
  const loadRecentItems = async (limitToFetch) => {
    setLoading(true);
    try {
      // 🔴 මෙතන limit එක backend එකට යවනවා
      const res = await itemsAPI.getRecent(limitToFetch);
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
        const res = await itemsAPI.searchForPrint(query); 
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

  const handlePrint = () => {
    if (printList.length === 0) {
      toast.error("Print list is empty");
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* --- Header Section --- */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <h1 className="text-3xl font-bold text-slate-800">Print Barcodes</h1>
        <Button onClick={handlePrint} disabled={printList.length === 0 || loading}>
          <Printer size={18} className="mr-2" />
          Print All Barcodes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        
        {/* --- Left Column: Search & Load Recent --- */}
        <div className="md:col-span-1 space-y-6">
          
          {/* 🔴 අලුත් Card එක: Load Recent Items */}
          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Load Recent Items</h3>
            <div className="flex gap-2">
              <input
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
            <p className="text-xs text-slate-400 mt-2">
              This will clear the current queue and load the latest items.
            </p>
          </Card>

          {/* Search Card */}
          <Card>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Add Items to Print</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name or barcode..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden shadow-sm divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {searchResults.map(item => (
                  <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
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
          <Card>
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
              <div className="py-12 text-center text-slate-400">
                <Printer size={48} className="mx-auto mb-3 opacity-20" />
                <p>Queue is empty. Search or load items to print.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {printList.map((item) => (
                  <div key={item.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-3 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                    
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
                        <button onClick={() => updateQty(item.id, -1)} className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-600 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-slate-700">{item.printQty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-600 transition-colors">
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


      <div className="hidden print:flex print-container">
        {printList.map(item => 
          Array.from({ length: item.printQty }).map((_, idx) => (
            <div key={`${item.id}-${idx}`} className="barcode-sticker">
              <div className="sticker-shop">Thoga POS</div>
              <div className="sticker-name">{item.name.substring(0, 22)}</div>
              <Barcode 
                value={item.barcode} 
                format="CODE128" 
                width={1.5} 
                height={35} 
                fontSize={12}
                margin={2}
                displayValue={true}
              />
              <div className="sticker-price">Rs. {item.sellingPrice?.toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
      
    </div>
  );
};

export default BarcodePrintPage;