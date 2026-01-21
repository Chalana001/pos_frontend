import React, { createContext, useContext, useEffect, useState } from "react";

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // ✅ load saved branch on start
  useEffect(() => {
    const saved = localStorage.getItem("branchId");

    if (saved && saved !== "null" && saved !== "undefined" && saved !== "") {
      setSelectedBranchId(saved);
    }
  }, []);

  // ✅ persist branch selection
  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem("branchId", String(selectedBranchId));
    } else {
      localStorage.removeItem("branchId");
    }
  }, [selectedBranchId]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        setBranches,
        selectedBranchId,
        setSelectedBranchId,
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
