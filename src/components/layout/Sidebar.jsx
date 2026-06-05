import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppConfiguration } from "../../context/AppConfigurationContext";
import { useLanguage } from "../../context/LanguageContext";
import { hasPermission } from "../../utils/permissions";
import { hasPlanFeature } from "../../utils/subscriptionFeatures";
import { BRAND_MARK, BRAND_NAME, BRAND_WORDMARK } from "../../utils/branding";
import { APP_VERSION } from "../../data/versionHistory";
import { History } from "lucide-react";
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
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Truck,
  ShieldCheck,
  Settings2,
  Tag,
  CreditCard, // 🔴 Sales වලට අලුත් Icon එකක් ගත්තා
  // Printer,
} from "lucide-react";

const Sidebar = () => {
  const { user } = useAuth();
  const { configuration } = useAppConfiguration();
  const { t } = useLanguage();
  const location = useLocation();
  const role = user?.role;
  const canUseFeature = (feature) => hasPlanFeature(user?.planName, feature);

  // 🔴 Mobile Menu State
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // ✅ detect sub routes
  const isItemsRoute = location.pathname.startsWith("/items");
  const isEditingItem = /^\/items\/\d+\/edit$/.test(location.pathname);

  const isCustomersRoute = location.pathname.startsWith("/customers");
  const isEditingCustomer = /^\/customers\/\d+\/edit$/.test(location.pathname);
  const isViewingCustomer = /^\/customers\/\d+$/.test(location.pathname);

  const isShiftsRoute = location.pathname.startsWith("/shifts");
  const isExpensesRoute = location.pathname.startsWith("/expenses");

  const isStockRoute =
    location.pathname.startsWith("/stock") ||
    location.pathname.startsWith("/stocks");

  const isSuppliersRoute = location.pathname.startsWith("/suppliers");
  const isViewingSupplier = /^\/suppliers\/\d+$/.test(location.pathname);
  const isPurchaseRoute = location.pathname.startsWith("/purchases");
  const isWarrantyRoute =
    location.pathname.startsWith("/warranties") &&
    !location.pathname.startsWith("/warranties/settings");
  const isConfigurationRoute =
    location.pathname.startsWith("/app-configuration") ||
    location.pathname.startsWith("/branches") ||
    location.pathname.startsWith("/dining-tables") ||
    location.pathname.startsWith("/receipt-settings") ||
    location.pathname.startsWith("/users") ||
    location.pathname.startsWith("/warranties/settings");
  const isReportsRoute = location.pathname.startsWith("/reports");

  // 🟢 අලුතින් එකතු කළ Sales Route Detection
  const isSalesRoute = location.pathname.startsWith("/sales") || location.pathname.startsWith("/offline-sales");

  // ✅ dropdown open states
  const [openItems, setOpenItems] = useState(false);
  const [openCustomers, setOpenCustomers] = useState(false);
  const [openSuppliers, setOpenSuppliers] = useState(false);
  const [openShifts, setOpenShifts] = useState(false);
  const [openStock, setOpenStock] = useState(false);
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openExpenses, setOpenExpenses] = useState(false);
  const [openSales, setOpenSales] = useState(false); // 🟢 Sales dropdown state
  const [openWarranties, setOpenWarranties] = useState(false);
  const [openReports, setOpenReports] = useState(false);
  const [openConfiguration, setOpenConfiguration] = useState(false);

  const closeAllDropdowns = () => {
    setOpenItems(false);
    setOpenCustomers(false);
    setOpenSuppliers(false);
    setOpenShifts(false);
    setOpenStock(false);
    setOpenPurchase(false);
    setOpenExpenses(false);
    setOpenSales(false);
    setOpenWarranties(false);
    setOpenReports(false);
    setOpenConfiguration(false);
  };

  const openOnlyDropdown = (key) => {
    closeAllDropdowns();
    if (key === "items") setOpenItems(true);
    if (key === "customers") setOpenCustomers(true);
    if (key === "suppliers") setOpenSuppliers(true);
    if (key === "shifts") setOpenShifts(true);
    if (key === "stock") setOpenStock(true);
    if (key === "purchase") setOpenPurchase(true);
    if (key === "expenses") setOpenExpenses(true);
    if (key === "sales") setOpenSales(true);
    if (key === "warranties") setOpenWarranties(true);
    if (key === "reports") setOpenReports(true);
    if (key === "configuration") setOpenConfiguration(true);
  };

  const toggleDropdown = (key, currentlyOpen) => {
    if (currentlyOpen) {
      closeAllDropdowns();
      return;
    }
    openOnlyDropdown(key);
  };

  const handleSidebarOpen = () => {
    if (window.innerWidth >= 1280) {
      setIsDesktopCollapsed(false);
      return;
    }
    setIsOpen(true);
  };

  const handleSidebarClose = () => {
    if (window.innerWidth >= 1280) {
      setIsDesktopCollapsed(true);
      return;
    }
    setIsOpen(false);
  };

  // ✅ auto open dropdown when inside those routes
  useEffect(() => {
    if (isItemsRoute) openOnlyDropdown("items");
  }, [isItemsRoute]);

  useEffect(() => {
    if (isCustomersRoute) openOnlyDropdown("customers");
  }, [isCustomersRoute]);

  useEffect(() => {
    if (isSuppliersRoute) openOnlyDropdown("suppliers");
  }, [isSuppliersRoute]);

  useEffect(() => { 
    if (isShiftsRoute) openOnlyDropdown("shifts");
   }, [isShiftsRoute]);

  useEffect(() => {
    if (isStockRoute) openOnlyDropdown("stock");
  }, [isStockRoute]);

  useEffect(() => {
    if (isPurchaseRoute) openOnlyDropdown("purchase");
  }, [isPurchaseRoute]);

  useEffect(() => {
    if (isExpensesRoute) openOnlyDropdown("expenses");
  }, [isExpensesRoute]);

  useEffect(() => {
    if (isWarrantyRoute) openOnlyDropdown("warranties");
  }, [isWarrantyRoute]);

  useEffect(() => {
    if (isConfigurationRoute) openOnlyDropdown("configuration");
  }, [isConfigurationRoute]);

  useEffect(() => {
    if (isReportsRoute) openOnlyDropdown("reports");
  }, [isReportsRoute]);

  // 🟢 Auto open Sales Dropdown
  useEffect(() => {
    if (isSalesRoute) openOnlyDropdown("sales");
  }, [isSalesRoute]);

  // 🔴 Mobile එකේදී වෙනත් පිටුවකට ගියාම Sidebar එක Auto Close වෙන්න
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

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
      name: "Promotions",
      icon: Tag,
      path: "/promotions",
      permission: "MANAGE_PROMOTIONS",
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
      name: "Warranties",
      icon: ShieldCheck,
      path: "/warranties",
      permission: "VIEW_SALES",
      type: "dropdown-warranties",
    },
    {
      name: "Suppliers",
      icon: Truck,
      path: "/suppliers",
      permission: "VIEW_PURCHASES",
      type: "dropdown-suppliers",
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
      type: "dropdown-expenses",
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
      type: "dropdown-reports",
    },
    {
      name: "Configuration",
      icon: Settings2,
      path: "/app-configuration",
      permission: "MANAGE_APP_CONFIGURATION",
      type: "dropdown-configuration",
    },
  ];

return (
    <>
      {!isOpen && !isDesktopCollapsed && (
        <button
          type="button"
          aria-label="Open sidebar menu"
          onClick={handleSidebarOpen}
          className="shell-panel-hover fixed left-4 top-4 z-[60] rounded-lg bg-slate-900 p-2 text-white shadow-lg transition-colors hover:bg-slate-800 xl:hidden"
        >
          <Menu size={24} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`${isOpen ? "shell-sidebar-enter" : ""} fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0f172a] text-white shadow-2xl transform transition-all duration-300 ease-in-out xl:static
        ${isOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0 ${isDesktopCollapsed ? "xl:w-[72px] xl:min-w-[72px]" : "xl:w-64"}`}
      >
        <div
          className={`border-b border-slate-800 ${isDesktopCollapsed ? "cursor-pointer px-3 py-5" : "p-6"}`}
          onClick={isDesktopCollapsed ? handleSidebarOpen : undefined}
          role={isDesktopCollapsed ? "button" : undefined}
          tabIndex={isDesktopCollapsed ? 0 : undefined}
          onKeyDown={
            isDesktopCollapsed
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSidebarOpen();
                  }
                }
              : undefined
          }
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className={`flex items-center ${isDesktopCollapsed ? "justify-center" : "gap-3"}`}>
                <img
                src={BRAND_MARK}
                alt={`${BRAND_NAME} mark`}
                className="sidebar-logo-spin h-14 w-14 shrink-0 object-contain"
              />
              {!isDesktopCollapsed ? (
                <img
                  src={BRAND_WORDMARK}
                  alt={BRAND_NAME}
                  className="h-12 w-auto max-w-[150px] object-contain"
                />
              ) : null}
              </div>
            </div>
            {!isDesktopCollapsed ? (
              <button
                type="button"
                aria-label="Close sidebar menu"
                onClick={handleSidebarClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>
        </div>

        {!isDesktopCollapsed ? (
        <nav className="custom-scrollbar-dark flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const navDelay = `${110 + menuItems.indexOf(item) * 32}ms`;

            if (
              item.type !== "dropdown-items" &&
              item.type !== "dropdown-customers" &&
              item.type !== "dropdown-stock" &&
              item.type !== "dropdown-shifts" &&
              item.type !== "dropdown-purchase" &&
              item.type !== "dropdown-expenses" &&
              item.type !== "dropdown-sales" &&
              item.type !== "dropdown-reports" &&
              item.type !== "dropdown-warranties" &&
              item.type !== "dropdown-configuration"
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
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("sales", openSales)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isSalesRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Sales")}</span>
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
                          {t("Sales History")}
                        </NavLink>
                      )}
                      {hasPermission(role, "ACCESS_POS") && (
                        <NavLink
                          to="/offline-sales"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          {t("Offline Queue")}
                        </NavLink>
                      )}
                      
                      {/* ඔබට Sales Return වගේ වෙනත් ලින්ක් තියෙනවා නම් මෙතනින් එකතු කරන්න පුළුවන් */}
                      
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === "dropdown-reports") {
              if (!hasPermission(role, "VIEW_REPORTS") || !canUseFeature("ADVANCED_REPORTS")) return null;

              return (
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("reports", openReports)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isReportsRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Reports")}</span>
                    </div>
                    {openReports ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openReports && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      <NavLink
                        to="/reports"
                        end
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Basic Reports
                      </NavLink>
                      <NavLink
                        to="/reports/sales"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Sales Reports
                      </NavLink>
                      <NavLink
                        to="/reports/products"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Product Reports
                      </NavLink>
                      <NavLink
                        to="/reports/customers"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Customer Reports
                      </NavLink>
                      <NavLink
                        to="/reports/suppliers"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Supplier Reports
                      </NavLink>
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === "dropdown-warranties") {
              if (!hasPermission(role, "VIEW_SALES")) return null;

              return (
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("warranties", openWarranties)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isWarrantyRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Warranties</span>
                    </div>
                    {openWarranties ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openWarranties && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      <NavLink
                        to="/warranties"
                        end
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Warranty List
                      </NavLink>
                      <NavLink
                        to="/warranties/claims"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        Claims Queue
                      </NavLink>
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === "dropdown-configuration") {
              const canSeeConfigurationMenu =
                hasPermission(role, "MANAGE_APP_CONFIGURATION") ||
                hasPermission(role, "MANAGE_BRANCHES") ||
                hasPermission(role, "MANAGE_USERS") ||
                hasPermission(role, "MANAGE_WARRANTY_SETTINGS");

              if (!canSeeConfigurationMenu) return null;

              return (
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("configuration", openConfiguration)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isConfigurationRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Configuration")}</span>
                    </div>
                    {openConfiguration ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openConfiguration && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                        {hasPermission(role, "MANAGE_APP_CONFIGURATION") && (
                          <NavLink
                            to="/app-configuration"
                            end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          {t("App Configuration")}
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_BRANCHES") && (
                        <NavLink
                          to="/branches"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          {t("Branches")}
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_USERS") && canUseFeature("USER_MANAGEMENT") && (
                        <NavLink
                          to="/users"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          {t("Users")}
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_BRANCHES") && (
                        <NavLink
                          to="/receipt-settings"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          {t("Receipt Design")}
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_BRANCHES") &&
                        canUseFeature("DINING_TABLES") &&
                        configuration.tableManagementEnabled && (
                          <NavLink
                            to="/dining-tables"
                            className={({ isActive }) =>
                              `block px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                              }`
                            }
                          >
                            {t("Table Management")}
                          </NavLink>
                        )}

                      {hasPermission(role, "MANAGE_WARRANTY_SETTINGS") && (
                        <NavLink
                          to="/warranties/settings"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          {t("Warranty Settings")}
                        </NavLink>
                      )}
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
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("items", openItems)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isItemsRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Items")}</span>
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
                          {t("Item List")}
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
                          {t("Add Item")}
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
                          {t("Bulk Add Items")}
                        </NavLink>
                      )}

                      {hasPermission(role, "MANAGE_ITEMS") && canUseFeature("BULK_ITEMS") && (
                        <NavLink
                          to="/items/import-excel"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          {t("Excel Import")}
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
                          {t("Print Barcodes")}
                        </NavLink>
                      )}

                      {isEditingItem && (
                        <div className="block px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">
                          {t("Edit Item")}
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
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("customers", openCustomers)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isCustomersRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Customers")}</span>
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
                          {t("Customer List")}
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
                          {t("Add Customer")}
                        </NavLink>
                      )}

                      {isViewingCustomer && (
                        <div className="block px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">
                          {t("View Customer")}
                        </div>
                      )}

                      {isEditingCustomer && (
                        <div className="block px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">
                          {t("Edit Customer")}
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
            if (item.type === "dropdown-suppliers") {
              if (!canUseFeature("PURCHASES")) return null;
              const canSeeSuppliersMenu =
                hasPermission(role, "VIEW_PURCHASES") ||
                hasPermission(role, "NEW_PURCHASE");

              if (!canSeeSuppliersMenu) return null;

              return (
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("suppliers", openSuppliers)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isSuppliersRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">Suppliers</span>
                    </div>
                    {openSuppliers ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openSuppliers && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      {hasPermission(role, "VIEW_PURCHASES") && (
                        <NavLink
                          to="/suppliers"
                          end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Supplier List
                        </NavLink>
                      )}

                      {hasPermission(role, "NEW_PURCHASE") && (
                        <NavLink
                          to="/suppliers/new"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Add Supplier
                        </NavLink>
                      )}

                      {isViewingSupplier && (
                        <div className="block px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">
                          View Supplier
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === "dropdown-shifts") {
              if (!hasPermission(role, "MANAGE_SHIFTS")) return null;

              return (
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("shifts", openShifts)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isShiftsRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Shifts")}</span>
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
                        {t("Active Shift")}
                      </NavLink>)}
                      {hasPermission(role, "MANAGE_SHIFTS_HISTORY") && canUseFeature("SHIFT_HISTORY") && (<NavLink
                        to="/shifts/history"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        {t("Shift History")}
                      </NavLink>)}
                    </div>
                  )}
                </div>
              );
            }

            // =========================
            // ✅ Stock dropdown
            // =========================
            if (item.type === "dropdown-expenses") {
              if (!hasPermission(role, "RECORD_EXPENSES") || !canUseFeature("FINANCIALS")) return null;

              return (
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("expenses", openExpenses)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isExpensesRoute ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Expenses")}</span>
                    </div>
                    {openExpenses ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {openExpenses && (
                    <div className="ml-8 space-y-1 border-l border-slate-800 pl-3">
                      <NavLink
                        to="/expenses"
                        end
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        {t("Expense List")}
                      </NavLink>
                      <NavLink
                        to="/expenses/settings"
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        {t("Manage")}
                      </NavLink>
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === "dropdown-stock") {
              if (!canUseFeature("STOCK_LEVELS")) return null;
              const canSeeStockMenu =
                hasPermission(role, "VIEW_STOCK") ||
                hasPermission(role, "ADJUST_STOCK") ||
                hasPermission(role, "TRANSFER_STOCK");

              if (!canSeeStockMenu) return null;

              return (
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("stock", openStock)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isStockRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Stock")}</span>
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
                          {t("Stock List")}
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
                          {t("Adjustments")}
                        </NavLink>
                      )}

                      {hasPermission(role, "ADJUST_STOCK") && (
                        <NavLink
                          to="/stock/processing"
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`
                          }
                        >
                          Processing
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
                          {t("Transfers")}
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
                <div key={item.path} className="shell-nav-item-enter space-y-1" style={{ animationDelay: navDelay }}>
                  <button
                    onClick={() => toggleDropdown("purchase", openPurchase)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isPurchaseRoute
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{t("Purchase")}</span>
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
                          {t("Purchase List")}
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
                          {t("New Purchase")}
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
                style={{ animationDelay: navDelay }}
                className={({ isActive }) =>
                  `shell-nav-item-enter flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{t(item.name)}</span>
              </NavLink>
            );
          })}
        </nav>
        ) : <div className="flex-1" />}

        {!isDesktopCollapsed ? (
        <div className="page-section-enter border-t border-slate-800 p-4" style={{ animationDelay: '520ms' }}>
          <NavLink
            to="/version-history"
            className={({ isActive }) =>
              `mb-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-2">
              <History size={16} />
              {t("Version History")}
            </span>
            <span className="text-xs text-slate-400">v{APP_VERSION}</span>
          </NavLink>
          <div className="text-xs text-slate-400">
            {t(user?.branchId ? `Branch: #${user.branchId}` : "All Branches")}
          </div>
        </div>
        ) : null}
      </aside>
    </>
  );
};

export default Sidebar;
