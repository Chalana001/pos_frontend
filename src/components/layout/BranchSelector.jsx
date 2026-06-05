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
    <div className="relative z-20 flex h-11 min-w-[150px] max-w-[190px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:min-w-[190px]">
      <Building2 size={18} className="shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <CustomSelect
          value={selectedBranchId}
          onChange={handleManualChange}
          options={branches}
          placeholder={t("Select Branch")}
          buttonClassName="h-9 border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0 hover:border-transparent"
          menuClassName="min-w-[150px] sm:min-w-[190px]"
        />
      </div>
    </div>
  );
};

export default BranchSelector;
