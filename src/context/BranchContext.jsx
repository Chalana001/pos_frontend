import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { branchesAPI } from "../api/branches.api";
import { useAuth } from "../context/AuthContext";

const BranchContext = createContext(null);

const ALL_BRANCH = { id: 0, name: "All Branches" };

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();

  const isAdmin = useMemo(() => {
    return user?.role === "ADMIN";  // 🔴 ADMIN එකමයි (MANAGER එක කෙලින් කළා)
  }, [user?.role]);

  const [branches, setBranches] = useState([ALL_BRANCH]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // 🔴 1. වෙනස් කරපු තැන: State එක හදද්දිම LocalStorage එකෙන් අගය ගන්නවා.
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const saved = localStorage.getItem("branchId");
    if (saved !== null && saved !== "" && saved !== "null" && saved !== "undefined") {
      return Number(saved);
    }
    return 0; 
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
          // 🔴 ADMIN නෙවුන් සියලුම (CASHIER/MANAGER) එ ඔවුන්ගේ branch එකමයි
          const myBranchId = Number(user.branchId);
          const onlyMine = filtered.filter((b) => Number(b.id) === myBranchId);
          setBranches(onlyMine);
          
          setSelectedBranchId(myBranchId);
        } else {
          // ADMIN එකමයි "All Branches" option එක
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

  useEffect(() => {
    if (!isAdmin) return;  // 🔴 ADMIN එකමයි localStorage එකට save කරන්න
    localStorage.setItem("branchId", String(selectedBranchId));
  }, [selectedBranchId, isAdmin]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        loadingBranches,
        isAdmin,
        setBranches,
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
