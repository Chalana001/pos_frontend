import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { loyaltyAPI } from "../../api/loyalty.api";
import { formatCurrency } from "../../utils/formatters";

/**
 * Points at the till: what the customer has, and spending some of it on this sale.
 *
 * <p>Shows nothing at all unless there is a customer on the sale, the scheme is on, and they
 * have a balance — the cashier should not be offered a redemption the backend will refuse, and
 * a shop that does not run loyalty should never see this.
 *
 * <p>Points are settled by the server after promotions, so what is entered here is a request,
 * not a price. The value shown is the scheme's own arithmetic echoed back for the cashier to
 * read aloud; the amount actually taken off is whatever the sale comes back with.
 */
const LoyaltyPanel = ({ customerId, billTotal, points, setPoints, refreshKey, focusSearch }) => {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!customerId) {
      setAccount(null);
      setPoints(0);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await loyaltyAPI.account(customerId);
        if (!cancelled) setAccount(response.data);
      } catch (error) {
        // A loyalty lookup must never block a sale: no panel, sell as normal.
        console.error("Loyalty lookup failed", error);
        if (!cancelled) setAccount(null);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId, refreshKey, setPoints]);

  const maxSpendable = useMemo(() => {
    if (!account?.enabled || !account.pointsBalance) return 0;
    const perPoint = account.pointsBalance > 0 && Number(account.pointsValue) > 0
      ? Number(account.pointsValue) / account.pointsBalance
      : 0;
    if (perPoint <= 0) return account.pointsBalance;
    // Never offer more than the bill can absorb — the server would clamp it and the cashier
    // would be left explaining why fewer points came off than they typed.
    return Math.min(account.pointsBalance, Math.floor(Math.max(0, billTotal) / perPoint));
  }, [account, billTotal]);

  if (!customerId || !account?.enabled || account.pointsBalance <= 0) {
    return null;
  }

  const entered = Number(points) || 0;
  const perPoint = account.pointsBalance > 0 ? Number(account.pointsValue) / account.pointsBalance : 0;
  const enteredValue = entered > 0 ? entered * perPoint : 0;
  const belowMinimum = entered > 0 && entered < account.minRedemptionPoints;

  return (
    <div className="space-y-1.5 rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-bold text-violet-800">
          <Sparkles size={12} /> Points
          {account.tierName && <span className="rounded-full bg-violet-200 px-1.5 py-0.5 text-[10px]">{account.tierName}</span>}
        </span>
        <span className="text-violet-700">
          {account.pointsBalance} · worth {formatCurrency(account.pointsValue)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <input
          aria-label="Points to redeem"
          type="number"
          min="0"
          max={maxSpendable}
          value={points || ""}
          onChange={(event) => setPoints(Math.max(0, Math.min(maxSpendable, parseInt(event.target.value, 10) || 0)))}
          onBlur={focusSearch}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          placeholder="Redeem"
          className="w-24 rounded border border-violet-200 bg-white px-2 py-1 text-right font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="button"
          onClick={() => setPoints(maxSpendable)}
          disabled={maxSpendable <= 0}
          className="rounded bg-violet-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
        >
          Use max
        </button>
        {entered > 0 && (
          <span className="ml-auto text-xs font-black text-violet-800">-{formatCurrency(enteredValue)}</span>
        )}
      </div>

      {belowMinimum && (
        <p className="text-[11px] text-red-700">
          At least {account.minRedemptionPoints} points are needed to redeem.
        </p>
      )}
    </div>
  );
};

export default LoyaltyPanel;
