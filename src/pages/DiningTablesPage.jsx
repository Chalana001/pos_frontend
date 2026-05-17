import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, Pencil, Plus, Table2, Trash2 } from 'lucide-react';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import CustomSelect from '../components/common/CustomSelect';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { diningTablesAPI } from '../api/diningTables.api';
import { useAppConfiguration } from '../context/AppConfigurationContext';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { hasPlanFeature } from '../utils/subscriptionFeatures';

const INITIAL_TABLE_FORM = {
  id: null,
  tableName: '',
  status: 'AVAILABLE',
};

const tableStatusOptions = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
];

const DiningTablesPage = () => {
  const { user } = useAuth();
  const { branches, selectedBranchId } = useBranch();
  const { configuration } = useAppConfiguration();
  const branchOptions = useMemo(() => branches.filter((branch) => Number(branch.id) !== 0), [branches]);
  const branchSelectionRequired = !selectedBranchId || Number(selectedBranchId) === 0;
  const activeBranch = useMemo(
    () => branchOptions.find((branch) => Number(branch.id) === Number(selectedBranchId)) || null,
    [branchOptions, selectedBranchId]
  );
  const packageSupportsTables = hasPlanFeature(user?.planName, 'DINING_TABLES');
  const canManageTables = packageSupportsTables && configuration.tableManagementEnabled;

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [tableForm, setTableForm] = useState(INITIAL_TABLE_FORM);

  useEffect(() => {
    if (!canManageTables || branchSelectionRequired || !activeBranch?.id) {
      setTables([]);
      setTableForm(INITIAL_TABLE_FORM);
      setLoading(false);
      return;
    }

    const loadTables = async () => {
      try {
        setLoading(true);
        const response = await diningTablesAPI.listByBranch(activeBranch.id);
        setTables(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load dining tables');
        setTables([]);
      } finally {
        setLoading(false);
      }
    };

    loadTables();
  }, [activeBranch, branchSelectionRequired, canManageTables]);

  const resetForm = () => {
    setTableForm(INITIAL_TABLE_FORM);
  };

  const refreshTables = async () => {
    if (!activeBranch?.id) return;
    const response = await diningTablesAPI.listByBranch(activeBranch.id);
    setTables(Array.isArray(response.data) ? response.data : []);
  };

  const handleSave = async () => {
    if (!canManageTables) {
      toast.error(packageSupportsTables ? 'Table management is disabled in app configuration' : 'Tables are not available in this package');
      return;
    }
    if (branchSelectionRequired || !activeBranch?.id) {
      toast.error('Select a branch from the header first');
      return;
    }
    if (!tableForm.tableName.trim()) {
      toast.error('Table name is required');
      return;
    }

    try {
      setSaving(true);
      if (tableForm.id) {
        await diningTablesAPI.update(tableForm.id, {
          tableName: tableForm.tableName.trim(),
          status: tableForm.status,
        });
        toast.success('Dining table updated');
      } else {
        await diningTablesAPI.create({
          branchId: activeBranch.id,
          tableName: tableForm.tableName.trim(),
          status: tableForm.status,
        });
        toast.success('Dining table added');
      }

      await refreshTables();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to save dining table');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (table) => {
    setTableForm({
      id: table.id,
      tableName: table.tableName || '',
      status: table.status || 'AVAILABLE',
    });
  };

  const handleDelete = async (tableId) => {
    if (!activeBranch?.id) return;

    try {
      setDeletingId(tableId);
      await diningTablesAPI.remove(tableId);
      toast.success('Dining table deleted');
      await refreshTables();
      if (Number(tableForm.id) === Number(tableId)) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to delete dining table');
    } finally {
      setDeletingId(null);
    }
  };

  if (!branchOptions.length) {
    return (
      <div className="page-enter space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Table Management</h1>
          <p className="mt-1 text-sm text-slate-500">Add and maintain branch-wise dining tables used by dine-in sales.</p>
        </div>
        <Card>
          <div className="py-16 text-center text-slate-500">
            <Building2 className="mx-auto mb-3 opacity-40" size={34} />
            No branches available to configure.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" style={{ animationDelay: '40ms' }}>
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Table2 size={15} />
            Table Management
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Table Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add and maintain branch-wise dining tables used by dine-in sales.
          </p>
        </div>

        {tableForm.id ? (
          <Button variant="secondary" onClick={resetForm}>
            Cancel Edit
          </Button>
        ) : null}
      </div>

      {!packageSupportsTables ? (
        <Card className="ops-alert-card">
          <div className="py-16 text-center text-slate-500">
            <Table2 className="mx-auto mb-3 opacity-40" size={34} />
            Tables are not available in this package.
          </div>
        </Card>
      ) : !configuration.tableManagementEnabled ? (
        <Card className="ops-alert-card">
          <div className="py-16 text-center text-slate-500">
            <Table2 className="mx-auto mb-3 opacity-40" size={34} />
            Table management is disabled in App Configuration.
          </div>
        </Card>
      ) : branchSelectionRequired ? (
        <Card className="ops-alert-card">
          <div className="py-16 text-center text-slate-500">
            <Building2 className="mx-auto mb-3 opacity-40" size={34} />
            Select a specific branch from the header branch selector to manage its tables.
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <Card className="admin-panel-card" title="Add Table" style={{ animationDelay: '90ms' }}>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-700">Current Branch</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{activeBranch?.name || 'Branch not found'}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Table Name</label>
                <input
                  value={tableForm.tableName}
                  onChange={(event) => setTableForm((prev) => ({ ...prev, tableName: event.target.value }))}
                  placeholder="Table 01"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <CustomSelect
                  value={tableForm.status}
                  onChange={(value) => setTableForm((prev) => ({ ...prev, status: value }))}
                  options={tableStatusOptions}
                  valueKey="value"
                  labelKey="label"
                  className="mt-1"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Plus size={16} className="mr-2" />
                {saving ? 'Saving...' : tableForm.id ? 'Update Table' : 'Add Table'}
              </Button>
            </div>
          </Card>

          <Card className="admin-panel-card" title="Dining Tables" style={{ animationDelay: '130ms' }}>
            {loading ? (
              <div className="py-16">
                <LoadingSpinner text="Loading dining tables..." />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tables.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                    No dining tables added for this branch yet.
                  </div>
                ) : (
                  tables.map((table) => (
                    <div key={table.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{table.tableName}</div>
                          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                            table.status === 'OCCUPIED'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {table.status}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(table)}
                            className="rounded-lg bg-white p-2 text-slate-500 transition hover:text-blue-600"
                            title="Edit table"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(table.id)}
                            disabled={deletingId === table.id}
                            className="rounded-lg bg-white p-2 text-slate-500 transition hover:text-red-600 disabled:opacity-50"
                            title="Delete table"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default DiningTablesPage;
