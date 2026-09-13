import React from "react";
import { History, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const formatWhen = (isoString) => {
  if (!isoString) return "";
  const saved = new Date(isoString);
  if (Number.isNaN(saved.getTime())) return "";

  const time = saved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isToday = saved.toDateString() === new Date().toDateString();
  return isToday ? time : `${saved.toLocaleDateString()} ${time}`;
};

/**
 * Offers a draft back; never applies one on its own.
 *
 * Restoring silently would surprise people and can resurrect something they deliberately
 * walked away from, the same form reopened an hour later would quietly refill itself with
 * abandoned work and the user would not know where it came from. So this is an offer with
 * both answers on it, and doing nothing leaves the form empty.
 */
const DraftRestoreBar = ({ draft, label, onRestore, onDiscard }) => {
  const { t } = useLanguage();
  if (!draft) return null;

  const when = formatWhen(draft.updatedAt);

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
        <History size={16} className="shrink-0" />
        <span>
          {label}
          {when ? `, ${t("last edited")} ${when}` : ""}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          {t("Restore")}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/20"
        >
          <X size={14} />
          {t("Discard")}
        </button>
      </div>
    </div>
  );
};

export default DraftRestoreBar;
