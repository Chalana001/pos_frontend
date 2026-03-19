import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { branchesAPI } from "../api/branches.api";
import { useAuth } from "../context/AuthContext";

const BranchContext = createContext(null);

const ALL_BRANCH = { id: 0, name: "All Branches" };

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();

  const isAdmin = useMemo(() => {
    return user?.role === "ADMIN" || user?.role === "MANAGER";
  }, [user?.role]);

  const [branches, setBranches] = useState([ALL_BRANCH]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // 🔴 1. වෙනස් කරපු තැන: State එක හදද්දිම LocalStorage එකෙන් අගය ගන්නවා.
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const saved = localStorage.getItem("branchId");
    if (saved !== null && saved !== "" && saved !== "null" && saved !== "undefined") {
      return Number(saved);
    }
    return 0; // මුකුත් නැත්නම් විතරක් 0 (All Branches) දෙනවා
  });

  // Load branches from API
  useEffect(() => {
    if (!user) return;

    const loadBranches = async () => {
      try {
        setLoadingBranches(true);

        const res = await branchesAPI.getAll(); 
        const list = Array.isArray(res.data) ? res.data : [];
        const filtered = list.filter((b) => Number(b.id) !== 0);

        if (!isAdmin) {
          const myBranchId = Number(user.branchId);
          const onlyMine = filtered.filter((b) => Number(b.id) === myBranchId);
          setBranches(onlyMine);
          
          // Cashier කෙනෙක් නම්, එයාගේ branch එකම selectedBranchId එකට දානවා (LocalStorage එක බැලුවේ නෑනේ)
          setSelectedBranchId(myBranchId);
        } else {
          setBranches([ALL_BRANCH, ...filtered]);
        }
      } catch (e) {
        console.log("Failed to load branches", e);
        setBranches(isAdmin ? [ALL_BRANCH] : []);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [user, isAdmin]);

  // 🔴 2. වෙනස් කරපු තැන: LocalStorage එකට save කරන එක විතරක් තියාගත්තා. අර පරණ useEffect එක අයින් කළා.
  useEffect(() => {
    if (!isAdmin) return;
    localStorage.setItem("branchId", String(selectedBranchId));
  }, [selectedBranchId, isAdmin]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        loadingBranches,
        isAdmin,
        setSelectedBranchId: (id) => {
          if (!isAdmin) return;
          setSelectedBranchId(Number(id));
        },
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
};