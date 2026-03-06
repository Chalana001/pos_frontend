import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
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
  Menu, // අලුතින් Menu (ඉරි තුන) icon එක ගත්තා
  X,    // අලුතින් X (Close) icon එක ගත්තා
} from "lucide-react";

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role;

  // 🔴 Mobile Menu State
  const [isOpen, setIsOpen] = useState(false);

  // ✅ detect items sub routes
  const isItemsRoute = location.pathname.startsWith("/items");
  const isEditingItem = /^\/items\/\d+\/edit$/.test(location.pathname);

  // ✅ detect customers sub routes
  const isCustomersRoute = location.pathname.startsWith("/customers");
  const isEditingCustomer = /^\/customers\/\d+\/edit$/.test(location.pathname);
  const isViewingCustomer = /^\/customers\/\d+$/.test(location.pathname);

  const isShiftsRoute = location.pathname.startsWith("/shifts");

  // ✅ detect stock sub routes
  const isStockRoute =
    location.pathname.startsWith("/stock") ||
    location.pathname.startsWith("/stocks");

  // ✅ dropdown open states
  const [openItems, setOpenItems] = useState(false);
  const [openCustomers, setOpenCustomers] = useState(false);
  const [openShifts, setOpenShifts] = useState(false);
  const [openStock, setOpenStock] = useState(false);

  // detect purchase routes
  const isPurchaseRoute = location.pathname.startsWith("/purchases");
  const [openPurchase, setOpenPurchase] = useState(false);

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
      {/* 🔴 xl:hidden දැම්මා - ලොකුම Screen එක එනකම් මේ ඉරි තුන පේනවා */}
      <button
        onClick={() => setIsOpen(true)}
        className="xl:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
      >
        <Menu size={24} />
      </button>

      {/* 🔴 xl:hidden දැම්මා */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 🔴 fixed xl:static දැම්මා - Tablet වලදීත් Fixed විදියට (උඩින්) එන්නේ */}
      <aside
        className={`fixed xl:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out 
        ${isOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">POS System</h1>
            <p className="text-sm text-slate-400 mt-1">{role}</p>
          </div>
          {/* 🔴 xl:hidden දැම්මා - Close Button එක */}
          <button
            onClick={() => setIsOpen(false)}
            className="xl:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* ... (ඔයාගේ කලින් තිබ්බ menuItems.map කෑල්ල වෙනසක් නෑ, ඒ විදියටම තියන්න) ... */}
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (
              item.type !== "dropdown-items" &&
              item.type !== "dropdown-customers" &&
              item.type !== "dropdown-stock" &&
              item.type !== "dropdown-shifts" &&
              item.type !== "dropdown-purchase"
            ) {
              if (!hasPermission(role, item.permission)) return null;
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

                      {hasPermission(role, "MANAGE_ITEMS") && (
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
                      {hasPermission(role, "MANAGE_SHIFTS_HISTORY") && (<NavLink
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

                      {hasPermission(role, "TRANSFER_STOCK") && (
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