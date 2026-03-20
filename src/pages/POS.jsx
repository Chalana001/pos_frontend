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
  const { selectedBranchId } = useBranch(); // ✅ Admin තෝරපු Branch එක මෙතනින් ගන්නවා
  const printRef = useRef();
  
  const [myShift, setMyShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  
  // Modals
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);

  // Transaction Data
  const [customer, setCustomer] = useState(null);
  const [orderType, setOrderType] = useState(ORDER_TYPES.CASH);
  const [billDiscount, setBillDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  // Admin ද නැද්ද කියලා මෙතනින් චෙක් කරනවා
  const isAdminUser = user?.role === "ADMIN" || user?.role === "MANAGER";

  // 🔴 1. SHIFT LOADING LOGIC (Admin/Cashier Separation)
  useEffect(() => {
    const loadMyShift = async () => {
      try {
        setLoadingShift(true);
        let res;

        if (isAdminUser) {
          // --- ADMIN නම් ---
          if (!selectedBranchId || selectedBranchId === 0) {
            setMyShift(null);
            setLoadingShift(false);
            return;
          }
          // අලුත්ම Endpoint එකට Branch ID එකත් එක්ක කෝල් කරනවා
          res = await shiftsAPI.getAdminCurrent(selectedBranchId);
        } else {
          // --- CASHIER නම් ---
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
      const response = await itemsAPI.search("", branchId);
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
        return;
      }
      newItems[existingIndex] = { ...newItems[existingIndex], qty: nextQty };
      setCartItems(newItems);
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          itemId: item.id,
          batchId: batchId, 
          name: item.name,
          barcode: item.barcode,
          unitPrice: Number(price), 
          qty: 1,
          discountType: DISCOUNT_TYPES.NONE,
          discountValue: 0,
          stockQty,
          image: item.imageUrl
        },
      ]);
    }
  };

  const updateQuantity = (index, newQty) => {
    if (newQty < 1) return;
    const item = cartItems[index];
    if (item.stockQty > 0 && newQty > item.stockQty) {
      toast.error(`Low stock. Available: ${item.stockQty}`);
      return;
    }
    const newItems = [...cartItems];
    newItems[index].qty = newQty;
    setCartItems(newItems);
  };

  const removeItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleInlineDiscount = (index, type, value) => {
    const newItems = [...cartItems];
    newItems[index].discountType = type;
    newItems[index].discountValue = parseFloat(value) || 0;
    setCartItems(newItems);
  };

  const calculateTotal = () => {
    let total = 0;
    cartItems.forEach((item) => {
      let itemTotal = item.unitPrice * item.qty;
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
    // Bill එකේ පෙන්නන්න Subtotal එක ගණනය කරනවා
    const subTotal = cartItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);

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
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
        note: "",
      };
      
      const response = await ordersAPI.create(orderData);
      toast.success(`Order ${response.data.invoiceNo} success!`);

      if (printRef.current) {
         const host = window.location.hostname;
         const storeName = host.includes('.') ? host.split('.')[0].toUpperCase() : "POS SYSTEM";

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
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Shortcuts
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
      
      {/* 🔴 Warning Message */}
      {!myShift && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 lg:px-4 lg:py-3 rounded-lg lg:rounded-xl flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 lg:gap-3">
                <Lock className="text-orange-600 w-4 h-4 lg:w-5 lg:h-5" />
                <div>
                    <span className="font-bold text-xs lg:text-sm block">Shift Closed</span>
                    <span className="text-[10px] lg:text-xs opacity-90 leading-tight">
                        {isAdminUser 
                          ? `You don't have an open shift for the selected branch. Please open a shift for yourself first.`
                          : `You don't have an active shift. Please go to Shift Management and open a shift to start selling.`}
                    </span>
                </div>
            </div>
        </div>
      )}

      {/* Main Wrapper */}
      <div className="flex flex-col lg:flex-row flex-1 gap-1.5 lg:gap-4 lg:overflow-hidden lg:h-full">
        
        {/* 1. CENTER AREA (Products) */}
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
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                            <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-emerald-50 text-emerald-600 text-[8px] lg:text-[10px] font-bold rounded border border-emerald-100 whitespace-nowrap">{stockQty}</span>
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
                total={calculateTotal()}
                subTotal={cartItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0)}
                billDiscount={billDiscount}
                setBillDiscount={setBillDiscount}
                onCheckout={handleCheckout}
                loading={loading}
                onAddCustomer={() => setShowCustomerSelect(true)}
            />
        </div>
      </div>

      {/* Modals */}
      <CustomerSelect isOpen={showCustomerSelect} onClose={() => setShowCustomerSelect(false)} onSelectCustomer={setCustomer} />
      <CheckoutOverlay isOpen={showPayment} onClose={() => setShowPayment(false)} total={calculateTotal()} orderType={orderType} setOrderType={setOrderType} paidAmount={paidAmount} setPaidAmount={setPaidAmount} onPlaceOrder={handlePlaceOrder} loading={loading} />
      <BatchSelectModal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} onSelectBatch={handleBatchSelect} item={selectedBatchItem} />
      <ReceiptPrinter ref={printRef} />
    </div>
  );
};

export default POS;