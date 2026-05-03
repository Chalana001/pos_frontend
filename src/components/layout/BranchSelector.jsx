import React from "react";
import { Building2 } from "lucide-react";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import CustomSelect from "../common/CustomSelect";

const BranchSelector = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();

  if (user?.role !== "ADMIN") return null;

  const handleManualChange = (newBranchId) => {
    setSelectedBranchId(newBranchId);
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
