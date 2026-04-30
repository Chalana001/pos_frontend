import React, { useEffect } from "react";
import { Building2 } from "lucide-react";
import api from "../../api/axios";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import CustomSelect from "../common/CustomSelect";

const BranchSelector = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { branches, setBranches, selectedBranchId, setSelectedBranchId } = useBranch();

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

      if (selectedBranchId && list.some((branch) => String(branch.id) === String(selectedBranchId))) {
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
    <div className="relative ml-14 flex items-center gap-2 xl:ml-0">
      <Building2 size={20} className="hidden shrink-0 text-slate-500 sm:block" />
      <div className="z-20 w-40">
        <CustomSelect
          value={selectedBranchId}
          onChange={handleManualChange}
          options={branches}
          placeholder={t("Select Branch")}
        />
      </div>
    </div>
  );
};

export default BranchSelector;
