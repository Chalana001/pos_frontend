import { useOfflineSync } from "../../offline/useOfflineSync";

/**
 * Renders nothing; exists so the automatic queue push has somewhere to live.
 *
 * Mounted from Layout because that sits inside the Branch, AppConfiguration and Shift
 * providers the hook reads, is present on every authenticated route, and is absent on the
 * login screen — where there is no session to push with.
 */
const OfflineSyncAgent = () => {
  useOfflineSync();
  return null;
};

export default OfflineSyncAgent;
