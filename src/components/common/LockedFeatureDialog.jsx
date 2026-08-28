import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Lock, Mail, MessageCircle, Sparkles } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { getModuleState } from "../../utils/moduleAccess";

/**
 * Shown when a shop opens something its package does not include.
 *
 * A dialog rather than a page, matching the version-update dialog: the shop is not lost,
 * they tapped something they cannot have yet. Closing it leaves them where they were.
 *
 * The sidebar deliberately still lists locked modules, so for most shops this dialog is the
 * first time they learn the feature exists. That makes it a sales page, not an error — it
 * leads with the problem the module solves and names outcomes in the owner's own terms.
 * The copy comes from the server so it can be corrected without shipping a new build.
 *
 * Role decides the ending. An owner can buy, so they get the package, the price and a way to
 * reach us. A cashier cannot, so prices would be noise — they are told whose call it is.
 */
const LockedFeatureDialog = ({ moduleKey, open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [support, setSupport] = useState(null);

  const isOwner = user?.role === "ADMIN";

  const { module, siblings, capabilities } = useMemo(() => {
    const { catalog } = getModuleState();
    const entries = catalog ?? [];
    const found = entries.find((entry) => entry.key === moduleKey) ?? null;
    return {
      module: found,
      siblings: found
        ? entries.filter((entry) => entry.category === found.category && !entry.parentKey)
        : [],
      // Its own sub-features, named — the concrete list under the emotional pitch.
      capabilities: entries.filter((entry) => entry.parentKey === moduleKey),
    };
  }, [moduleKey]);

  useEffect(() => {
    if (!open) return;
    api.get("/api/saas/support-info", { meta: { background: true } })
      .then((response) => setSupport(response.data))
      .catch(() => setSupport(null));
    if (isOwner) {
      api.get("/api/saas/plans", { meta: { background: true } })
        .then((response) => setPlans(response.data ?? []))
        .catch(() => setPlans([]));
    }
  }, [open, isOwner]);

  // The cheapest package that includes it. Quoting the top tier reads as an upsell
  // rather than an answer.
  const unlockingPlan = useMemo(() => {
    if (!moduleKey || !plans.length) return null;
    return plans
      .filter((plan) => (plan.moduleKeys ?? []).includes(moduleKey))
      .filter((plan) => plan.name !== user?.planName)
      .sort((a, b) => a.renewalPrice - b.renewalPrice)[0] ?? null;
  }, [plans, moduleKey, user?.planName]);

  const featureName = module?.name ?? "This feature";
  const currency = support?.currencyPrefix ?? "Rs.";
  const outcomes = module?.outcomes ?? [];

  const whatsAppHref = support?.supportPhone
    ? `https://wa.me/${support.supportPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hi, this is ${user?.shopName || "our shop"}. We'd like to add "${featureName}" to our package.`
      )}`
    : null;

  const emailHref = support?.supportEmail
    ? `mailto:${support.supportEmail}?subject=${encodeURIComponent(
        `Adding ${featureName} — ${user?.shopName || "shop"}`
      )}`
    : null;

  return (
    <Modal isOpen={open} onClose={onClose} title="" size="xl">
      <div className="space-y-6">
        {/* ---------------------------------------------------------- hero */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
            <Lock size={12} />
            Not in your package
          </span>

          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-900">
            {module?.headline ?? featureName}
          </h2>

          <p className="mt-1.5 text-sm font-semibold uppercase tracking-wide text-slate-600">
            {featureName}
            {module?.categoryLabel ? ` · ${module.categoryLabel}` : ""}
          </p>

          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            {module?.pitch ?? module?.description}
          </p>
        </div>

        {/* ------------------------------------------- what it changes for them */}
        {outcomes.length ? (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5">
            <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              What this changes for your shop
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {outcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Check size={12} className="text-emerald-700" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-6 text-slate-700">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* -------------------------------------------- the concrete feature list */}
        {capabilities.length ? (
          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              Everything included
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {capabilities.map((entry) => (
                <li
                  key={entry.key}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Sparkles size={13} className="shrink-0 text-blue-500" />
                    {entry.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {entry.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ------------------------------------- where it sits in what they have */}
        {siblings.length > 1 ? (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Your {module.categoryLabel?.toLowerCase()}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {siblings.map((entry) => (
                <li
                  key={entry.key}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
                    entry.key === moduleKey
                      ? "border-amber-300 bg-amber-50 font-bold text-amber-800"
                      : entry.enabled
                        ? "border-slate-200 bg-white text-slate-700"
                        : "border-dashed border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  {entry.key === moduleKey ? (
                    <Lock size={11} />
                  ) : entry.enabled ? (
                    <Check size={11} className="text-emerald-600" />
                  ) : (
                    <Lock size={11} className="text-slate-600" />
                  )}
                  {entry.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* --------------------------------------------------------- the ask */}
        {isOwner ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            {unlockingPlan ? (
              <div className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm text-blue-900">
                  Included in <strong className="font-bold">{unlockingPlan.label}</strong>
                </span>
                <span className="text-2xl font-bold tracking-tight text-blue-900">
                  {currency} {unlockingPlan.renewalPrice.toLocaleString()}
                </span>
                <span className="text-sm text-blue-700">
                  /{unlockingPlan.billingCycle === "YEARLY" ? "year" : "month"}
                </span>
              </div>
            ) : (
              <p className="mb-4 text-sm text-blue-900">
                Talk to us and we&apos;ll switch {featureName} on for your shop.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {whatsAppHref ? (
                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <MessageCircle size={16} />
                  Add {featureName}
                </a>
              ) : null}

              {emailHref ? (
                <a
                  href={emailHref}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Mail size={15} />
                  Email us
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => { onClose(); navigate("/pricing"); }}
                className="inline-flex items-center gap-1 px-2 py-3 text-sm font-medium text-blue-700 transition-colors hover:text-blue-900"
              >
                Compare packages
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-600">
              Your shop&apos;s owner can add {featureName} to your package.
            </p>
            <Button variant="secondary" className="mt-3" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default LockedFeatureDialog;
