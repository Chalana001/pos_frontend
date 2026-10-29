import React from "react";
import { Coins } from "lucide-react";

import ShiftCashCountSettings from "../components/configuration/ShiftCashCountSettings";

const CashDenominationsSettingsPage = () => (
  <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <header>
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-success-soft p-3 text-success"><Coins size={22} /></span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cash Denominations</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the notes and coins available for cash counting across the shop.</p>
        </div>
      </div>
    </header>
    <ShiftCashCountSettings />
  </div>
);

export default CashDenominationsSettingsPage;
