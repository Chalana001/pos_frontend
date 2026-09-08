import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, History, Sparkles } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { useAuth } from "../../context/AuthContext";
import { APP_VERSION, LATEST_VERSION } from "../../data/versionHistory";
import { BRAND_MARK, BRAND_NAME } from "../../utils/branding";

const getStorageKey = (user) =>
  `zensys-pos-seen-version:${user?.tenantId || "tenant"}:${user?.username || user?.userId || "user"}`;

const parseVersion = (version) => {
  const [major = 0, minor = 0, patch = 0] = String(version || "0.0.0")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

  return { major, minor, patch };
};

const shouldShowUpdateDialog = (seenVersion, currentVersion) => {
  // No record on this device means this is the first version it has met - so show it.
  // The record is written only when a popup is dismissed, so returning false here meant a
  // device that had never shown a popup could never show one: the release notes were
  // unreachable on every fresh browser, and on most existing ones too.
  if (!seenVersion) {
    return true;
  }

  const seen = parseVersion(seenVersion);
  const current = parseVersion(currentVersion);

  if (current.major !== seen.major) {
    return current.major > seen.major;
  }

  if (current.minor !== seen.minor) {
    return current.minor > seen.minor;
  }

  return false;
};

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
    setOpen(shouldShowUpdateDialog(seenVersion, APP_VERSION));
  }, [isAuthenticated, storageKey, user]);

  const closeDialog = () => {
    localStorage.setItem(storageKey, APP_VERSION);
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={closeDialog} title="" size="lg">
      {/*
        The Modal scrolls its body and keeps ~140px for its own header, so anything tall
        enough to scroll takes the footer with it - the Got it button was the first thing
        to disappear. The copy is kept short enough not to scroll at a normal height, and
        the footer is sticky so it stays reachable when it does.
      */}
      <div className="-m-6 flex flex-col">
        <div className="space-y-5 px-6 pt-2 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src={BRAND_MARK} alt={BRAND_NAME} className="sidebar-logo-spin h-10 w-10 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                  <Sparkles size={12} />
                  What's new
                </span>
                <span className="text-xs text-slate-500">{LATEST_VERSION.releaseDate}</span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold text-slate-900">
                {BRAND_NAME} v{LATEST_VERSION.version}
                <span className="ml-2 text-base font-semibold text-slate-500">{LATEST_VERSION.title}</span>
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{LATEST_VERSION.summary}</p>
            </div>
          </div>

          <ul className="space-y-2">
            {LATEST_VERSION.highlights.slice(0, 6).map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="shell-surface sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <Link
            to="/version-history"
            onClick={closeDialog}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <History size={16} />
            Full version history
          </Link>
          <Button type="button" onClick={closeDialog} className="min-w-[120px]">
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VersionUpdateDialog;
