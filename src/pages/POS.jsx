import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Search, ChefHat, AlertTriangle, Lock } from "lucide-react";
import { useKeyboard } from "../hooks/useKeyboard";
import { itemsAPI } from "../api/items.api";
import { ordersAPI } from "../api/orders.api";
import CustomerSelect from "../components/pos/CustomerSelect";
import Cart from "../components/pos/Cart";
import CheckoutOverlay from "../components/pos/CheckoutOverlay";
import BatchSelectModal from "../components/pos/BatchSelectModal"; // ✅ Import Modal
import { formatCurrency } from "../utils/formatters";
import { ORDER_TYPES, DISCOUNT_TYPES } from "../utils/constants";
import { useShift } from "../context/ShiftContext";
import { useAuth } from "../context/AuthContext";

const POS = () => {
  const { activeShift } = useShift();
  const { user } = useAuth();

  // --- 1. BRANCH IDENTIFICATION ---
  const [selectedBranchId, setSelectedBranchId] = useState(
    localStorage.getItem("selectedBranchId")
  );

  useEffect(() => {
    const handleBranchUpdate = () => {
        setSelectedBranchId(localStorage.getItem("selectedBranchId"));
    };
    window.addEventListener("branchChanged", handleBranchUpdate);
    window.addEventListener("storage", handleBranchUpdate);
    return () => {
        window.removeEventListener("branchChanged", handleBranchUpdate);
        window.removeEventListener("storage", handleBranchUpdate);
    };
  }, []);

  const currentBranchId = user?.branchId || selectedBranchId || activeShift?.branchId;

  // --- 2. VALIDATION ---
  const isShiftOpenForCurrentBranch = 
    activeShift && 
    activeShift.status === "OPEN" && 
    String(activeShift.branchId) === String(currentBranchId);

  // --- State ---
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  
  // Modals
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  // ✅ NEW: Batch Selection States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);

  // Transaction Data
  const [customer, setCustomer] = useState(null);
  const [orderType, setOrderType] = useState(ORDER_TYPES.CASH);
  const [billDiscount, setBillDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  // --- Data Loading ---
  useEffect(() => {
    if (currentBranchId) {
      fetchProducts(currentBranchId);
    } else {
       setAllItems([]);
       setFilteredItems([]);
    }
  }, [currentBranchId]);

  // Filter Logic (Category Fix Here)
  useEffect(() => {
    let result = allItems;
    if (activeCategory !== "All") {
      // ✅ FIX: categoryName පාවිච්චි කරන්න
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

  const fetchProducts = async (branchId) => {
    try {
      const response = await itemsAPI.search("", branchId);
      const items = Array.isArray(response.data) ? response.data : [];
      setAllItems(items);
      setFilteredItems(items);
      
      // ✅ FIX: categoryName වලින් Unique Categories ගන්න
      const uniqueCats = ["All", ...new Set(items.map(i => i.categoryName).filter(Boolean))];
      setCategories(uniqueCats);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load products");
    }
  };

  // --- ADD TO CART (UPDATED LOGIC) ---
  const addToCart = (item) => {
    if (!isShiftOpenForCurrentBranch) {
        toast.error("Please open a shift for this branch to make sales!");
        return;
    }

    // A. Check for Multiple Batches
    // Item එකට Batches 1 කට වඩා තියෙනවා නම් Modal එක Open කරන්න
    if (item.batches && item.batches.length > 1) {
        setSelectedBatchItem(item);
        setShowBatchModal(true);
        return;
    }

    // B. Single Batch / No Batch
    // Batch 1ක් තියෙනවා නම් ඒක ගන්න, නැත්නම් Default Item Price එක ගන්න
    let targetBatch = null;
    if (item.batches && item.batches.length > 0) {
        targetBatch = item.batches[0]; // First batch (FIFO)
    }

    // කෙලින්ම Cart එකට යවන්න (Modal ඕන නෑ)
    processAddToCart(item, targetBatch ? targetBatch.price : item.sellingPrice, 1, targetBatch);
  };

  // --- Handle Batch Selection form Modal ---
  const handleBatchSelect = (batch) => {
      processAddToCart(selectedBatchItem, batch.price, 1, batch);
      setShowBatchModal(false);
      setSelectedBatchItem(null);
  };

  // --- Process Add To Cart (Internal) ---
  const processAddToCart = (item, price, qty, batchData = null) => {
    // 1. Batch ID & Stock Check
    const batchId = batchData ? batchData.batchId : (item.batches?.[0]?.batchId || null);
    const stockQty = batchData ? batchData.qty : (item.availableQty || 0);

    if (stockQty < qty) {
        toast.error(`Insufficient stock! Available: ${stockQty}`);
        return;
    }

    // 2. Add or Update Cart
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
          batchId: batchId, // ✅ Important: Backend එකට යවන්න ඕන
          name: item.name,
          barcode: item.barcode,
          unitPrice: Number(price), // ✅ Selected Batch Price
          qty: 1,
          discountType: DISCOUNT_TYPES.NONE,
          discountValue: 0,
          stockQty,
          image: item.imageUrl // Note: JSON uses imageUrl, code used image
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
    if (!isShiftOpenForCurrentBranch) {
        return toast.error("No active shift. Cannot checkout.");
    }
    setPaidAmount(calculateTotal());
    setShowPayment(true);
  };

  const handlePlaceOrder = async () => {
    const total = calculateTotal();
    if (orderType === ORDER_TYPES.CASH && paidAmount < total) return toast.error("Insufficient amount");
    if (orderType === ORDER_TYPES.CREDIT && !customer) return toast.error("Select customer for credit");

    setLoading(true);
    try {
      const orderData = {
        branchId: currentBranchId, 
        orderType,
        customerId: orderType === ORDER_TYPES.CREDIT ? customer?.id : null,
        billDiscount,
        paidAmount: orderType === ORDER_TYPES.CASH ? paidAmount : 0,
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          batchId: item.batchId, // ✅ Send Batch ID to Backend
          qty: item.qty,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
        note: "",
      };
      
      const response = await ordersAPI.create(orderData);
      toast.success(`Order ${response.data.invoiceNo} success!`);

      if (currentBranchId) {
        await fetchProducts(currentBranchId); 
      }

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

  return (
    <div className="flex h-full gap-1.5 lg:gap-4 bg-slate-100 p-1.5 lg:p-4 font-sans text-slate-800 flex-col overflow-y-auto lg:overflow-hidden">
      
      {/* UI Message if Shift is Closed */}
      {!isShiftOpenForCurrentBranch && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 lg:px-4 lg:py-3 rounded-lg lg:rounded-xl flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 lg:gap-3">
                <Lock className="text-orange-600 w-4 h-4 lg:w-5 lg:h-5" />
                <div>
                    <span className="font-bold text-xs lg:text-sm block">Read-Only Mode</span>
                    <span className="text-[10px] lg:text-xs opacity-90 leading-tight">
                        Viewing stock for Branch #{currentBranchId || 'Unknown'}. Open a shift to enable sales.
                    </span>
                </div>
            </div>
        </div>
      )}

      {/* Main Wrapper */}
      <div className="flex flex-col lg:flex-row flex-1 gap-1.5 lg:gap-4 lg:overflow-hidden lg:h-full">
        
        {/* 1. CENTER AREA (Products)
            🔴 මෙතන තමයි වෙනස කරේ! h-[75vh] වෙනුවට h-[55vh] (හෝ h-[60vh]) දැම්මා. 
        */}
        <div className="flex flex-col h-[55vh] flex-shrink-0 lg:h-full lg:flex-1 bg-slate-50 rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            
            <header className="px-2 py-2 lg:px-6 lg:py-5 bg-white border-b border-slate-100 flex flex-row items-center justify-between gap-2 flex-shrink-0">
                <div className="hidden sm:block lg:block">
                  <h1 className="text-sm lg:text-xl font-bold text-slate-800">New Sale</h1>
                  <p className="text-slate-400 text-[10px] lg:text-sm hidden lg:block">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center flex-1 lg:flex-none lg:w-1/3 w-full">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 lg:pl-10 pr-3 lg:pr-4 py-1.5 lg:py-2.5 rounded-lg lg:rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs lg:text-sm"
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
                    className={`px-3 lg:px-5 py-1 lg:py-2 rounded-md lg:rounded-lg whitespace-nowrap text-[10px] lg:text-sm font-semibold transition-all ${activeCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm lg:shadow-md shadow-blue-200'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                    {cat}
                    </button>
                ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 lg:p-6 bg-slate-50">
                {filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Search className="mb-2 lg:mb-4 opacity-30 w-8 h-8 lg:w-12 lg:h-12" />
                        <p className="text-sm lg:text-lg font-medium text-center">
                           {currentBranchId ? "No items found" : "Select a branch"}
                        </p>
                    </div>
                ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-4 gap-1.5 lg:gap-4">
                {filteredItems.map((item) => {
                    const stockQty = Number(item.availableQty ?? 0);
                    const isOutOfStock = stockQty <= 0;
                    const isClickable = !isOutOfStock && isShiftOpenForCurrentBranch;

                    return (
                    <div
                        key={item.id}
                        onClick={() => !isOutOfStock && addToCart(item)}
                        className={`group bg-white rounded-lg lg:rounded-xl p-2 lg:p-6 border border-slate-200 transition-all relative flex flex-col items-center text-center 
                            ${isClickable 
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

        {/* 2. RIGHT PANEL (Cart) */}
        <div className={`w-full lg:w-[380px] flex flex-col flex-shrink-0 h-max lg:h-full bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm lg:overflow-hidden transition-opacity duration-300 ${!isShiftOpenForCurrentBranch ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
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
    </div>
  );
};

export default POS;