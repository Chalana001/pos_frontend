import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Search, User, DollarSign, CreditCard, ScanLine, AlertCircle, Trash2, Tag, ChevronRight } from "lucide-react";
import { useKeyboard } from "../hooks/useKeyboard";
import { itemsAPI } from "../api/items.api";
import { ordersAPI } from "../api/orders.api";
import ProductSearch from "../components/pos/ProductSearch";
import CustomerSelect from "../components/pos/CustomerSelect";
import Cart from "../components/pos/Cart";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { formatCurrency } from "../utils/formatters";
import { ORDER_TYPES, DISCOUNT_TYPES } from "../utils/constants";
import { useShift } from "../context/ShiftContext";

const POS = () => {
  const { activeShift } = useShift();
  const branchId = activeShift?.branchId;
  const [cartItems, setCartItems] = useState([]);

  const [barcode, setBarcode] = useState("");

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [customer, setCustomer] = useState(null);

  const [orderType, setOrderType] = useState(ORDER_TYPES.CASH);
  const [billDiscount, setBillDiscount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const barcodeInputRef = useRef(null);

  const [discountType, setDiscountType] = useState(DISCOUNT_TYPES.NONE);
  const [discountValue, setDiscountValue] = useState(0);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useKeyboard("F2", () => setShowProductSearch(true));
  useKeyboard("F4", () => setShowCustomerSelect(true));
  useKeyboard("F9", handleCheckout);

  const handleBarcodeSearch = async (e) => {
    if (e.key === "Enter" && barcode.trim()) {
      try {
        const code = barcode.trim();
        const response = await itemsAPI.getByBarcode(code, branchId);
        if (response.data) {
          addToCart(response.data);
          setBarcode("");
          toast.success("Item added");
        } else {
          toast.error("Item not found");
        }
      } catch {
        toast.error("Item not found");
      }
    }
  };

  const addToCart = (item) => {
    const existingIndex = cartItems.findIndex((ci) => String(ci.itemId) === String(item.id));
    const stockQty = Number(item.availableQty ?? 0);

    if (existingIndex !== -1) {
      const newItems = [...cartItems];
      const nextQty = newItems[existingIndex].qty + 1;

      if (stockQty > 0 && nextQty > stockQty) {
        toast.error(`Low stock. Available: ${stockQty}`);
        return;
      }

      newItems[existingIndex] = { ...newItems[existingIndex], qty: nextQty };
      setCartItems(newItems);
      return;
    }

    if (stockQty === 0) {
      toast.error("Out of stock");
      return;
    }

    setCartItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        name: item.name,
        barcode: item.barcode,
        unitPrice: Number(item.sellingPrice ?? 0),
        qty: 1,
        discountType: DISCOUNT_TYPES.NONE,
        discountValue: 0,
        stockQty,
      },
    ]);
  };

  const updateQuantity = (index, newQty) => {
    if (newQty < 1) return;
    const item = cartItems[index];
    const stockQty = Number(item.stockQty ?? 0);

    if (stockQty > 0 && newQty > stockQty) {
      toast.error(`Not enough stock. Available: ${stockQty}`);
      return;
    }

    const newItems = [...cartItems];
    newItems[index].qty = newQty;
    setCartItems(newItems);
  };

  const removeItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const openDiscountModal = (index) => {
    setSelectedItemIndex(index);
    const item = cartItems[index];
    setDiscountType(item.discountType);
    setDiscountValue(item.discountValue);
    setShowDiscountModal(true);
  };

  const applyDiscount = () => {
    if (selectedItemIndex !== null) {
      const newItems = [...cartItems];
      newItems[selectedItemIndex].discountType = discountType;
      newItems[selectedItemIndex].discountValue = parseFloat(discountValue) || 0;
      setCartItems(newItems);
      setShowDiscountModal(false);
      toast.success("Discount updated");
    }
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

  function handleCheckout() {
    if (cartItems.length === 0) return toast.error("Cart is empty");
    if (!activeShift || activeShift.status !== "OPEN") return toast.error("No active shift.");
    if (orderType === ORDER_TYPES.CREDIT && !customer) return toast.error("Select customer for credit");

    setPaidAmount(calculateTotal());
    setShowPayment(true);
  }

  const handlePlaceOrder = async () => {
    const total = calculateTotal();
    if (orderType === ORDER_TYPES.CASH && paidAmount < total) return toast.error("Insufficient amount");

    setLoading(true);
    try {
      const orderData = {
        branchId: branchId,
        orderType,
        customerId: orderType === ORDER_TYPES.CREDIT ? customer?.id : null,
        billDiscount,
        paidAmount: orderType === ORDER_TYPES.CASH ? paidAmount : 0,
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
        note: "",
      };

      const response = await ordersAPI.create(orderData);
      toast.success(`Order ${response.data.invoiceNo} success!`);

      setCartItems([]);
      setCustomer(null);
      setOrderType(ORDER_TYPES.CASH);
      setBillDiscount(0);
      setShowPayment(false);

      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] bg-slate-50 p-4 flex gap-6 font-sans">
      
      {/* --- LEFT PANEL (Controls & Input) --- */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* 1. Header & Scanner Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
           {/* Decorative Background Blob */}
           <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

           <div className="relative z-10">
              <h1 className="text-2xl font-bold text-slate-800 mb-1">New Sale</h1>
              <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${activeShift?.status === "OPEN" ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                 {activeShift?.status === "OPEN" ? "Shift Active" : "Shift Closed"} 
                 {customer && <span className="text-blue-500 font-medium">• {customer.name}</span>}
              </p>

              {/* Barcode Input */}
              <div className="flex gap-3">
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ScanLine className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={handleBarcodeSearch}
                    className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-0 text-slate-900 rounded-xl ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-lg transition-all shadow-inner"
                    placeholder="Scan barcode..."
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                     <kbd className="hidden sm:inline-block px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-500 shadow-sm">Enter</kbd>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowProductSearch(true)}
                  className="px-6 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium border border-blue-200 transition-colors flex flex-col items-center justify-center min-w-[100px]"
                >
                   <Search size={20} className="mb-1"/>
                   <span className="text-xs">Search (F2)</span>
                </button>
              </div>
           </div>
        </div>

        {/* 2. Controls Grid */}
        <div className="grid grid-cols-2 gap-4 flex-1 content-start">
            
            {/* Customer Card */}
            <button 
              onClick={() => setShowCustomerSelect(true)}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${customer ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-600 hover:shadow-md'}`}
            >
               <div className="flex justify-between items-start mb-2">
                 <User size={24} className={customer ? 'text-blue-200' : 'text-slate-400 group-hover:text-blue-500'} />
                 <span className="text-xs font-mono opacity-60">F4</span>
               </div>
               <div className="font-semibold text-lg truncate">{customer ? customer.name : "Select Customer"}</div>
               <div className={`text-sm ${customer ? 'text-blue-100' : 'text-slate-400'}`}>
                  {customer ? customer.phone : "Add to order"}
               </div>
               {customer && (
                 <div onClick={(e) => { e.stopPropagation(); setCustomer(null); }} className="absolute top-2 right-2 p-2 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors">
                    <Trash2 size={16} className="text-white"/>
                 </div>
               )}
            </button>

            {/* Discount Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <Tag size={24} className="text-orange-500" />
                   <span className="text-xs font-mono text-slate-400">GLOBAL</span>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bill Discount</label>
                   <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-slate-400 font-light">LKR</span>
                      <input 
                        type="number" 
                        value={billDiscount}
                        onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-xl font-bold text-slate-800 focus:outline-none border-b border-transparent focus:border-orange-500 transition-colors p-0"
                        placeholder="0.00"
                      />
                   </div>
                </div>
            </div>

            {/* Payment Type Toggle */}
            <div className="col-span-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
               <button 
                 onClick={() => setOrderType(ORDER_TYPES.CASH)}
                 className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${orderType === ORDER_TYPES.CASH ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                  <DollarSign size={18} /> Cash
               </button>
               <button 
                 onClick={() => setOrderType(ORDER_TYPES.CREDIT)}
                 className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${orderType === ORDER_TYPES.CREDIT ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                  <CreditCard size={18} /> Credit
               </button>
            </div>
        </div>

         {/* Warnings */}
         {(!activeShift || activeShift.status !== "OPEN") && (
            <div className="mt-auto flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl">
               <AlertCircle size={20} />
               <span className="font-medium">Shift is currently closed. Operations are restricted.</span>
            </div>
         )}
      </div>

      {/* --- RIGHT PANEL (Cart/Receipt) --- */}
      <div className="w-[420px] flex flex-col">
        <Cart
          items={cartItems}
          onUpdateQty={updateQuantity}
          onRemoveItem={removeItem}
          onApplyDiscount={openDiscountModal}
          onClear={() => setCartItems([])}
          total={calculateTotal()}
          subTotal={cartItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0)}
          onCheckout={handleCheckout}
          isCheckoutDisabled={cartItems.length === 0 || !activeShift || activeShift.status !== "OPEN"}
        />
      </div>

      {/* --- MODALS --- */}
      <ProductSearch
        isOpen={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onSelectItem={addToCart}
        branchId={branchId}
      />

      <CustomerSelect
        isOpen={showCustomerSelect}
        onClose={() => setShowCustomerSelect(false)}
        onSelectCustomer={setCustomer}
      />

      {/* Discount Modal */}
      <Modal isOpen={showDiscountModal} onClose={() => setShowDiscountModal(false)} title="Item Discount">
         <div className="p-4 space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
               {[DISCOUNT_TYPES.NONE, DISCOUNT_TYPES.FIXED, DISCOUNT_TYPES.PERCENT].map((type) => (
                  <button
                     key={type}
                     onClick={() => setDiscountType(type)}
                     className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${discountType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     {type === DISCOUNT_TYPES.NONE ? 'None' : type === DISCOUNT_TYPES.FIXED ? 'Amount' : 'Percentage'}
                  </button>
               ))}
            </div>
            
            {discountType !== DISCOUNT_TYPES.NONE && (
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Value</label>
                  <div className="relative">
                     <input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="w-full text-3xl font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 focus:border-blue-500 focus:outline-none transition-colors"
                        autoFocus
                     />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        {discountType === DISCOUNT_TYPES.PERCENT ? '%' : 'LKR'}
                     </span>
                  </div>
               </div>
            )}

            <div className="flex gap-3 pt-4">
               <Button variant="secondary" onClick={() => setShowDiscountModal(false)} className="flex-1 py-3">Cancel</Button>
               <Button onClick={applyDiscount} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700">Apply Discount</Button>
            </div>
         </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Finalize Payment">
         <div className="p-6">
            <div className="bg-slate-50 rounded-2xl p-6 mb-6 flex flex-col items-center">
               <span className="text-slate-500 font-medium mb-1">Total Amount Due</span>
               <span className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(calculateTotal())}</span>
               <div className="flex gap-2 mt-4 text-sm">
                  <span className="px-2 py-1 bg-white border rounded text-slate-500 font-medium">{cartItems.length} Items</span>
                  <span className="px-2 py-1 bg-white border rounded text-slate-500 font-medium">{orderType}</span>
               </div>
            </div>

            {orderType === ORDER_TYPES.CASH && (
               <div className="space-y-4 mb-6">
                  <div>
                     <label className="text-sm font-bold text-slate-700 mb-1 block">Cash Received</label>
                     <input
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        className="w-full text-2xl font-semibold p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                     />
                  </div>
                  <div className="flex justify-between items-center p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                     <span className="font-medium">Change Due:</span>
                     <span className="text-xl font-bold font-mono">{formatCurrency(Math.max(0, paidAmount - calculateTotal()))}</span>
                  </div>
               </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <Button variant="secondary" onClick={() => setShowPayment(false)} className="py-4">Cancel</Button>
               <Button onClick={handlePlaceOrder} disabled={loading} className="py-4 bg-emerald-600 hover:bg-emerald-700 text-lg shadow-lg shadow-emerald-200">
                  {loading ? "Processing..." : "Complete Order"}
               </Button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default POS;