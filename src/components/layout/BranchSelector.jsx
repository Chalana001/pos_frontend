import React, { useEffect } from "react";
import { Building2 } from "lucide-react";
import api from "../../api/axios";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";

const BranchSelector = () => {
  const { user } = useAuth();
  const { branches, setBranches, selectedBranchId, setSelectedBranchId } = useBranch();

  if (user?.role === "CASHIER") return null;

  useEffect(() => {
    if (branches.length === 0) fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await api.get("/branches");
      const list = Array.isArray(response.data) ? response.data : [];

      setBranches(list);

      if (selectedBranchId && list.some((b) => String(b.id) === String(selectedBranchId))) {
        return;
      }

      if (list.length > 0) {
        handleManualChange(String(list[0].id));
      } else {
        setSelectedBranchId("");
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  const handleManualChange = (newBranchId) => {
    setSelectedBranchId(newBranchId);

    localStorage.setItem("selectedBranchId", newBranchId);

    window.dispatchEvent(new Event("branchChanged"));
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 size={20} className="text-slate-600" />

      <select
        value={selectedBranchId || ""}
        onChange={(e) => handleManualChange(e.target.value)}
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