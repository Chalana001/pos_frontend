import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import { hasPlanFeature } from "../../utils/subscriptionFeatures";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Clock,
  DollarSign,
  TrendingDown,
  Warehouse,
  PieChart,
  Building2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  CreditCard, // 🔴 Sales වලට අලුත් Icon එකක් ගත්තා
  // Printer,
} from "lucide-react";

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role;
  const canUseFeature = (feature) => hasPlanFeature(user?.planName, feature);

  // 🔴 Mobile Menu State
  const [isOpen, setIsOpen] = useState(false);

  // ✅ detect sub routes
  const isItemsRoute = location.pathname.startsWith("/items");
  const isEditingItem = /^\/items\/\d+\/edit$/.test(location.pathname);

  const isCustomersRoute = location.pathname.startsWith("/customers");
  const isEditingCustomer = /^\/customers\/\d+\/edit$/.test(location.pathname);
  const isViewingCustomer = /^\/customers\/\d+$/.test(location.pathname);

  const isShiftsRoute = location.pathname.startsWith("/shifts");

  const isStockRoute =
    location.pathname.startsWith("/stock") ||
    location.pathname.startsWith("/stocks");

  const isPurchaseRoute = location.pathname.startsWith("/purchases");

  // 🟢 අලුතින් එකතු කළ Sales Route Detection
  const isSalesRoute = location.pathname.startsWith("/sales");

  // ✅ dropdown open states
  const [openItems, setOpenItems] = useState(false);
  const [openCustomers, setOpenCustomers] = useState(false);
  const [openShifts, setOpenShifts] = useState(false);
  const [openStock, setOpenStock] = useState(false);
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openSales, setOpenSales] = useState(false); // 🟢 Sales dropdown state

  // ✅ auto open dropdown when inside those routes
  useEffect(() => {
    if (isItemsRoute) setOpenItems(true);
  }, [isItemsRoute]);

  useEffect(() => {
    if (isCustomersRoute) setOpenCustomers(true);
  }, [isCustomersRoute]);

  useEffect(() => { 
    if (isShiftsRoute) setOpenShifts(true);
   }, [isShiftsRoute]);

  useEffect(() => {
    if (isStockRoute) setOpenStock(true);
  }, [isStockRoute]);

  useEffect(() => {
    if (isPurchaseRoute) setOpenPurchase(true);
  }, [isPurchaseRoute]);

  // 🟢 Auto open Sales Dropdown
  useEffect(() => {
    if (isSalesRoute) setOpenSales(true);
  }, [isSalesRoute]);

  // 🔴 Mobile එකේදී වෙනත් පිටුවකට ගියාම Sidebar එක Auto Close වෙන්න
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // ✅ Menu config
  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
      permission: "VIEW_DASHBOARD",
    },
    {
      name: "POS",
      icon: ShoppingCart,
      path: "/pos",
      permission: "ACCESS_POS",
    },
    // 🟢 අලුතින් එකතු කළ Sales Menu එක (POS එකට යටින්)
    {
      name: "Sales",
      icon: CreditCard,
      path: "/sales",
      permission: "VIEW_SALES", // ගැලපෙන permission එකක් දෙන්න
      type: "dropdown-sales",
    },
    {
      name: "Items",
      icon: Package,
      path: "/items",
      permission: "VIEW_ITEMS",
      type: "dropdown-items",
    },
    {
      name: "Customers",
      icon: Users,
      path: "/customers",
      permission: "MANAGE_CUSTOMERS",
      type: "dropdown-customers",
    },
    { 
      name: "Shifts",
      icon: Clock, 
      path: "/shifts", 
      permission: "MANAGE_SHIFTS", 
      type: "dropdown-shifts" 
    },
    {
      name: "Expenses",
      icon: DollarSign,
      path: "/expenses",
      permission: "RECORD_EXPENSES",
    },
    {
      name: "Cash Drops",
      icon: TrendingDown,
      path: "/cash-drops",
      permission: "RECORD_EXPENSES",
    },
    {
      name: "Stock",
      icon: Warehouse,
      path: "/stocks",
      permission: "VIEW_STOCK",
      type: "dropdown-stock",
    },
    {
      name: "Purchase",
      icon: Package,
      path: "/purchase",
      permission: "VIEW_PURCHASES",
      type: "dropdown-purchase",
    },
    {
      name: "Reports",
      icon: PieChart,
      path: "/reports",
      permission: "VIEW_REPORTS",
    },
    {
      name: "Branches",
      icon: Building2,
      path: "/branches",
      permission: "MANAGE_BRANCHES",
    },
    {
      name: "Users",
      icon: Users,
      path: "/users",
      permission: "MANAGE_USERS",
    },
  ];

return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="xl:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed xl:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out 
        ${isOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">POS System</h1>
            <p className="text-sm text-slate-400 mt-1">{role}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="xl:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (
              item.type !== "dropdown-items" &&
              item.type !== "dropdown-customers" &&
              item.type !== "dropdown-stock" &&
              item.type !== "dropdown-shifts" &&
              item.type !== "dropdown-purchase" &&
              item.type !== "dropdown-sales" // 🟢
            ) {
              if (!hasPermission(role, item.permission)) return null;
              if (item.path === "/reports" && !canUseFeature("ADVANCED_REPORTS")) return null;
              if (item.path === "/expenses" && !canUseFeature("FINANCIALS")) return null;
              if (item.path === "/cash-drops" && !canUseFeature("FINANCIALS")) return null;
              if (item.path === "/users" && !canUseFeature("USER_MANAGEMENT")) return null;
            }

            // =========================
            // 🟢 Sales Dropdown 
            // =========================
            if (item.type === "dropdown-sales") {
              const canSeeSalesMenu = hasPermission(role, "VIEW_SALES"); // Permission එක check කරන්න

              if (!canSeeSalesMenu) return null;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={() => setOpenSales((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isSalesRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Sales</span>
                    </div>
                    {openSales ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openSales && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      {hasPermission(role, "VIEW_SALES") && (
                        <NavLink
                          to="/sales"
                          end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Sales History
                        </NavLink>
                      )}
                      
                      {/* ඔබට Sales Return වගේ වෙනත් ලින්ක් තියෙනවා නම් මෙතනින් එකතු කරන්න පුළුවන් */}
                      
                    </div>
                  )}
                </div>
              );
            }

            // =========================
            // ✅ Items dropdown
            // =========================
            if (item.type === "dropdown-items") {
              const canSeeItemsMenu =
                hasPermission(role, "VIEW_ITEMS") ||
                hasPermission(role, "MANAGE_ITEMS");

              if (!canSeeItemsMenu) return null;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={() => setOpenItems((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isItemsRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Items</span>
                    </div>
                    {openItems ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openItems && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      {hasPermission(role, "VIEW_ITEMS") && (
                        <NavLink
                          to="/items"
                          end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Item List
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_ITEMS") && (
                        <NavLink
                          to="/items/new"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Add Item
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_ITEMS") && canUseFeature("BULK_ITEMS") && (
                        <NavLink
                          to="/items/bulk-add"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Bulk Add Items
                        </NavLink>
                      )}

                      {hasPermission(role, "VIEW_ITEMS") && canUseFeature("BARCODE_PRINT") && (
                        <NavLink
                          to="/items/print-barcodes"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Print Barcodes
                        </NavLink>
                      )}

                      {isEditingItem && (
                        <div className="block px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">
                          Edit Item
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // =========================
            // ✅ Customers dropdown 
            // =========================
            if (item.type === "dropdown-customers") {
              const canSeeCustomersMenu = hasPermission(role, "MANAGE_CUSTOMERS");
              if (!canSeeCustomersMenu) return null;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={() => setOpenCustomers((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isCustomersRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Customers</span>
                    </div>
                    {openCustomers ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openCustomers && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      {hasPermission(role, "MANAGE_CUSTOMERS") && (
                        <NavLink
                          to="/customers"
                          end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Customer List
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_CUSTOMERS") && (
                        <NavLink
                          to="/customers/new"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Add Customer
                        </NavLink>
                      )}

                      {isViewingCustomer && (
                        <div className="block px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">
                          View Customer
                        </div>
                      )}

                      {isEditingCustomer && (
                        <div className="block px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">
                          Edit Customer
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // =========================
            // ✅ Shifts dropdown
            // =========================
            if (item.type === "dropdown-shifts") {
              if (!hasPermission(role, "MANAGE_SHIFTS")) return null;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={() => setOpenShifts((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isShiftsRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Shifts</span>
                    </div>
                    {openShifts ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openShifts && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      {hasPermission(role, "MANAGE_SHIFTS") && (<NavLink
                        to="/shifts"
                        end
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Active Shift
                      </NavLink>)}
                      {hasPermission(role, "MANAGE_SHIFTS_HISTORY") && canUseFeature("SHIFT_HISTORY") && (<NavLink
                        to="/shifts/history"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Shift History
                      </NavLink>)}
                    </div>
                  )}
                </div>
              );
            }

            // =========================
            // ✅ Stock dropdown
            // =========================
            if (item.type === "dropdown-stock") {
              const canSeeStockMenu =
                hasPermission(role, "VIEW_STOCK") ||
                hasPermission(role, "ADJUST_STOCK") ||
                hasPermission(role, "TRANSFER_STOCK");

              if (!canSeeStockMenu) return null;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={() => setOpenStock((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isStockRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Stock</span>
                    </div>
                    {openStock ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openStock && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      {hasPermission(role, "VIEW_STOCK") && (
                        <NavLink
                          to="/stock"
                          end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Stock List
                        </NavLink>
                      )}

                      {hasPermission(role, "ADJUST_STOCK") && (
                        <NavLink
                          to="/stock/adjustments"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Adjustments
                        </NavLink>
                      )}

                      {hasPermission(role, "TRANSFER_STOCK") && canUseFeature("STOCK_TRANSFERS") && (
                        <NavLink
                          to="/stock/transfers"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Transfers
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // =========================
            // ✅ Purchase dropdown
            // =========================
            if (item.type === "dropdown-purchase") {
              if (!canUseFeature("PURCHASES")) return null;
              const canSeePurchaseMenu =
                hasPermission(role, "VIEW_PURCHASES") ||
                hasPermission(role, "NEW_PURCHASE");

              if (!canSeePurchaseMenu) return null;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={() => setOpenPurchase((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isPurchaseRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Purchase</span>
                    </div>
                    {openPurchase ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openPurchase && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      {hasPermission(role, "VIEW_PURCHASES") && (
                        <NavLink
                          to="/purchases"
                          end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Purchase List
                        </NavLink>
                      )}

                      {hasPermission(role, "NEW_PURCHASE") && (
                        <NavLink
                          to="/purchases/new"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          New Purchase
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // ✅ normal item
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Branch: {user?.branchId ? `#${user.branchId}` : "All Branches"}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
