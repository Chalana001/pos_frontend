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
  const [selectedBranchId, setSelectedBranchId] = useState(0);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // ✅ Load branches list
  useEffect(() => {
    if (!user) return;

    const loadBranches = async () => {
      try {
        setLoadingBranches(true);

        const res = await branchesAPI.getAll(); // GET /branches
        const list = Array.isArray(res.data) ? res.data : [];

        // avoid duplicate 0 coming from backend
        const filtered = list.filter((b) => Number(b.id) !== 0);

        // ✅ CASHIER -> only show their own branch
        if (!isAdmin) {
          const myBranchId = Number(user.branchId);
          const onlyMine = filtered.filter((b) => Number(b.id) === myBranchId);
          setBranches(onlyMine);
        } else {
          // ✅ ADMIN/MANAGER -> show all
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

  // ✅ Set selected branch
  useEffect(() => {
    if (!user) return;

    // ✅ CASHIER -> force to user branch (ignore localStorage)
    if (!isAdmin) {
      setSelectedBranchId(Number(user.branchId));
      return;
    }

    // ✅ ADMIN/MANAGER -> load saved selection from localStorage
    const saved = localStorage.getItem("branchId");
    if (
      saved !== null &&
      saved !== "" &&
      saved !== "null" &&
      saved !== "undefined"
    ) {
      setSelectedBranchId(Number(saved));
    } else {
      setSelectedBranchId(0); // default All Branches
    }
  }, [user, isAdmin]);

  // ✅ Persist selection only for admin/manager
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

        // ✅ Admin can change branch, Cashier cannot
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
