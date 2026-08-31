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

  // Below sm the pill is just the building icon - the row has no room for a
  // branch name there. The select itself stays mounted, stretched invisibly
  // over the icon, so tapping it opens the same dropdown anchored to the pill
  // and nothing about the control's behaviour forks.
  return (
    <div className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm sm:w-full sm:min-w-[150px] sm:max-w-[190px] sm:justify-start sm:gap-2 sm:px-3">
      <Building2 size={18} className="shrink-0 text-slate-500" />
      <div className="absolute inset-0 opacity-0 sm:static sm:min-w-0 sm:flex-1 sm:opacity-100">
        <CustomSelect
          value={selectedBranchId}
          onChange={handleManualChange}
          options={branches}
          placeholder={t("Select Branch")}
          buttonClassName="h-11 sm:h-9 border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0 hover:border-transparent"
          menuClassName="min-w-[150px] sm:min-w-[190px]"
        />
      </div>
    </div>
  );
};

export default BranchSelector;
