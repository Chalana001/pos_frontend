import React, { useEffect, useState } from "react";
import { Eye, LogOut, Pencil, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { isSupportSession } from "../../utils/supportSession";

/**
 * Persistent banner shown while a platform operator is inside this shop.
 *
 * Two audiences at once, which is why it is loud and cannot be dismissed:
 * the operator needs a constant reminder that this is somebody's live till, and anyone
 * standing at the counter deserves to see that support is in their system right now.
 *
 * The read-only flag comes from the response headers rather than the stored token, so it
 * reflects what the server is actually enforcing.
 */
const SupportSessionBanner = () => {
  const { user, logout } = useAuth();
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isSupportSession()) {
      setSession(null);
      return undefined;
    }

    // Read the operator's name off any response the app is already making, rather than
    // adding a request of our own just to draw a banner.
    const interceptorId = api.interceptors.response.use(
      (response) => {
        const by = response?.headers?.["x-impersonated-by"];
        if (by) {
          setSession({
            impersonatedBy: by,
            readOnly: String(response.headers["x-impersonation-read-only"]) === "true",
          });
        }
        return response;
      },
      (error) => Promise.reject(error)
    );

    return () => api.interceptors.response.eject(interceptorId);
  }, []);

  if (!isSupportSession()) return null;

  const readOnly = session?.readOnly !== false;

  return (
    <div
      role="status"
      className={`sticky top-0 z-[60] flex flex-wrap items-center gap-2 px-3 py-2 text-sm text-white ${
        readOnly ? "bg-blue-700" : "bg-red-700"
      }`}
    >
      <ShieldAlert size={16} className="shrink-0" />
      <span className="font-semibold">
        Support session{session?.impersonatedBy ? ` — ${session.impersonatedBy}` : ""}
      </span>
      <span className="inline-flex items-center gap-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-medium">
        {readOnly ? <Eye size={12} /> : <Pencil size={12} />}
        {readOnly ? "Read-only" : "Can make changes"}
      </span>
      <span className="hidden text-xs text-white/80 sm:inline">
        {readOnly
          ? "Nothing can be changed from this session."
          : "Changes made here affect this shop's live data."}
      </span>
      {user?.shopName ? (
        <span className="text-xs text-white/70">· {user.shopName}</span>
      ) : null}

      <div className="flex-1" />

      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-1 text-xs font-medium transition-colors hover:bg-white/30"
      >
        <LogOut size={12} />
        End session
      </button>
    </div>
  );
};

export default SupportSessionBanner;
