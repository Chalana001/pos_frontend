import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Clock, User, Store } from "lucide-react";
import { shiftsAPI } from "../api/shifts.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { calculateExpectedCash, nonCashTotals } from "../utils/shiftCash";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ShiftCloseDialog from "../components/shifts/ShiftCloseDialog";

const Shifts = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const { activeShift, loadingShift, refreshShift } = useShift();

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  useEffect(() => {
    refreshShift?.();
  }, [refreshShift]);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedShiftToClose, setSelectedShiftToClose] = useState(null); 

  const [openingCash, setOpeningCash] = useState("");
  const [openingNote, setOpeningNote] = useState("");

  const handleOpenClick = async () => {
    if (isAdmin) {
      if (!selectedBranchId) {
        toast.error("Please select a branch first");
        return;
      }
    }
    setOpeningNote("");
    setShowOpenModal(true);
  };

  const shiftsList = useMemo(() => {
    if (!activeShift) return [];
    const list = Array.isArray(activeShift) ? [...activeShift] : [activeShift];
    return list.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  }, [activeShift]);

  const hasOpenShift = shiftsList.length > 0;

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        openingCash: parseFloat(openingCash), 
        note: openingNote.trim(),
      };

      if (isAdmin) {
        if (!selectedBranchId) return toast.error("Please select a branch");
        await shiftsAPI.openByBranch(selectedBranchId, payload);
      } else {
        await shiftsAPI.openMine(payload);
      }
      toast.success("Shift opened successfully");
      setShowOpenModal(false);
      setOpeningCash("");
      setOpeningNote("");
      refreshShift();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Failed to open shift";
      toast.error(errorMessage);
    }
  };

  const handleCloseShift = async (shiftId, payload) => {
    // The dialog supplies the payload; the authorization split (cashier closes
    // their own shift vs admin closes by id) stays here, where it has always
    // lived, so no existing rule changes.
    if (isAdmin) {
      await shiftsAPI.closeById(shiftId, payload);
    } else {
      await shiftsAPI.closeMine(payload);
    }
  };

  const handleShiftClosed = () => {
    setShowCloseModal(false);
    setSelectedShiftToClose(null);
    refreshShift();
  };

  if (loadingShift) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading shift data..." />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex items-center justify-between" style={{ animationDelay: "40ms" }}>
        <h1 className="text-xl lg:text-3xl font-bold text-slate-800">Shift Management</h1>
        <Button onClick={handleOpenClick} variant="success">
          <Clock size={20} className="mr-2" />
          <span className="hidden sm:inline">Open New Shift</span>
          <span className="sm:hidden">New Shift</span>
        </Button>
      </div>

      {/* BODY */}
      {!hasOpenShift ? (
        <Card className="ops-alert-card" style={{ animationDelay: "90ms" }}>
          <div className="text-center py-12">
            <Clock size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Active Shift</h3>
            <p className="text-slate-600 mb-6">
              {isAdmin ? "Select branch and open a shift" : "Open a shift to start accepting orders"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {shiftsList.map((shift) => (
            <div
              key={shift.id}
              className="ops-audit-card border-b pb-8 last:border-0"
              style={{ animationDelay: `${110 + Math.min(shiftsList.indexOf(shift), 5) * 45}ms` }}
            >
              
              {/* ✅ 🔴 වෙනස් කරපු Cashier & Branch Info කෑල්ල */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {/* Cashier Name (ID එක වෙනුවට නම පෙන්නනවා) */}
                  <div className="flex items-center gap-2 bg-accent-soft px-3 py-2 rounded-lg w-fit border border-slate-200">
                    <User size={16} className="text-accent" />
                    <span className="font-semibold text-sm text-slate-800">
                      Cashier: {shift.cashierName || `User ID ${shift.cashierUserId}`}
                    </span>
                  </div>

                  {/* Branch Name (All Branches (0) තෝරලා තියෙද්දි විතරක් පෙන්නනවා) */}
                  {selectedBranchId === 0 && (
                    <div className="flex items-center gap-2 bg-info-soft px-3 py-2 rounded-lg w-fit border border-info-border">
                      <Store size={16} className="text-info" />
                      <span className="font-semibold text-sm text-info">
                        {shift.branchName || `Branch ${shift.branchId}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Cards Grid */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">

                {/* 1. Status & Time */}
                <Card className="ops-summary-card shell-panel shell-panel-hover flex flex-col justify-center" style={{ animationDelay: "150ms" }}>
                  <h3 className="text-xs lg:text-sm font-medium text-slate-600 mb-2">Status & Time</h3>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1 lg:gap-0">
                    <span className="w-fit px-2 py-1 rounded text-xs font-bold bg-success-soft text-success uppercase">
                      {shift.status}
                    </span>
                    <p className="text-xs text-slate-500">{formatDateTime(shift.openedAt)}</p>
                  </div>
                </Card>

                {/* 2. Opening Cash */}
                <Card className="ops-summary-card shell-panel shell-panel-hover flex flex-col justify-center" style={{ animationDelay: "190ms" }}>
                  <h3 className="text-xs lg:text-sm font-medium text-slate-600 mb-1 lg:mb-2">Opening Cash</h3>
                  <p className="text-sm lg:text-xl font-bold text-slate-800">{formatCurrency(shift.openingCash)}</p>
                </Card>

                {/* 3. Net Cash */}
                <Card className="ops-summary-card shell-panel shell-panel-hover flex flex-col justify-center" style={{ animationDelay: "230ms" }}>
                  <h3 className="text-xs lg:text-sm font-medium text-slate-600 mb-1 lg:mb-2">Net Cash (Sales - Exp)</h3>
                  <p className="text-sm lg:text-xl font-bold text-success">
                    {formatCurrency((shift.cashSales || 0) - (shift.totalExpenses || 0))}
                  </p>
                  {(() => {
                    const { cardSales, bankSales, cashCollections } = nonCashTotals(shift);
                    if (!cardSales && !bankSales && !cashCollections) return null;
                    return (
                      <p className="text-xs text-slate-500 mt-1">
                        Card {formatCurrency(cardSales)} · Bank {formatCurrency(bankSales)}
                        {cashCollections ? ` · Credit collected (cash) ${formatCurrency(cashCollections)}` : ""}
                      </p>
                    );
                  })()}
                </Card>

                {/* 4. Expected Drawer */}
                <Card className="ops-summary-card shell-panel shell-panel-hover border-slate-200 bg-accent-soft/30 flex flex-col justify-center" style={{ animationDelay: "270ms" }}>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-0">
                    <div>
                      <h3 className="text-xs lg:text-sm font-medium text-accent mb-1">Expected in Drawer</h3>
                      <p className="text-base lg:text-2xl font-bold text-slate-800">{formatCurrency(calculateExpectedCash(shift))}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="danger" 
                      className="w-full lg:w-auto mt-2 lg:mt-0"
                      onClick={() => {
                        setSelectedShiftToClose(shift);
                        setShowCloseModal(true);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </Card>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} title="Open New Shift">
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div className="page-section-enter" style={{ animationDelay: "60ms" }}>
            <label htmlFor="shifts-opening-cash-amount" className="block text-sm font-medium text-slate-700 mb-1">Opening Cash Amount *</label>
            <input id="shifts-opening-cash-amount"
              type="number"
              step="0.01"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="input"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>
          <div className="page-section-enter" style={{ animationDelay: "80ms" }}>
            <label htmlFor="shifts-opening-note" className="mb-1 block text-sm font-medium text-slate-700">Opening Note (optional)</label>
            <textarea
              id="shifts-opening-note"
              value={openingNote}
              onChange={(e) => setOpeningNote(e.target.value)}
              className="input min-h-20 resize-y"
              placeholder="Add a note about this shift"
              maxLength={255}
              rows={3}
            />
            <p className="mt-1 text-right text-xs text-slate-500">{openingNote.length}/255</p>
          </div>
          <div className="page-section-enter flex gap-2" style={{ animationDelay: "100ms" }}>
            <Button type="submit" className="flex-1">Open Shift</Button>
            <Button type="button" variant="secondary" onClick={() => setShowOpenModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ShiftCloseDialog
        isOpen={showCloseModal}
        onClose={() => {
          setShowCloseModal(false);
          setSelectedShiftToClose(null);
        }}
        shift={isAdmin ? selectedShiftToClose : activeShift}
        closeShift={handleCloseShift}
        onClosed={handleShiftClosed}
      />
    </div>
  );
};

export default Shifts;
