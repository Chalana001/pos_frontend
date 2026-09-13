import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { loyaltyAPI } from "../../api/loyalty.api";
import { formatCurrency } from "../../utils/formatters";

/**
 * Points at the till: what the customer has, and spending some of it on this sale.
 *
 * <p>Shows nothing at all unless there is a customer on the sale, the scheme is on, and they
 * have a balance, the cashier should not be offered a redemption the backend will refuse, and
 * a shop that does not run loyalty should never see this.
 *
 * <p>Points are settled by the server after promotions, so what is entered here is a request,
 * not a price. The value shown is the scheme's own arithmetic echoed back for the cashier to
 * read aloud; the amount actually taken off is whatever the sale comes back with.
 */
const LoyaltyPanel = ({ customerId, billTotal, points, setPoints, refreshKey, focusSearch, onValueChange }) => {
  const [account, setAccount] = useState(null);
  const reportedValue = useRef(0);

  useEffect(() => {
    // Points entered for one customer must not survive a switch to another: the balance is
    // different, and the sale would be refused at checkout with the number still on screen.
    setPoints(0);
    if (!customerId) {
      setAccount(null);
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

  // The scheme's own rate, from the server rather than inferred by dividing the balance.
  const perPoint = Number(account?.currencyPerPoint) > 0 ? Number(account.currencyPerPoint) : 0;

  /** What this sale can absorb: the bill, and the scheme's ceiling on how much of it. */
  const spendableCash = useMemo(() => {
    const bill = Math.max(0, Number(billTotal) || 0);
    const percent = Number(account?.maxRedemptionPercent);
    return percent > 0 ? Math.min(bill, (bill * percent) / 100) : bill;
  }, [account, billTotal]);

  const maxSpendable = useMemo(() => {
    if (!account?.enabled || !account.pointsBalance) return 0;
    if (perPoint <= 0) return account.pointsBalance;
    // Never offer more than the sale can absorb, the server would clamp it and the cashier
    // would be left explaining why fewer points came off than they typed.
    return Math.min(account.pointsBalance, Math.floor(spendableCash / perPoint));
  }, [account, perPoint, spendableCash]);

  const entered = Number(points) || 0;
  const belowMinimum = entered > 0 && entered < Number(account?.minRedemptionPoints || 0);
  // What the redemption is worth, priced exactly as quoteRedemption prices it: the points at
  // the scheme's rate, capped by what the sale can absorb. Below the scheme's minimum it is
  // worth nothing, because the server will refuse it rather than trim it.
  const enteredValue = entered <= 0 || belowMinimum
    ? 0
    : Math.round(Math.min(entered * perPoint, spendableCash) * 100) / 100;

  // The panel prices the redemption; the cart draws the total. Reporting it up is what makes
  // the Total on screen the total the customer actually pays.
  useEffect(() => {
    if (typeof onValueChange !== "function" || reportedValue.current === enteredValue) return;
    reportedValue.current = enteredValue;
    onValueChange(enteredValue);
  }, [enteredValue, onValueChange]);

  if (!customerId || !account?.enabled || account.pointsBalance <= 0) {
    return null;
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-bold text-violet-800">
          <Sparkles size={12} /> Points
          {account.tierName && <span className="rounded-full bg-violet-200 px-1.5 py-0.5 text-[10px]">{account.tierName}</span>}
        </span>
        <span className="text-violet-700">
          {account.pointsBalance}, worth {formatCurrency(account.pointsValue)}
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
