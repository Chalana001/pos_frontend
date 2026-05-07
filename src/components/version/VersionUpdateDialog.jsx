import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, History, Sparkles } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { useAuth } from "../../context/AuthContext";
import { APP_VERSION, LATEST_VERSION } from "../../data/versionHistory";
import { BRAND_LOGO, BRAND_NAME } from "../../utils/branding";

const getStorageKey = (user) =>
  `zensys-pos-seen-version:${user?.tenantId || "tenant"}:${user?.username || user?.userId || "user"}`;

const VersionUpdateDialog = () => {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const storageKey = useMemo(() => getStorageKey(user), [user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setOpen(false);
      return;
    }

    const seenVersion = localStorage.getItem(storageKey);
    setOpen(seenVersion !== APP_VERSION);
  }, [isAuthenticated, storageKey, user]);

  const closeDialog = () => {
    localStorage.setItem(storageKey, APP_VERSION);
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={closeDialog} title="" size="lg">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-12 w-12 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700">
                <Sparkles size={14} />
                New version available
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                {BRAND_NAME} v{LATEST_VERSION.version}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{LATEST_VERSION.summary}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="font-semibold text-slate-900">Release date</div>
            <div className="mt-1 text-slate-600">{LATEST_VERSION.releaseDate}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {LATEST_VERSION.highlights.slice(0, 6).map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
              <p className="text-sm leading-5 text-slate-700">{item}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/version-history"
            onClick={closeDialog}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <History size={16} />
            View full version history
          </Link>
          <Button type="button" onClick={closeDialog} className="sm:min-w-[150px]">
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VersionUpdateDialog;
