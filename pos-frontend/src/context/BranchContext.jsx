import React, { createContext, useContext, useEffect, useState } from "react";
import { branchesAPI } from "../api/branches.api"; // ✅ create this api

const BranchContext = createContext(null);

const ALL_BRANCH = { id: 0, name: "All Branches" };

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([ALL_BRANCH]);
  const [selectedBranchId, setSelectedBranchId] = useState(0);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // ✅ Load branches list from backend
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setLoadingBranches(true);

        const res = await branchesAPI.getAll(); // GET /branches
        const list = Array.isArray(res.data) ? res.data : [];

        // avoid duplicate 0
        const filtered = list.filter((b) => Number(b.id) !== 0);
        setBranches([ALL_BRANCH, ...filtered]);
      } catch (e) {
        console.log("Failed to load branches", e);
        setBranches([ALL_BRANCH]); // fallback
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, []);

  // ✅ load saved branch on start
  useEffect(() => {
    const saved = localStorage.getItem("branchId");

    if (saved !== null && saved !== "" && saved !== "null" && saved !== "undefined") {
      setSelectedBranchId(Number(saved));
    } else {
      setSelectedBranchId(0); // default All Branches
    }
  }, []);

  // ✅ persist selection (save 0 too)
  useEffect(() => {
    localStorage.setItem("branchId", String(selectedBranchId));
  }, [selectedBranchId]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        setSelectedBranchId: (id) => setSelectedBranchId(Number(id)),
        loadingBranches,
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
