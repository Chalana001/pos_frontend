import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Info, TriangleAlert, X } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const STYLES = {
  INFO: {
    wrap: "bg-blue-50 border-blue-200 text-blue-900",
    icon: "text-blue-600",
    Icon: Info,
  },
  WARNING: {
    wrap: "bg-amber-50 border-amber-200 text-amber-900",
    icon: "text-amber-600",
    Icon: TriangleAlert,
  },
  CRITICAL: {
    wrap: "bg-red-50 border-red-300 text-red-900",
    icon: "text-red-600",
    Icon: AlertTriangle,
  },
};

/**
 * Platform notices, shown at the top of the app.
 *
 * Fetched once per session rather than polled: these change on the order of days, and a
 * cashier's tab does not need to discover a maintenance notice within thirty seconds of it
 * being published. A reload picks up anything new.
 *
 * Dismissal is recorded server-side per shop, so closing it on the till does not mean it
 * reappears on the manager's laptop.
 */
const AnnouncementBanner = () => {
  const { isAuthenticated, isOnline } = useAuth();
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !isOnline) return;
    try {
      const response = await api.get("/api/saas/my-announcements", {
        meta: { background: true },
      });
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch {
      // A shop that cannot reach the control plane should still be able to sell.
      setItems([]);
    }
  }, [isAuthenticated, isOnline]);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = async (announcement) => {
    // Hide it straight away; the server call is bookkeeping.
    setItems((current) => current.filter((entry) => entry.id !== announcement.id));
    try {
      await api.post(`/api/saas/my-announcements/${announcement.id}/dismiss`, null, {
        meta: { background: true },
      });
    } catch {
      // Worst case it comes back on the next load.
    }
  };

  if (!items.length) return null;

  return (
    <div className="space-y-px">
      {items.map((announcement) => {
        const style = STYLES[announcement.severity] ?? STYLES.INFO;
        const Icon = style.Icon;

        return (
          <div
            key={announcement.id}
            role="status"
            className={`flex flex-wrap items-start gap-2 border-b px-3 py-2 text-sm ${style.wrap}`}
          >
            <Icon size={16} className={`mt-0.5 shrink-0 ${style.icon}`} />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">{announcement.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">{announcement.body}</p>
            </div>

            {announcement.linkUrl ? (
              <a
                href={announcement.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded bg-white/60 px-2 py-1 text-xs font-medium hover:bg-white/90"
              >
                {announcement.linkLabel || "Read more"}
                <ExternalLink size={11} />
              </a>
            ) : null}

            {announcement.dismissible ? (
              <button
                type="button"
                onClick={() => dismiss(announcement)}
                aria-label={`Dismiss: ${announcement.title}`}
                className="shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
