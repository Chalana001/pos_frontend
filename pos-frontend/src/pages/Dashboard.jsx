import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dashboardAPI } from "../api/dashboard.api";
import { formatCurrency } from "../utils/formatters";
import { canAccessAllBranches } from "../utils/permissions";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  CreditCard,
  Users,
} from "lucide-react";
import { useBranch } from "../context/BranchContext";

const Dashboard = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedBranchId } = useBranch();

  useEffect(() => {
    fetchKPIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, user?.branchId]);

  const fetchKPIs = async () => {
    setLoading(true);

    try {
      const branchId = canAccessAllBranches(user?.role)
        ? selectedBranchId
        : user?.branchId;

      // ✅ Admin/Manager not selected branch yet -> don't stuck loading
      // if (!branchId) {
      //   setKpis(null);
      //   return;
      // }

      const response = await dashboardAPI.getKPIs(branchId);
      setKpis(response.data);
    } catch (error) {
      console.error("Failed to fetch KPIs:", error);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  // ✅ if no branch selected (admin)
  if (selectedBranchId === null || selectedBranchId === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <div className="text-sm text-slate-500">
            {new Date().toLocaleDateString("en-LK", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Please select a branch to view dashboard KPIs.
            </p>
          </div>
        </Card>
      </div>
    );
  }
//   if (!kpis) {
//   return (
//     <div className="space-y-6">
//       <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
//       <Card>
//         <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
//           <p className="text-sm text-red-800">
//             ❌ Failed to load dashboard KPIs. Please try again.
//           </p>
//         </div>
//       </Card>
//     </div>
//   );
// }

  const stats = [
    {
      title: "Today's Sales",
      value: formatCurrency(kpis?.todaySales || 0),
      icon: DollarSign,
      color: "bg-blue-500",
      change: "+12.5%",
    },
    {
      title: "Cash Sales",
      value: formatCurrency(kpis?.cashSales || 0),
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      title: "Credit Sales",
      value: formatCurrency(kpis?.creditSales || 0),
      icon: CreditCard,
      color: "bg-orange-500",
    },
    {
      title: "Total Orders",
      value: kpis?.todayOrders || 0,
      icon: ShoppingCart,
      color: "bg-purple-500",
    },
    {
      title: "Expenses",
      value: formatCurrency(kpis?.todayExpenses || 0),
      icon: TrendingDown,
      color: "bg-red-500",
    },
    {
      title: "Cash Drops",
      value: formatCurrency(kpis?.todayCashDrops || 0),
      icon: Package,
      color: "bg-indigo-500",
    },
    {
      title: "Low Stock Items",
      value: kpis?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "bg-yellow-500",
    },
    {
      title: "Credit Due",
      value: formatCurrency(kpis?.totalDue || 0),
      icon: Users,
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500">
          {new Date().toLocaleDateString("en-LK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {stat.value}
                  </p>
                  {stat.change && (
                    <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                  )}
                </div>
                <div
                  className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}
                >
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Activity">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New order placed</p>
                <p className="text-xs text-slate-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Stock adjusted</p>
                <p className="text-xs text-slate-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Shift opened</p>
                <p className="text-xs text-slate-500">2 hours ago</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
              <ShoppingCart className="text-blue-600 mb-2" size={24} />
              <p className="font-medium text-slate-800">New Sale</p>
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
              <Package className="text-green-600 mb-2" size={24} />
              <p className="font-medium text-slate-800">Stock Adjust</p>
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
              <Users className="text-purple-600 mb-2" size={24} />
              <p className="font-medium text-slate-800">Add Customer</p>
            </button>
            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-left">
              <DollarSign className="text-orange-600 mb-2" size={24} />
              <p className="font-medium text-slate-800">View Reports</p>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
