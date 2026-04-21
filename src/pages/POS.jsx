import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Search, ChefHat, Lock } from "lucide-react";
import { useKeyboard } from "../hooks/useKeyboard";
import { itemsAPI } from "../api/items.api";
import { ordersAPI } from "../api/orders.api";
import { shiftsAPI } from "../api/shifts.api";
import CustomerSelect from "../components/pos/CustomerSelect";
import Cart from "../components/pos/Cart";
import CheckoutOverlay from "../components/pos/CheckoutOverlay";
import BatchSelectModal from "../components/pos/BatchSelectModal";
import { formatCurrency } from "../utils/formatters";
import { ORDER_TYPES, DISCOUNT_TYPES } from "../utils/constants";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ReceiptPrinter from "../components/pos/ReceiptPrinter";

const POS = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const printRef = useRef();

  const searchInputRef = useRef(null);

  const [myShift, setMyShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);

  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);

  const [customer, setCustomer] = useState(null);
  const [orderType, setOrderType] = useState(ORDER_TYPES.CASH);
  const [billDiscount, setBillDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const isAdminUser = user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    if (searchInputRef.current && !loadingShift && myShift) {
      searchInputRef.current.focus();
    }
  }, [loadingShift, myShift]);

  useEffect(() => {
    const loadMyShift = async () => {
      try {
        setLoadingShift(true);
        let res;

        if (isAdminUser) {
          if (!selectedBranchId || selectedBranchId === 0) {
            setMyShift(null);
            setLoadingShift(false);
            return;
          }
          res = await shiftsAPI.getAdminCurrent(selectedBranchId);
        } else {
          res = await shiftsAPI.getMine();
        }

        if (res.data && res.data.status === "OPEN") {
          setMyShift(res.data);
          fetchProducts(res.data.branchId);
        } else {
          setMyShift(null);
        }
      } catch (error) {
        setMyShift(null);
      } finally {
        setLoadingShift(false);
      }
    };

    loadMyShift();
  }, [isAdminUser, selectedBranchId]);

  const fetchProducts = async (branchId) => {
    try {
      const response = await itemsAPI.searchForPos("", branchId);
      let items = Array.isArray(response.data) ? response.data : [];
      items = items.filter(item => {
        if (item.batches && item.batches.length > 0) return true;
        if (item.availableQty !== undefined && item.availableQty !== null) return true;
        return false;
      });

      setAllItems(items);
      setFilteredItems(items);

      const uniqueCats = ["All", ...new Set(items.map(i => i.categoryName).filter(Boolean))];
      setCategories(uniqueCats);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    let result = allItems;
    if (activeCategory !== "All") {
      result = result.filter(item => item.categoryName === activeCategory);
    }
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.barcode?.toLowerCase().includes(lowerQuery)
      );
    }
    setFilteredItems(result);
  }, [activeCategory, searchQuery, allItems]);

  const addToCart = (item) => {
    if (!myShift) {
      toast.error("Please open a shift first!");
      return;
    }

    if (item.batches && item.batches.length > 1) {
      setSelectedBatchItem(item);
      setShowBatchModal(true);
      return;
    }

    let targetBatch = item.batches && item.batches.length > 0 ? item.batches[0] : null;
    processAddToCart(item, targetBatch ? targetBatch.price : item.sellingPrice, 1, targetBatch);
  };

  const handleBatchSelect = (batch) => {
    processAddToCart(selectedBatchItem, batch.price, 1, batch);
    setShowBatchModal(false);
    setSelectedBatchItem(null);
  };

  const processAddToCart = (item, price, qty, batchData = null) => {
    const batchId = batchData ? batchData.batchId : (item.batches?.[0]?.batchId || null);
    const stockQty = batchData ? batchData.qty : (item.availableQty || 0);

    if (stockQty < qty) {
      toast.error(`Insufficient stock! Available: ${stockQty}`);
      if (searchInputRef.current) searchInputRef.current.focus();
      return;
    }

    const existingIndex = cartItems.findIndex(
      (ci) => String(ci.itemId) === String(item.id) && String(ci.batchId) === String(batchId)
    );

    if (existingIndex !== -1) {
      const newItems = [...cartItems];
      const nextQty = newItems[existingIndex].qty + qty;
      if (nextQty > stockQty) {
        toast.error(`Low stock. Available: ${stockQty}`);
        if (searchInputRef.current) searchInputRef.current.focus();
        return;
      }
      newItems[existingIndex] = { ...newItems[existingIndex], qty: nextQty };
      setCartItems(newItems);
    } else {
      const isWeight = item.weightItem || false;
      const defUnit = item.defaultUnit || "PCS";
      const uPrice = Number(price);

      const gramPrice = (isWeight && defUnit === "KG") ? (uPrice / 1000) : uPrice;

      setCartItems((prev) => [
        ...prev,
        {
          itemId: item.id,
          batchId: batchId,
          name: item.name,
          barcode: item.barcode,
          unitPrice: uPrice,
          perGramPrice: gramPrice,
          qty: isWeight ? 0.1 : 1,
          qtyUnit: defUnit,
          weightItem: isWeight,
          defaultUnit: defUnit,
          discountType: DISCOUNT_TYPES.NONE,
          discountValue: 0,
          stockQty,
          image: item.imageUrl
        },
      ]);
    }

    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (!searchQuery.trim() || filteredItems.length === 0) {
        toast.error("Item not found!");
        setSearchQuery("");
        return;
      }

      const exactMatch = filteredItems.find(
        item => item.barcode?.toLowerCase() === searchQuery.toLowerCase()
      );

      const itemToAdd = exactMatch || filteredItems[0];

      if (itemToAdd) {
        const stockQty = Number(itemToAdd.availableQty ?? 0);
        if (stockQty <= 0) {
          toast.error("Item is Out of Stock!");
          setSearchQuery("");
          return;
        }
        addToCart(itemToAdd);
      }
    }
  };

  // 🔴 වෙනස් කරපු තැන: preventFocus parameter එක එකතු කළා
  const updateQuantity = (index, newQty, preventFocus = false) => {
    const item = cartItems[index];

    let finalQty = newQty;
    if (item.weightItem && item.qtyUnit === 'KG') {
      finalQty = Math.round(newQty * 1000) / 1000;
    } else if (item.weightItem && item.qtyUnit === 'G') {
      finalQty = Math.round(newQty);
    } else {
      finalQty = Math.round(newQty);
    }

    if (finalQty < 0) return;

    if (item.stockQty > 0) {
      let compareQty = finalQty;
      if (item.weightItem && item.qtyUnit === 'G' && item.defaultUnit === 'KG') {
        compareQty = finalQty / 1000;
      }
      if (compareQty > item.stockQty) {
        toast.error(`Low stock. Available: ${item.stockQty}`);
        return;
      }
    }

    const newItems = [...cartItems];
    newItems[index].qty = finalQty;
    setCartItems(newItems);

    if (!preventFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const updateQtyUnit = (index, unit) => {
    const newItems = [...cartItems];
    const item = newItems[index];

    if (item.qtyUnit === 'KG' && unit === 'G') {
      item.qty = item.qty * 1000;
    } else if (item.qtyUnit === 'G' && unit === 'KG') {
      item.qty = item.qty / 1000;
    }

    item.qtyUnit = unit;
    setCartItems(newItems);
  };

  const removeItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleInlineDiscount = (index, type, value) => {
    const newItems = [...cartItems];
    newItems[index].discountType = type;
    newItems[index].discountValue = parseFloat(value) || 0;
    setCartItems(newItems);
  };

  const calculateItemBaseTotal = (item) => {
    if (!item.qty || item.qty <= 0) return 0;

    if (item.weightItem && item.qtyUnit === 'G') {
      return item.qty * item.perGramPrice;
    } else {
      return item.qty * item.unitPrice;
    }
  };

  const calculateTotal = () => {
    let total = 0;
    cartItems.forEach((item) => {
      let itemTotal = calculateItemBaseTotal(item);

      if (item.discountType === DISCOUNT_TYPES.FIXED) {
        itemTotal -= item.discountValue;
      } else if (item.discountType === DISCOUNT_TYPES.PERCENT) {
        itemTotal -= (itemTotal * item.discountValue) / 100;
      }
      total += Math.max(0, itemTotal);
    });
    return Math.max(0, total - billDiscount);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return toast.error("Cart is empty");
    if (!myShift) return toast.error("No active shift. Cannot checkout.");

    setPaidAmount(calculateTotal());
    setShowPayment(true);
  };

  const handlePlaceOrder = async () => {
    const total = calculateTotal();
    const subTotal = cartItems.reduce((acc, item) => acc + calculateItemBaseTotal(item), 0);

    if (orderType === ORDER_TYPES.CASH && paidAmount < total) return toast.error("Insufficient amount");
    if (orderType === ORDER_TYPES.CREDIT && !customer) return toast.error("Select customer for credit");

    setLoading(true);
    try {
      const orderData = {
        branchId: myShift.branchId,
        orderType,
        customerId: customer ? customer.id : null,
        billDiscount,
        paidAmount: orderType === ORDER_TYPES.CASH ? paidAmount : 0,
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          batchId: item.batchId,
          qty: item.qty,
          qtyUnit: item.weightItem ? (item.qtyUnit || item.defaultUnit) : undefined,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
        note: "",
      };

      const response = await ordersAPI.create(orderData);
      toast.success(`Order ${response.data.invoiceNo} success!`);

      if (printRef.current) {
        const storeName = user?.shopName || "POS SYSTEM";

        const printData = {
          invoiceNo: response.data.invoiceNo,
          subTotal: subTotal,
          billDiscount: billDiscount,
          netTotal: total,
          paidAmount: orderType === ORDER_TYPES.CASH ? paidAmount : total,
          orderType: orderType
        };

        printRef.current.printOrder(printData, cartItems, storeName, myShift, customer);
      }

      await fetchProducts(myShift.branchId);

      setCartItems([]);
      setCustomer(null);
      setOrderType(ORDER_TYPES.CASH);
      setBillDiscount(0);
      setShowPayment(false);

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  useKeyboard("F4", () => setShowCustomerSelect(true));
  useKeyboard("F9", handleCheckout);
  useKeyboard("F1", () => showPayment && setOrderType(ORDER_TYPES.CASH));
  useKeyboard("F2", () => showPayment && setOrderType(ORDER_TYPES.CREDIT));

  useKeyboard("Enter", () => {
    if (showPayment && !loading) handlePlaceOrder();
  });

  if (loadingShift) {
    return <div className="h-full flex items-center justify-center"><LoadingSpinner text="Checking your shift..." /></div>;
  }

  return (
    <div className="flex h-full gap-1.5 lg:gap-4 bg-slate-100 p-1.5 lg:p-4 font-sans text-slate-800 flex-col overflow-y-auto lg:overflow-hidden">
      <div className="flex flex-col lg:flex-row flex-1 gap-1.5 lg:gap-4 lg:overflow-hidden lg:h-full">
        <div className="flex flex-col h-[55vh] flex-shrink-0 lg:h-full lg:flex-1 bg-slate-50 rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">

          <header className="px-2 py-2 lg:px-6 lg:py-5 bg-white border-b border-slate-100 flex flex-row items-center justify-between gap-2 flex-shrink-0">
            <div className="hidden sm:block lg:block">
              <h1 className="text-sm lg:text-xl font-bold text-slate-800">
                New Sale {myShift ? `(Branch: ${myShift.branchName || myShift.branchId})` : ''}
              </h1>
            </div>
            <div className="flex items-center flex-1 lg:flex-none lg:w-1/3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search barcode or name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  disabled={!myShift}
                  className="w-full pl-8 lg:pl-10 pr-3 lg:pr-4 py-1.5 lg:py-2.5 rounded-lg lg:rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs lg:text-sm disabled:opacity-50"
                />
              </div>
            </div>
          </header>

          <div className="px-2 py-1.5 lg:px-6 lg:py-4 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex gap-1.5 lg:gap-2 overflow-x-auto scrollbar-hide pb-0.5 lg:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  disabled={!myShift}
                  className={`px-3 lg:px-5 py-1 lg:py-2 rounded-md lg:rounded-lg whitespace-nowrap text-[10px] lg:text-sm font-semibold transition-all ${activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm lg:shadow-md shadow-blue-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-50'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 lg:p-6 bg-slate-50">
            {!myShift ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Lock className="mb-2 lg:mb-4 opacity-30 w-8 h-8 lg:w-12 lg:h-12" />
                <p className="text-sm lg:text-lg font-medium text-center">Open a shift to view items</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Search className="mb-2 lg:mb-4 opacity-30 w-8 h-8 lg:w-12 lg:h-12" />
                <p className="text-sm lg:text-lg font-medium text-center">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-4 gap-1.5 lg:gap-4">
                {filteredItems.map((item) => {
                  const stockQty = Number(item.availableQty ?? 0);
                  const isOutOfStock = stockQty <= 0;
                  const unit = item.defaultUnit ? ` ${item.defaultUnit}` : '';

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && addToCart(item)}
                      className={`group bg-white rounded-lg lg:rounded-xl p-2 lg:p-6 border border-slate-200 transition-all relative flex flex-col items-center text-center 
                            ${!isOutOfStock
                          ? 'hover:shadow-md cursor-pointer active:scale-95'
                          : 'cursor-not-allowed opacity-90'
                        } 
                        `}
                    >
                      <div className="absolute top-1 right-1 lg:top-3 lg:right-3 flex flex-col items-end gap-1">
                        {isOutOfStock ? (
                          <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-red-50 text-red-500 text-[8px] lg:text-[10px] font-bold rounded border border-red-100 uppercase">Out</span>
                        ) : (
                          <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-emerald-50 text-emerald-600 text-[8px] lg:text-[10px] font-bold rounded border border-emerald-100 whitespace-nowrap">{stockQty}{unit}</span>
                        )}
                      </div>

                      <div className="w-8 h-8 lg:w-20 lg:h-20 rounded-full bg-slate-50 mb-1 lg:mb-6 flex items-center justify-center mt-3 lg:mt-2">
                        <ChefHat className={`w-4 h-4 lg:w-8 lg:h-8 ${isOutOfStock ? "text-slate-200" : "text-slate-300"}`} />
                      </div>
                      <h3 className="font-semibold text-slate-800 text-[9px] lg:text-sm mb-0.5 lg:mb-3 line-clamp-2 min-h-[1.25rem] lg:min-h-[2.5rem] leading-tight">{item.name}</h3>
                      <p className="text-blue-600 font-bold text-[10px] lg:text-sm">{formatCurrency(item.sellingPrice)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className={`w-full lg:w-[380px] flex flex-col flex-shrink-0 h-max lg:h-full bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm lg:overflow-hidden transition-opacity duration-300 ${!myShift ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <Cart
            items={cartItems}
            customer={customer}
            setCustomer={setCustomer}
            onUpdateQty={updateQuantity}
            onRemoveItem={removeItem}
            onInlineDiscount={handleInlineDiscount}
            onUpdateQtyUnit={updateQtyUnit}
            total={calculateTotal()}
            subTotal={cartItems.reduce((acc, item) => acc + calculateItemBaseTotal(item), 0)}
            billDiscount={billDiscount}
            setBillDiscount={setBillDiscount}
            onCheckout={handleCheckout}
            loading={loading}
            onAddCustomer={() => setShowCustomerSelect(true)}
            focusSearch={focusSearch} /* 🔴 අලුත් Prop එක යවනවා */
          />
        </div>
      </div>

      <CustomerSelect isOpen={showCustomerSelect} onClose={() => { setShowCustomerSelect(false); if (searchInputRef.current) searchInputRef.current.focus(); }} onSelectCustomer={setCustomer} />
      <CheckoutOverlay isOpen={showPayment} onClose={() => { setShowPayment(false); if (searchInputRef.current) searchInputRef.current.focus(); }} total={calculateTotal()} orderType={orderType} setOrderType={setOrderType} paidAmount={paidAmount} setPaidAmount={setPaidAmount} onPlaceOrder={handlePlaceOrder} loading={loading} />
      <BatchSelectModal isOpen={showBatchModal} onClose={() => { setShowBatchModal(false); if (searchInputRef.current) searchInputRef.current.focus(); }} onSelectBatch={handleBatchSelect} item={selectedBatchItem} />
      <ReceiptPrinter ref={printRef} />
    </div>
  );
};

export default POS;