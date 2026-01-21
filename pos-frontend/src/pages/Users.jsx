import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, UserPlus, Shield, KeyRound, ToggleLeft, ToggleRight } from "lucide-react";

import { usersAPI } from "../api/users.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";

import Card from "../components/common/Card";
import Table from "../components/common/Table";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";

// ✅ simple modal (if you already have Modal component, use it instead)
const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-bold text-lg">{title}</h3>
                    <button onClick={onClose} className="text-slate-600 hover:text-slate-900">✕</button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

const Users = () => {
    const { user } = useAuth();
    const { branches } = useBranch(); // for display / assign branch
    const { selectedBranchId } = useBranch();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");

    // Filters
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL / ENABLED / DISABLED

    // Modals
    const [createOpen, setCreateOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [assignBranchOpen, setAssignBranchOpen] = useState(false);

    const [selectedUser, setSelectedUser] = useState(null);

    // Forms
    const [createForm, setCreateForm] = useState({
        username: "",
        password: "",
        role: "CASHIER",
        branchId: "",
    });

    const [resetForm, setResetForm] = useState({
        newPassword: "",
    });

    const [assignForm, setAssignForm] = useState({
        branchId: "",
    });

    const isAdmin = user?.role === "ADMIN";

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await usersAPI.list();
            setUsers(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAdmin) return;
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const branchNameById = useMemo(() => {
        const map = new Map();
        (branches || []).forEach((b) => map.set(Number(b.id), b.name));
        return map;
    }, [branches]);

    const filteredUsers = useMemo(() => {
        let data = [...users];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter((u) => u.username?.toLowerCase().includes(q));
        }

        if (roleFilter !== "ALL") {
            data = data.filter((u) => u.role === roleFilter);
        }

        if (statusFilter !== "ALL") {
            const enabled = statusFilter === "ENABLED";
            data = data.filter((u) => u.enabled === enabled);
        }

        // ✅ main branch dropdown filter (selectedBranchId)
        if (selectedBranchId !== 0) {
            data = data.filter((u) =>
                u.role === "ADMIN" || Number(u.branchId) === Number(selectedBranchId)
            );
        }

        // sort: active first, then admin/manager/cashier
        data.sort((a, b) => Number(b.enabled) - Number(a.enabled));

        return data;
    }, [users, searchQuery, roleFilter, statusFilter, selectedBranchId]);

    // ---------- Actions ----------
    const handleCreateUser = async () => {
        if (!createForm.username || !createForm.password || !createForm.role) {
            toast.error("Please fill username, password and role");
            return;
        }

        const payload = {
            username: createForm.username.trim(),
            password: createForm.password,
            role: createForm.role,
            branchId: createForm.branchId ? Number(createForm.branchId) : null,
        };

        try {
            await usersAPI.create(payload);
            toast.success("User created");
            setCreateOpen(false);
            setCreateForm({ username: "", password: "", role: "CASHIER", branchId: "" });
            fetchUsers();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to create user");
        }
    };

    const toggleUserStatus = async (u) => {
        try {
            await usersAPI.updateStatus(u.id, { enabled: !u.enabled });
            toast.success("User status updated");
            fetchUsers();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const openReset = (u) => {
        setSelectedUser(u);
        setResetForm({ newPassword: "" });
        setResetOpen(true);
    };

    const handleResetPassword = async () => {
        if (!selectedUser) return;
        if (!resetForm.newPassword || resetForm.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        try {
            await usersAPI.resetPassword(selectedUser.id, {
                newPassword: resetForm.newPassword,
            });
            toast.success("Password reset successfully");
            setResetOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to reset password");
        }
    };

    const openAssignBranch = (u) => {
        setSelectedUser(u);
        setAssignForm({ branchId: u.branchId ?? "" });
        setAssignBranchOpen(true);
    };

    const handleAssignBranch = async () => {
        if (!selectedUser) return;
        if (!assignForm.branchId) {
            toast.error("Select a branch");
            return;
        }

        try {
            await usersAPI.assignBranch(selectedUser.id, {
                branchId: Number(assignForm.branchId),
            });
            toast.success("Branch assigned");
            setAssignBranchOpen(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            toast.error("Failed to assign branch");
        }
    };

    // ---------- Table ----------
    const columns = [
        { header: "ID", accessor: "id" },
        { header: "Username", accessor: "username" },
        {
            header: "Role",
            render: (u) => (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : u.role === "MANAGER"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                >
                    {u.role}
                </span>
            ),
        },
        {
            header: "Branch",
            render: (u) => (
                <span className="text-sm text-slate-700">
                    {u.branchId ? branchNameById.get(Number(u.branchId)) || `Branch ${u.branchId}` : "-"}
                </span>
            ),
        },
        {
            header: "Status",
            render: (u) => (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${u.enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                >
                    {u.enabled ? "Enabled" : "Disabled"}
                </span>
            ),
        },
        {
            header: "Actions",
            render: (u) => {
                const isAdminUser = u.role === "ADMIN";

                return (
                    <div className="flex flex-wrap gap-2">
                        {/* ✅ Enable/Disable */}
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isAdminUser} // ✅ prevent disabling ADMIN
                            onClick={() => toggleUserStatus(u)}
                            title={isAdminUser ? "Admin cannot be disabled" : ""}
                        >
                            {u.enabled ? (
                                <>
                                    <ToggleRight size={16} className="mr-1" /> Disable
                                </>
                            ) : (
                                <>
                                    <ToggleLeft size={16} className="mr-1" /> Enable
                                </>
                            )}
                        </Button>

                        {/* ✅ Assign branch */}
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={isAdminUser} // ✅ prevent assigning branch to ADMIN
                            onClick={() => openAssignBranch(u)}
                            title={isAdminUser ? "Admin cannot be assigned to a branch" : ""}
                        >
                            <Shield size={16} className="mr-1" />
                            Assign Branch
                        </Button>

                        {/* ✅ Reset password (allowed) */}
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openReset(u)}
                        >
                            <KeyRound size={16} className="mr-1" />
                            Reset Password
                        </Button>
                    </div>
                );
            },
        },
    ];

    // ---------- Non Admin ----------
    if (!isAdmin) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
                <Card>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            ⚠️ Only ADMIN can access this page.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
                <Button onClick={() => setCreateOpen(true)}>
                    <UserPlus size={18} className="mr-2" />
                    Add User
                </Button>
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    {/* Search */}
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search by username..."
                        />
                    </div>

                    {/* Role filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="input"
                    >
                        <option value="ALL">All Roles</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="CASHIER">CASHIER</option>
                    </select>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input"
                    >
                        <option value="ALL">All Status</option>
                        <option value="ENABLED">Enabled</option>
                        <option value="DISABLED">Disabled</option>
                    </select>
                </div>

                {loading ? (
                    <div className="py-12">
                        <LoadingSpinner size="lg" text="Loading users..." />
                    </div>
                ) : (
                    <Table columns={columns} data={filteredUsers} />
                )}
            </Card>

            {/* Create Modal */}
            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Username</label>
                        <input
                            className="input mt-1"
                            value={createForm.username}
                            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                            placeholder="username"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <input
                            type="password"
                            className="input mt-1"
                            value={createForm.password}
                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            placeholder="password"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700">Role</label>
                        <select
                            className="input mt-1"
                            value={createForm.role}
                            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                        >
                            <option value="CASHIER">CASHIER</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700">Branch</label>
                        <select
                            className="input mt-1"
                            value={createForm.branchId}
                            onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                        >
                            <option value="">Select branch</option>
                            {(branches || [])
                                .filter((b) => Number(b.id) !== 0)
                                .map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>Create</Button>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                    Note: Branch is required for CASHIER/MANAGER.
                </p>
            </Modal>

            {/* Assign Branch Modal */}
            <Modal
                open={assignBranchOpen}
                onClose={() => setAssignBranchOpen(false)}
                title={`Assign Branch - ${selectedUser?.username || ""}`}
            >
                <div>
                    <label className="text-sm font-medium text-slate-700">Branch</label>
                    <select
                        className="input mt-1"
                        value={assignForm.branchId}
                        onChange={(e) => setAssignForm({ branchId: e.target.value })}
                    >
                        <option value="">Select branch</option>
                        {(branches || [])
                            .filter((b) => Number(b.id) !== 0)
                            .map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                    </select>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setAssignBranchOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssignBranch}>Assign</Button>
                </div>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                title={`Reset Password - ${selectedUser?.username || ""}`}
            >
                <div>
                    <label className="text-sm font-medium text-slate-700">New Password</label>
                    <input
                        type="password"
                        className="input mt-1"
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm({ newPassword: e.target.value })}
                        placeholder="new password"
                    />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setResetOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleResetPassword}>Reset</Button>
                </div>
            </Modal>
        </div>
    );
};

export default Users;
