import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { shiftsAPI } from "../api/shifts.api";
import { useAuth } from "./AuthContext";
import { useBranch } from "./BranchContext";

const ShiftContext = createContext(null);

export const ShiftProvider = ({ children }) => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  const [activeShift, setActiveShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  const refreshShift = useCallback(async () => {
    try {
      setLoadingShift(true);

      // ✅ ADMIN/MANAGER: selected branch shift
      if (isAdmin) {
        if (!selectedBranchId) {
          setActiveShift(null);
          return;
        }

        const res = await shiftsAPI.getActiveByBranch(selectedBranchId);
        // 🔴 Array එකක් ආවොත් පළවෙනි එක ගන්නවා, නැත්නම් ඒකම ගන්නවා. මුකුත් නැත්නම් null කරනවා.
        const shiftData = Array.isArray(res.data) ? res.data[0] : res.data;
        setActiveShift(shiftData || null);
        return;
      }

      // ✅ CASHIER: own shift
      const res = await shiftsAPI.getMine();
      // 🔴 Array එකක් ආවොත් පළවෙනි එක ගන්නවා, නැත්නම් ඒකම ගන්නවා. මුකුත් නැත්නම් null කරනවා.
      const shiftData = Array.isArray(res.data) ? res.data[0] : res.data;
      setActiveShift(shiftData || null);
      
    } catch (e) {
      setActiveShift(null);
    } finally {
      setLoadingShift(false);
    }
  }, [isAdmin, selectedBranchId]);

  useEffect(() => {
    refreshShift();
  }, [refreshShift]);

  return (
    <ShiftContext.Provider value={{ activeShift, loadingShift, refreshShift }}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => useContext(ShiftContext);
