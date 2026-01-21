import React, { useEffect } from "react";
import { Building2 } from "lucide-react";
import api from "../../api/axios";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";

const BranchSelector = () => {
  const { user } = useAuth();
  const { branches, setBranches, selectedBranchId, setSelectedBranchId } = useBranch();

  // ✅ Cashier should NOT change branch
  if (user?.role === "CASHIER") return null;

  useEffect(() => {
    if (branches.length === 0) fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await api.get("/branches");
      const list = Array.isArray(response.data) ? response.data : [];

      setBranches(list);

      // ✅ if current selectedBranchId is valid keep it
      if (selectedBranchId && list.some((b) => String(b.id) === String(selectedBranchId))) {
        return;
      }

      // ✅ otherwise default to first
      if (list.length > 0) {
        setSelectedBranchId(String(list[0].id));
      } else {
        setSelectedBranchId("");
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 size={20} className="text-slate-600" />

      <select
        value={selectedBranchId || ""}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={String(branch.id)}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BranchSelector;
