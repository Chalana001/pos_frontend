/**
 * The one definition of "what should be in the drawer".
 *
 * Previously Shifts.jsx and ShiftDetailsPage.jsx each carried their own copy of
 * this formula (and a third partial variant for a summary card), which is how
 * two screens could disagree about the same shift. The server's shift.cashSales
 * is the incrementally maintained CASH ledger (card and bank live in their own
 * buckets and never enter the drawer), so this formula matches what the backend
 * computes at close time: same inputs, same order, same rounding.
 *
 * cashCollections (cash received settling old credit dues during the shift) is
 * real drawer money but is deliberately NOT folded into expected cash: it is
 * reported on the shift so the discrepancy is visible, not silently absorbed.
 */
export const calculateExpectedCash = (shift) => {
  if (!shift) return 0;
  return (
    (Number(shift.openingCash) || 0) +
    (Number(shift.cashSales) || 0) -
    (Number(shift.totalExpenses) || 0) -
    (Number(shift.totalCashDrops) || 0)
  );
};

/** Non-cash tender totals for display; both default to 0 on older shift records. */
export const nonCashTotals = (shift) => ({
  cardSales: Number(shift?.cardSales) || 0,
  bankSales: Number(shift?.bankSales) || 0,
  cashCollections: Number(shift?.cashCollections) || 0,
});
