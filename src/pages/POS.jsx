import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Search, User, DollarSign, CreditCard } from "lucide-react";
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
          toast.success("Item added to cart");
        } else {
          toast.error("Item not found");
        }
      } catch {
        toast.error("Item not found");
      }
    }
  };

  const addToCart = (item) => {
    const existingIndex = cartItems.findIndex(
  (ci) => String(ci.itemId) === String(item.id)
);

    const stockQty = Number(item.availableQty ?? 0);
    console.log("Adding to cart:1");
    console.log("Item:", item);
    console.log("Stock Qty:", stockQty);

    if (existingIndex !== -1) {
      console.log("Adding to cart:2.1");
      const newItems = [...cartItems];
      const nextQty = newItems[existingIndex].qty + 1;
      console.log("Adding to cart:2.2");

      if (stockQty > 0 && nextQty > stockQty) {
        console.log("Not enough stock. Available");
        toast.error(`Not enough stock. Available: ${stockQty}`);
        return;
      }
      console.log("Adding to cart:3");

      // ✅ immutable update
      newItems[existingIndex] = { ...newItems[existingIndex], qty: nextQty };
      setCartItems(newItems);
      return;
    }

    console.log("Adding to cart:4");
    if (stockQty === 0) {
      toast.error("Out of stock");
      return;
    }

    console.log("Adding to cart:5");

    // ✅ functional update (fix stale state overwrite)
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
    toast.success("Item removed");
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
      toast.success("Discount applied");
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
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!activeShift || activeShift.status !== "OPEN") {
      toast.error("No active shift. Please open a shift first.");
      return;
    }

    if (orderType === ORDER_TYPES.CREDIT && !customer) {
      toast.error("Please select a customer for credit orders");
      return;
    }

    setPaidAmount(calculateTotal());
    setShowPayment(true);
  }

  const handlePlaceOrder = async () => {

    const total = calculateTotal();

    if (orderType === ORDER_TYPES.CASH && paidAmount < total) {
      toast.error("Paid amount cannot be less than total");
      return;
    }

    setLoading(true);
    console.log("Placing order with data1");

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
      console.log("Placing order with data2", orderData);

      const response = await ordersAPI.create(orderData);

      toast.success(`Order ${response.data.invoiceNo} placed successfully!`);

      setCartItems([]);
      setCustomer(null);
      setOrderType(ORDER_TYPES.CASH);
      setBillDiscount(0);
      setShowPayment(false);

      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex gap-6">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Scan or Search Products</h2>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleBarcodeSearch}
                placeholder="Scan barcode or type..."
                className="input text-lg"
                autoFocus
              />
            </div>

            <Button onClick={() => setShowProductSearch(true)} variant="secondary">
              <Search size={20} />
              <span className="ml-2">Search (F2)</span>
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowCustomerSelect(true)}
              variant={customer ? "success" : "secondary"}
              className="flex-1"
            >
              <User size={20} />
              <span className="ml-2">
                {customer ? customer.name : "Select Customer (F4)"}
              </span>
            </Button>

            {customer && (
              <Button onClick={() => setCustomer(null)} variant="danger">
                Clear
              </Button>
            )}
          </div>

          {/* ✅ shift warning */}
          {(!activeShift || activeShift.status !== "OPEN") && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ No active shift. Please open a shift to place orders.
              </p>
            </div>
          )}
        </div>

        {/* Order Type */}
        <div className="card flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Order Type</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType(ORDER_TYPES.CASH)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${orderType === ORDER_TYPES.CASH
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <DollarSign size={18} className="inline mr-1" />
                Cash
              </button>

              <button
                onClick={() => setOrderType(ORDER_TYPES.CREDIT)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${orderType === ORDER_TYPES.CREDIT
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <CreditCard size={18} className="inline mr-1" />
                Credit
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bill Discount (LKR)
            </label>
            <input
              type="number"
              value={billDiscount}
              onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
              className="input"
              placeholder="0.00"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 card flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Cart ({cartItems.length})</h2>
          {cartItems.length > 0 && (
            <button
              onClick={() => setCartItems([])}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <Cart
            items={cartItems}
            onUpdateQty={updateQuantity}
            onRemoveItem={removeItem}
            onApplyDiscount={openDiscountModal}
          />
        </div>

        <Button
          onClick={handleCheckout}
          className="w-full mt-4 py-4 text-lg"
          disabled={
            cartItems.length === 0 ||
            !activeShift ||
            activeShift.status !== "OPEN"
          }
        >
          Checkout (F9) - {formatCurrency(calculateTotal())}
        </Button>
      </div>

      {/* Modals */}
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

      <Modal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        title="Apply Discount"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Discount Type
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="input"
            >
              <option value={DISCOUNT_TYPES.NONE}>No Discount</option>
              <option value={DISCOUNT_TYPES.FIXED}>Fixed Amount</option>
              <option value={DISCOUNT_TYPES.PERCENT}>Percentage</option>
            </select>
          </div>

          {discountType !== DISCOUNT_TYPES.NONE && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {discountType === DISCOUNT_TYPES.PERCENT
                  ? "Percentage (%)"
                  : "Amount (LKR)"}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="input"
                placeholder="0"
                min="0"
                max={discountType === DISCOUNT_TYPES.PERCENT ? 100 : undefined}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={applyDiscount} className="flex-1">
              Apply
            </Button>
            <Button variant="secondary" onClick={() => setShowDiscountModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment */}
      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Confirm Payment"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-slate-600">Order Type:</span>
              <span className="font-semibold">{orderType}</span>
            </div>

            {customer && (
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Customer:</span>
                <span className="font-semibold">{customer.name}</span>
              </div>
            )}

            <div className="flex justify-between mb-2">
              <span className="text-slate-600">Items:</span>
              <span className="font-semibold">{cartItems.length}</span>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>Total:</span>
              <span className="text-blue-600">
                {formatCurrency(calculateTotal())}
              </span>
            </div>

            {orderType === ORDER_TYPES.CASH && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Paid Amount (LKR)
                </label>

                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="input"
                  min="0"
                  autoFocus
                />

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Change:</span>
                  <span className="font-semibold">
                    {formatCurrency(Math.max(0, paidAmount - calculateTotal()))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePlaceOrder}
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm & Print"}
            </Button>
            <Button variant="secondary" onClick={() => setShowPayment(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
