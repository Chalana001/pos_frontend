import { useEffect, useState } from "react";
import { isOnlineNow, subscribeToNetworkStatus } from "../utils/networkStatus";

/**
 * Whether the app currently believes the server is reachable.
 *
 * This used to be raw `navigator.onLine`, which reports only that a network interface is
 * up — see utils/networkStatus.js for why that lie was expensive. The state machine lives
 * there as a singleton; this hook is just a subscription to it.
 */
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(isOnlineNow);

  useEffect(() => subscribeToNetworkStatus(setIsOnline), []);

  return isOnline;
};

export default useNetworkStatus;
