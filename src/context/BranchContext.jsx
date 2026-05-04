import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { branchesAPI } from "../api/branches.api";
import { useAuth } from "../context/AuthContext";
import { cacheBranches, getCachedBranches } from "../offline/db";

const BranchContext = createContext(null);

const ALL_BRANCH = { id: 0, name: "All Branches" };

export const BranchProvider = ({ children }) => {
  const { user, isOnline, hasOnlineSession } = useAuth();

  const isAdmin = useMemo(() => user?.role === "ADMIN", [user?.role]);

  const [branches, setBranches] = useState([ALL_BRANCH]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const saved = localStorage.getItem("branchId");
    if (saved !== null && saved !== "" && saved !== "null" && saved !== "undefined") {
      return Number(saved);
    }
    return 0;
  });

  useEffect(() => {
    if (!user) return;

    const loadBranches = async () => {
      try {
        setLoadingBranches(true);

        if (isOnline && hasOnlineSession) {
          const res = await branchesAPI.getAll();
          const list = Array.isArray(res.data) ? res.data : [];
          const filtered = list.filter((branch) => Number(branch.id) !== 0);
          await cacheBranches(filtered);

          if (!isAdmin) {
            const myBranchId = Number(user.branchId);
            const onlyMine = filtered.filter((branch) => Number(branch.id) === myBranchId);
            setBranches(onlyMine);
            setSelectedBranchId(myBranchId);
          } else {
            setBranches([ALL_BRANCH, ...filtered]);
            if (!filtered.some((branch) => Number(branch.id) === Number(selectedBranchId))) {
              setSelectedBranchId(0);
            }
          }
          return;
        }

        const cached = await getCachedBranches();
        if (!isAdmin) {
          const offlineBranch = cached.find((branch) => Number(branch.id) === Number(user.branchId));
          setBranches(offlineBranch ? [offlineBranch] : [{ id: user.branchId, name: `Branch ${user.branchId}` }]);
          setSelectedBranchId(Number(user.branchId));
        } else {
          const nextBranches = cached.length > 0 ? [ALL_BRANCH, ...cached] : [ALL_BRANCH];
          setBranches(nextBranches);
        }
      } catch (error) {
        console.log("Failed to load branches", error);
        if (!isAdmin && user?.branchId) {
          setBranches([{ id: user.branchId, name: `Branch ${user.branchId}` }]);
          setSelectedBranchId(Number(user.branchId));
        } else {
          setBranches([ALL_BRANCH]);
        }
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [hasOnlineSession, isAdmin, isOnline, selectedBranchId, user]);

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
