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
    // 🔴 1. වෙනස: User සහ Role එක එනකම් අනිවාර්යයෙන්ම ඉන්නවා. 
    // (මේකෙන් තමයි /shifts/me 500 Error එක එන එක 100% ක් නවතින්නේ)
    if (!user || !user.role) {
      setLoadingShift(false);
      return;
    }

    try {
      setLoadingShift(true);

      // ✅ ADMIN/MANAGER: selected branch shift
      if (isAdmin) {
        if (selectedBranchId === null || selectedBranchId === undefined) {
          setActiveShift(null);
          return;
        }

        // 0 වුණත්, වෙන Branch එකක් වුණත් අදාළ කෝල් එක යනවා
        const res = await shiftsAPI.getActiveByBranch(selectedBranchId);
        setActiveShift(res.data || null);
        return;
      }

      // ✅ CASHIER: own shift
      const res = await shiftsAPI.getMine();
      setActiveShift(res.data || null);
      
    } catch (e) {
      setActiveShift(null);
    } finally {
      setLoadingShift(false);
    }
  }, [isAdmin, selectedBranchId, user]);

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