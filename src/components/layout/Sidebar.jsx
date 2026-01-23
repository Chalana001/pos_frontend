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
  BarChart3,
  FileText,
  PieChart,
  Building2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // ✅ detect items sub routes
  const isItemsRoute = location.pathname.startsWith("/items");
  const isEditingItem = /^\/items\/\d+\/edit$/.test(location.pathname);

  // ✅ auto open Items dropdown when in items routes
  const [openItems, setOpenItems] = useState(false);
  useEffect(() => {
    if (isItemsRoute) setOpenItems(true);
  }, [isItemsRoute]);

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

    // ✅ Items parent is special (dropdown)
    {
      name: "Items",
      icon: Package,
      path: "/items",
      permission: "VIEW_ITEMS",
      type: "dropdown",
    },

    {
      name: "Customers",
      icon: Users,
      path: "/customers",
      permission: "MANAGE_CUSTOMERS",
    },
    {
      name: "Shifts",
      icon: Clock,
      path: "/shifts",
      permission: "MANAGE_SHIFTS",
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
      path: "/stock",
      permission: "VIEW_STOCK",
    },
    {
      name: "Adjustments",
      icon: BarChart3,
      path: "/stock-adjustments",
      permission: "ADJUST_STOCK",
    },
    {
      name: "Transfers",
      icon: FileText,
      path: "/stock-transfers",
      permission: "TRANSFER_STOCK",
    },
    {
      name: "Reports",
      icon: PieChart,
      path: "/reports",
      permission: "VIEW_REPORTS",
    },
    {
      name: "Charts",
      icon: BarChart3,
      path: "/charts",
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

  const visibleItems = menuItems.filter((item) =>
    hasPermission(user.role, item.permission)
  );

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold">POS System</h1>
        <p className="text-sm text-slate-400 mt-1">{user.role}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          // ✅ special dropdown for items
          if (item.type === "dropdown") {
            return (
              <div key={item.path} className="space-y-1">
                {/* Parent */}
                <button
                  onClick={() => setOpenItems((v) => !v)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    isItemsRoute
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

                {/* Sub menu */}
                {openItems && (
                  <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                    <NavLink
                      to="/items"
                      end
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-slate-800 text-white"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`
                      }
                    >
                      Item List
                    </NavLink>

                    <NavLink
                      to="/items/new"
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-slate-800 text-white"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`
                      }
                    >
                      Add Item
                    </NavLink>

                    {/* ✅ Edit only appears while editing */}
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

          // normal items
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
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
          Branch: {user.branchId ? `#${user.branchId}` : "All Branches"}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
