import { useCallback, useEffect, useState } from "react";
import { paymentMethodsAPI } from "../api/paymentMethods.api";
import { cachePaymentMethods, getCachedPaymentMethods } from "../offline/db";

// The four tenders that always exist, used only when the server cannot be
// reached AND nothing has been cached yet (a brand-new offline install). Once
// the app has fetched once, the cached rows are the source and a new method an
// admin added appears with no code change.
const FALLBACK_METHODS = [
  { code: "CASH", displayName: "Cash", category: "CASH", referencePolicy: "NONE", includeInExpectedCash: true, allowsCredit: false, iconKey: "Banknote", active: true, sortOrder: 1 },
  { code: "CARD", displayName: "Card Payment", category: "CARD", referencePolicy: "OPTIONAL", referenceLabel: "Approval Code", includeInExpectedCash: false, allowsCredit: false, iconKey: "CreditCard", active: true, sortOrder: 2 },
  { code: "BANK", displayName: "Bank Transfer", category: "BANK_TRANSFER", referencePolicy: "REQUIRED", referenceLabel: "Bank Reference", includeInExpectedCash: false, allowsCredit: false, iconKey: "Landmark", active: true, sortOrder: 3 },
  { code: "CREDIT", displayName: "Credit", category: "CREDIT", referencePolicy: "NONE", includeInExpectedCash: false, allowsCredit: true, iconKey: "CheckCircle2", active: true, sortOrder: 4 },
];

const normalize = (m) => ({
  code: String(m.code || "").toUpperCase(),
  displayName: m.displayName || m.code,
  category: m.category || "OTHER",
  referencePolicy: m.referencePolicy || "NONE",
  referenceLabel: m.referenceLabel || null,
  includeInExpectedCash: m.includeInExpectedCash === true,
  allowsCredit: m.allowsCredit === true,
  iconKey: m.iconKey || null,
  active: m.active !== false,
  sortOrder: Number(m.sortOrder || 0),
});

/**
 * Loads the tenant's active payment methods for the till. Online: fetches from
 * the backend and refreshes the offline cache. Offline (or a failed fetch):
 * falls back to the cached set, then to the built-in four. The hook always
 * resolves to a usable, active-only, sorted list.
 */
export function usePaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentMethodsAPI.listActive();
      const list = (Array.isArray(res.data) ? res.data : []).map(normalize);
      setMethods(list.filter((m) => m.active));
      cachePaymentMethods(list).catch(() => {});
    } catch {
      // Offline or server down: serve the cache, then the built-in defaults.
      try {
        const cached = (await getCachedPaymentMethods()).map(normalize);
        setMethods(cached.length ? cached.filter((m) => m.active) : FALLBACK_METHODS);
      } catch {
        setMethods(FALLBACK_METHODS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { methods, loading, reload: load };
}

export default usePaymentMethods;
