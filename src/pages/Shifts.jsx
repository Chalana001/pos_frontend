import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Clock, User } from "lucide-react"; 
import { shiftsAPI } from "../api/shifts.api";
import { usersAPI } from "../api/users.api"; 
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import LoadingSpinner from "../components/common/LoadingSpinner";

const Shifts = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const { activeShift, loadingShift, refreshShift } = useShift();

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedShiftToClose, setSelectedShiftToClose] = useState(null); 

  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");

  const [branchUsers, setBranchUsers] = useState([]);
  const [assignedCashierId, setAssignedCashierId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  const handleOpenClick = async () => {
    setShowOpenModal(true);
    
    if (isAdmin) {
      if (!selectedBranchId) {
        toast.error("Please select a branch first");
        setShowOpenModal(false);
        return;
      }
      
      setLoadingUsers(true);
      try {
        const response = await usersAPI.getUsersByBranch(selectedBranchId);
        setBranchUsers(response.data || []);
        
        // අලුත් වෙනස: Default විදියට 0 යවනවා (Myself)
        setAssignedCashierId("0"); 
      } catch (error) {
        toast.error("Failed to load cashiers");
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const shiftsList = useMemo(() => {
    if (!activeShift) return [];
    return Array.isArray(activeShift) ? activeShift : [activeShift];
  }, [activeShift]);

  const hasOpenShift = shiftsList.length > 0;

  const calculateExpectedCash = (shift) => {
    if (!shift) return 0;
    return (
      (shift.openingCash || 0) +
      (shift.cashSales || 0) -
      (shift.totalExpenses || 0) -
      (shift.totalCashDrops || 0)
    );
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        openingCash: parseFloat(openingCash), 
        note: "",
        // අලුත් වෙනස: String "0" එක Number එකක් විදියට parse කරලා යවනවා
        ...(isAdmin && { assignedCashierId: parseInt(assignedCashierId) }) 
      };

      if (isAdmin) {
        if (!selectedBranchId) return toast.error("Please select a branch");
        // ID එක string empty ("") නම් විතරක් error එක පෙන්නනවා (0 ආවොත් පාස් වෙනවා)
        if (assignedCashierId === "") return toast.error("Please select a cashier");
        await shiftsAPI.openByBranch(selectedBranchId, payload);
      } else {
        await shiftsAPI.openMine(payload);
      }
      toast.success("Shift opened successfully");
      setShowOpenModal(false);
      setOpeningCash("");
      refreshShift();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Failed to open shift";
      toast.error(errorMessage);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    const shiftId = isAdmin ? selectedShiftToClose?.id : activeShift?.id;

    if (!shiftId) {
      toast.error("No active shift selected");
      return;
    }

    try {
      const payload = { countedCash: parseFloat(countedCash), note: "" };
      if (isAdmin) {
        await shiftsAPI.closeById(shiftId, payload);
      } else {
        await shiftsAPI.closeMine(payload);
      }
      toast.success("Shift closed successfully");
      setShowCloseModal(false);
      setCountedCash("");
      setSelectedShiftToClose(null);
      refreshShift();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Failed to close shift";
      toast.error(errorMessage);
    }
  };

  if (loadingShift) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading shift data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Shift Management</h1>
        <Button onClick={handleOpenClick} variant="success">
          <Clock size={20} className="mr-2" />
          Open New Shift
        </Button>
      </div>

      {/* BODY */}
      {!hasOpenShift ? (
        <Card>
          <div className="text-center py-12">
            <Clock size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Active Shift</h3>
            <p className="text-slate-600 mb-6">
              {isAdmin ? "Select branch and open a shift" : "Open a shift to start accepting orders"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {shiftsList.map((shift) => (
            <div key={shift.id} className="border-b pb-8 last:border-0">
              {isAdmin && (
                <div className="flex items-center gap-2 mb-4 bg-blue-50 p-2 rounded-lg w-fit">
                  <User size={18} className="text-blue-600" />
                  <span className="font-semibold text-blue-800">
                    Cashier ID: {shift.cashierUserId}
                  </span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Status & Time</h3>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800 uppercase">
                      {shift.status}
                    </span>
                    <p className="text-xs text-slate-500">{formatDateTime(shift.openedAt)}</p>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Opening Cash</h3>
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(shift.openingCash)}</p>
                </Card>

                <Card>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Net Cash (Sales - Exp)</h3>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency((shift.cashSales || 0) - (shift.totalExpenses || 0))}
                  </p>
                </Card>

                <Card className="border-blue-200 bg-blue-50/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-blue-700 mb-1">Expected in Drawer</h3>
                      <p className="text-2xl font-bold text-blue-800">{formatCurrency(calculateExpectedCash(shift))}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="danger" 
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

      {/* OPEN SHIFT MODAL */}
      <Modal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} title="Open New Shift">
        <form onSubmit={handleOpenShift} className="space-y-4">
          
          {/* Admin ට විතරක් පේන Dropdown එක */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Cashier *</label>
              {loadingUsers ? (
                <div className="text-sm text-slate-500 mb-2">Loading cashiers...</div>
              ) : (
                <select
                  value={assignedCashierId}
                  onChange={(e) => setAssignedCashierId(e.target.value)}
                  className="input" 
                  required
                >
                  {/* අලුත් වෙනස: මෙතන value එක 0 කියලා දුන්නා */}
                  <option value="0">Myself ({user?.username})</option>
                  {branchUsers
                    .filter(u => u.id !== user?.id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.role})
                      </option>
                    ))
                  }
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Cash Amount *</label>
            <input
              type="number"
              step="0.01"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="input"
              placeholder="0.00"
              required
              autoFocus={!isAdmin} 
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isAdmin && loadingUsers}>Open Shift</Button>
            <Button type="button" variant="secondary" onClick={() => setShowOpenModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* CLOSE SHIFT MODAL */}
      <Modal 
        isOpen={showCloseModal} 
        onClose={() => {
          setShowCloseModal(false);
          setSelectedShiftToClose(null);
        }} 
        title={`Close Shift ${isAdmin ? `(Cashier: ${selectedShiftToClose?.cashierUserId})` : ''}`}
      >
        <form onSubmit={handleCloseShift} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Expected Cash:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(calculateExpectedCash(isAdmin ? selectedShiftToClose : activeShift))}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Counted Cash Amount *</label>
            <input
              type="number"
              step="0.01"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="input"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {countedCash && (
            <div className={`p-4 rounded-lg ${parseFloat(countedCash) === calculateExpectedCash(isAdmin ? selectedShiftToClose : activeShift) ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
              <p className="text-sm font-medium">
                Difference: {formatCurrency(Math.abs(parseFloat(countedCash) - calculateExpectedCash(isAdmin ? selectedShiftToClose : activeShift)))}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" variant="danger" className="flex-1">Confirm Close</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCloseModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shifts;