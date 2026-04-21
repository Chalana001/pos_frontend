import React, { useEffect } from "react";
import { Building2 } from "lucide-react";
import api from "../../api/axios";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import CustomSelect from "../common/CustomSelect"; // 🟢 Custom Select එක Import කළා (Path එක ඔයාගේ ෆෝල්ඩර් විදිහට හදාගන්න)

const BranchSelector = () => {
  const { user } = useAuth();
  const { branches, setBranches, selectedBranchId, setSelectedBranchId } = useBranch();

  // 🔴 ADMIN එකමයි dropdown දෙක (CASHIER/MANAGER dropdown නෑ)
  if (user?.role !== "ADMIN") return null;

  useEffect(() => {
    if (branches.length === 0) fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="relative flex items-center gap-2 ml-14 xl:ml-0">
      <Building2 size={20} className="text-slate-500 hidden sm:block shrink-0" />

      {/* Custom Select with proper z-index */}
      <div className="w-40 z-20">
        <CustomSelect
          value={selectedBranchId}
          onChange={handleManualChange}
          options={branches}
          placeholder="Select Branch"
        />
      </div>
    </div>
  );
};

export default BranchSelector;