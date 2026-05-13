import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { branchesAPI } from "../api/branches.api";
import { useAuth } from "../context/AuthContext";
import { cacheBranches, getCachedBranches } from "../offline/db";
import { isSingleBranchPlan } from "../utils/subscriptionFeatures";

const BranchContext = createContext(null);

const ALL_BRANCH = { id: 0, name: "All Branches" };

export const BranchProvider = ({ children }) => {
  const { user, isOnline, hasOnlineSession } = useAuth();

  const isAdmin = useMemo(() => user?.role === "ADMIN", [user?.role]);
  const isSingleBranchMode = useMemo(() => isSingleBranchPlan(user?.planName), [user?.planName]);

  const [branches, setBranches] = useState([ALL_BRANCH]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [storedSelectedBranchId, setStoredSelectedBranchId] = useState(() => {
    const saved = localStorage.getItem("branchId");
    if (saved !== null && saved !== "" && saved !== "null" && saved !== "undefined") {
      return Number(saved);
    }
    return 0;
  });
  const selectedBranchId = isSingleBranchMode ? Number(user?.branchId || 0) : storedSelectedBranchId;

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

          if (!isAdmin || isSingleBranchMode) {
            const myBranchId = Number(user.branchId);
            const onlyMine = filtered.filter((branch) => Number(branch.id) === myBranchId);
            setBranches(onlyMine);
            setStoredSelectedBranchId(myBranchId);
          } else {
            setBranches([ALL_BRANCH, ...filtered]);
            if (!filtered.some((branch) => Number(branch.id) === Number(storedSelectedBranchId))) {
              setStoredSelectedBranchId(0);
            }
          }
          return;
        }

        const cached = await getCachedBranches();
        if (!isAdmin || isSingleBranchMode) {
          const offlineBranch = cached.find((branch) => Number(branch.id) === Number(user.branchId));
          setBranches(offlineBranch ? [offlineBranch] : [{ id: user.branchId, name: `Branch ${user.branchId}` }]);
          setStoredSelectedBranchId(Number(user.branchId));
        } else {
          const nextBranches = cached.length > 0 ? [ALL_BRANCH, ...cached] : [ALL_BRANCH];
          setBranches(nextBranches);
        }
      } catch (error) {
        console.log("Failed to load branches", error);
        if ((!isAdmin || isSingleBranchMode) && user?.branchId) {
          setBranches([{ id: user.branchId, name: `Branch ${user.branchId}` }]);
          setStoredSelectedBranchId(Number(user.branchId));
        } else {
          setBranches([ALL_BRANCH]);
        }
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [hasOnlineSession, isAdmin, isOnline, isSingleBranchMode, storedSelectedBranchId, user]);

  useEffect(() => {
    if (!user?.branchId || !isSingleBranchMode) return;
    setStoredSelectedBranchId(Number(user.branchId));
  }, [isSingleBranchMode, user?.branchId]);

  useEffect(() => {
    if (isSingleBranchMode) {
      if (user?.branchId) {
        localStorage.setItem("branchId", String(Number(user.branchId)));
      }
      return;
    }

    if (!isAdmin) return;
    localStorage.setItem("branchId", String(selectedBranchId));
  }, [selectedBranchId, isAdmin, isSingleBranchMode, user?.branchId]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        loadingBranches,
        isAdmin,
        isSingleBranchMode,
        setBranches,
        setSelectedBranchId: (id) => {
          if (!isAdmin || isSingleBranchMode) return;
          setStoredSelectedBranchId(Number(id));
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
