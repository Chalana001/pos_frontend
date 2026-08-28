import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Check, Clock, Mail, MessageCircle, Minus, Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getModuleState } from '../utils/moduleAccess';

/**
 * The packages page a shop owner sees.
 *
 * The comparison is generated from the module catalog the server sends, not from a
 * hand-written feature list — so it can never advertise something the API would refuse.
 * Rows where every package agrees are hidden by default: eleven identical ticks tell the
 * reader nothing, and burying the four rows that actually differ is what makes a pricing
 * table useless.
 */
const SubscriptionPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [support, setSupport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShared, setShowShared] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [plansRes, subRes, supportRes] = await Promise.allSettled([
        api.get('/api/saas/plans', { meta: { background: true } }),
        api.get('/api/saas/my-subscription', { meta: { background: true } }),
        api.get('/api/saas/support-info', { meta: { background: true } }),
      ]);
      if (cancelled) return;

      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data ?? []);
      // A shop with no active subscription is an expected state, not an error.
      if (subRes.status === 'fulfilled') setSubscription(subRes.value.data);
      if (supportRes.status === 'fulfilled') setSupport(supportRes.value.data);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const currency = support?.currencyPrefix ?? 'Rs.';
  const currentPlanName = subscription?.plan?.name ?? user?.planName ?? null;

  // Top-level modules only. Sub-features would triple the table's height for detail
  // nobody compares packages on.
  const rows = useMemo(() => {
    const { catalog } = getModuleState();
    const roots = (catalog ?? []).filter((entry) => !entry.parentKey && !entry.locked);
    if (!roots.length || !plans.length) return [];

    return roots.map((entry) => {
      const included = plans.map((plan) => (plan.moduleKeys ?? []).includes(entry.key));
      return {
        ...entry,
        included,
        sharedByAll: included.every(Boolean),
      };
    });
  }, [plans]);

  const differing = rows.filter((row) => !row.sharedByAll);
  const shared = rows.filter((row) => row.sharedByAll);
  const visibleRows = showShared ? [...differing, ...shared] : differing;

  const contactHref = support?.supportPhone
    ? `https://wa.me/${support.supportPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Hi, this is ${user?.shopName || 'our shop'}. We'd like to talk about our package.`
      )}`
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft size={15} />
          Back to the app
        </Link>

        <header className="mb-7">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Packages</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {currentPlanName
              ? <>Your shop is on <strong className="font-semibold text-slate-900">{currentPlanName}</strong>. Here is what each package includes.</>
              : <>Here is what each package includes.</>}
          </p>
        </header>

        {/* ---------------------------------------------------------- cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-5 ${
                  isCurrent ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-200 shadow-sm'
                }`}
              >
                {isCurrent ? (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                    Your package
                  </span>
                ) : null}

                <h2 className="text-lg font-semibold text-slate-900">{plan.label}</h2>

                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">
                    {currency} {plan.renewalPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500">
                    /{plan.billingCycle === 'YEARLY' ? 'year' : 'month'}
                  </span>
                </p>

                {plan.description ? (
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{plan.description}</p>
                ) : null}

                <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Sparkles size={14} className="shrink-0 text-blue-500" />
                    {plan.enabledModuleCount} of {plan.totalModuleCount} features
                  </li>
                  <li className="flex items-center gap-2">
                    <Building2 size={14} className="shrink-0 text-slate-400" />
                    {plan.maxBranches} {plan.maxBranches === 1 ? 'branch' : 'branches'}
                  </li>
                  {plan.trialDays > 0 ? (
                    <li className="flex items-center gap-2">
                      <Clock size={14} className="shrink-0 text-slate-400" />
                      {plan.trialDays}-day free trial
                    </li>
                  ) : null}
                </ul>

                <div className="mt-auto pt-5">
                  {isCurrent ? (
                    <div className="rounded-lg bg-slate-100 py-2.5 text-center text-sm font-medium text-slate-500">
                      Current package
                    </div>
                  ) : contactHref ? (
                    <a
                      href={contactHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg bg-blue-600 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Ask about {plan.label}
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* ----------------------------------------------------- comparison */}
        {visibleRows.length ? (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">What each package includes</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {showShared
                    ? `All ${rows.length} features`
                    : `The ${differing.length} features that differ · ${shared.length} are in every package`}
                </p>
              </div>
              {shared.length ? (
                <button
                  type="button"
                  onClick={() => setShowShared((current) => !current)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {showShared ? 'Show only differences' : 'Show everything'}
                </button>
              ) : null}
            </header>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        className={`px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide ${
                          plan.name === currentPlanName ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
                        }`}
                      >
                        {plan.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => (
                    <tr key={row.key} className={row.sharedByAll ? 'bg-slate-50/40' : undefined}>
                      <td className="px-5 py-2.5">
                        <span className="font-medium text-slate-800">{row.name}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                          {row.description}
                        </span>
                      </td>
                      {row.included.map((included, index) => (
                        <td
                          key={plans[index].id}
                          className={`px-3 py-2.5 text-center ${
                            plans[index].name === currentPlanName ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          {included ? (
                            <Check size={16} className="mx-auto text-emerald-600" />
                          ) : (
                            <Minus size={16} className="mx-auto text-slate-300" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* -------------------------------------------------------- contact */}
        {support?.supportPhone || support?.supportEmail ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Want to change your package?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Talk to {support?.platformName || 'us'} and we&apos;ll set it up for your shop.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {contactHref ? (
                <a
                  href={contactHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <MessageCircle size={15} />
                  WhatsApp {support.supportPhone}
                </a>
              ) : null}
              {support?.supportEmail ? (
                <a
                  href={`mailto:${support.supportEmail}?subject=${encodeURIComponent(
                    `Package change — ${user?.shopName || 'shop'}`
                  )}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Mail size={15} />
                  {support.supportEmail}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default SubscriptionPage;
