import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useBranch } from "../../context/BranchContext";
import { ensureBranchCatalogCached, prefetchOfflineRoutes } from "../../offline/offlineReadiness";
import { useOfflineSync } from "../../offline/useOfflineSync";

/**
 * Renders nothing; exists so everything that keeps the app usable offline has somewhere
 * to live — pushing the queue, and getting the pieces onto the device before they are
 * needed.
 *
 * Mounted from Layout because that sits inside the Branch, AppConfiguration and Shift
 * providers these read, is present on every authenticated route, and is absent from the
 * login screen, where there is no session to work with.
 */
const OfflineSyncAgent = () => {
  const { user, isOnline, hasOnlineSession, isOfflineSession } = useAuth();
  const { selectedBranchId } = useBranch();

  useOfflineSync();

  const canReachServer = isOnline && hasOnlineSession && !isOfflineSession;
  // 0 is the admin's "All Branches" selection, which has no catalogue of its own.
  const effectiveBranchId = user?.branchId || (selectedBranchId || null);

  useEffect(() => {
    if (!canReachServer) return;
    prefetchOfflineRoutes();
    ensureBranchCatalogCached(effectiveBranchId);
  }, [canReachServer, effectiveBranchId]);

  return null;
};

export default OfflineSyncAgent;
