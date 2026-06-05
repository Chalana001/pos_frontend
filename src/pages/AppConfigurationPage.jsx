import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Building2, ChefHat, FileText, Printer, ReceiptText, Save, Scale, Settings2, ShieldCheck, ShieldPlus, Table2, Ticket, Users, Wrench } from 'lucide-react';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import CustomSelect from '../components/common/CustomSelect';
import { useAppConfiguration } from '../context/AppConfigurationContext';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { getConfigurableFeatureAvailability, hasPlanFeature } from '../utils/subscriptionFeatures';

const featureDefinitions = [
  {
    key: 'recipeItemsEnabled',
    label: 'Recipe Items',
    description: 'Show recipe/food items and recipe setup in item management.',
    icon: ChefHat,
  },
  {
    key: 'weightItemsEnabled',
    label: 'Weight Items',
    description: 'Show KG/G item type and weighted selling flow.',
    icon: Scale,
  },
  {
    key: 'servicesEnabled',
    label: 'Services',
    description: 'Show non-stock service items such as delivery or labour charges.',
    icon: Wrench,
  },
  {
    key: 'tableManagementEnabled',
    label: 'Table Management',
    description: 'Show dining-table setup and table records.',
    icon: Table2,
  },
  {
    key: 'dineInEnabled',
    label: 'Dine-In',
    description: 'Show dine-in mode in POS and allow table-based sales.',
    icon: Table2,
  },
];

const stockOverrideRoleDefinitions = [
  {
    key: 'adminStockOverrideAllowed',
    label: 'Admin',
    description: 'Admins can confirm POS stock override when shortage handling allows it.',
  },
  {
    key: 'managerStockOverrideAllowed',
    label: 'Manager',
    description: 'Managers can confirm POS stock override from assigned branches.',
  },
  {
    key: 'cashierStockOverrideAllowed',
    label: 'Cashier',
    description: 'Cashiers can confirm zero or low stock sales without manager login.',
  },
];

const warrantyRoleDefinitions = [
  {
    key: 'adminWarrantyAllowed',
    label: 'Admin',
    description: 'Admins can add warranty coverage while creating sales.',
  },
  {
    key: 'managerWarrantyAllowed',
    label: 'Manager',
    description: 'Managers can add warranty coverage from POS and table drafts.',
  },
  {
    key: 'cashierWarrantyAllowed',
    label: 'Cashier',
    description: 'Cashiers can select warranty periods during checkout.',
  },
];

const AppConfigurationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branches, selectedBranchId } = useBranch();
  const { configuration, loading, saveConfiguration, activeBranchId } = useAppConfiguration();
  const [form, setForm] = useState(configuration);
  const [saving, setSaving] = useState(false);
  const featureAvailability = useMemo(
    () => getConfigurableFeatureAvailability(user?.planName),
    [user?.planName]
  );

  React.useEffect(() => {
    setForm(configuration);
  }, [configuration]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => Number(branch.id) === Number(activeBranchId || selectedBranchId)) || null,
    [activeBranchId, branches, selectedBranchId]
  );
  const branchSelectionRequired = user?.role === 'ADMIN' && !activeBranchId;

  const quickLinks = useMemo(() => [
    {
      label: 'Branch Management',
      description: 'Create branches, logos, and branch contact details.',
      path: '/branches',
      icon: Building2,
      visible: user?.role === 'ADMIN',
    },
    {
      label: 'User Management',
      description: 'Add users, reset passwords, and assign branches.',
      path: '/users',
      icon: Users,
      visible: user?.role === 'ADMIN' && hasPlanFeature(user?.planName, 'USER_MANAGEMENT'),
    },
    {
      label: 'Receipt Design',
      description: 'Thermal, KOT, and full invoice print layout settings.',
      path: '/receipt-settings',
      icon: FileText,
      visible: user?.role === 'ADMIN',
    },
    {
      label: 'Table Management',
      description: 'Add and maintain branch-wise dining tables for dine-in sales.',
      path: '/dining-tables',
      icon: Table2,
      visible:
        user?.role === 'ADMIN'
        && hasPlanFeature(user?.planName, 'DINING_TABLES')
        && configuration.tableManagementEnabled,
    },
    {
      label: 'Warranty Settings',
      description: 'Create reusable warranty periods for POS sales.',
      path: '/warranties/settings',
      icon: ShieldCheck,
      visible: user?.role === 'ADMIN' || user?.role === 'MANAGER',
    },
    {
      label: 'Expense Types',
      description: 'Maintain tenant expense names and profit-report treatment.',
      path: '/expenses/settings',
      icon: ReceiptText,
      visible: hasPlanFeature(user?.planName, 'FINANCIALS'),
    },
  ].filter((link) => link.visible), [configuration.tableManagementEnabled, user?.planName, user?.role]);

  const updateField = (key, checked) => {
    setForm((prev) => {
      const next = { ...prev, [key]: checked };
      if (key === 'tableManagementEnabled' && !checked) {
        next.dineInEnabled = false;
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveConfiguration(form);
      toast.success('App configuration saved');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to save app configuration');
    } finally {
      setSaving(false);
    }
  };

  const categoryModeOptions = [
    {
      value: 'MAIN_AND_SUB',
      label: 'Main + Sub',
      description: 'Use parent categories with separate sub categories for each item.',
    },
    {
      value: 'SINGLE_CATEGORY',
      label: 'Single Category',
      description: 'Show one category selector. Categories are stored under a default parent.',
    },
  ];

  const stockOverrideModeOptions = [
    {
      value: 'MANAGER_OVERRIDE',
      label: 'Require Confirmation',
      description: 'Warn on shortage and continue only after a permitted role confirms.',
    },
    {
      value: 'BLOCK',
      label: 'Block Shortages',
      description: 'Stop checkout when normal stock or recipe ingredients are insufficient.',
    },
    {
      value: 'ALWAYS_ALLOW',
      label: 'Always Allow',
      description: 'Allow stock override mode, still limited by the role permissions below.',
    },
  ];

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" style={{ animationDelay: '40ms' }}>
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Settings2 size={15} />
            App Configuration
          </div>
          <h1 className="text-3xl font-bold text-slate-800">App Configuration</h1>
          <p className="mt-1 text-sm text-slate-500">
            {branchSelectionRequired
              ? 'Select a branch from the header to edit its operational settings.'
              : `Operational settings for ${selectedBranch?.name || `Branch #${activeBranchId}`}.`}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || loading || branchSelectionRequired}>
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">
        <Card className="admin-panel-card" title="Feature Visibility" style={{ animationDelay: '90ms' }}>
          <div className="mb-5 border-b border-slate-100 pb-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
              <div>
                <div className="font-semibold text-slate-800">Category Structure</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">Select how item categories appear across item, stock, and POS screens.</div>
              </div>
              <CustomSelect
                value={form.categoryMode || 'MAIN_AND_SUB'}
                onChange={(value) => updateField('categoryMode', value)}
                options={categoryModeOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-11 rounded-xl"
                placeholder="Select category structure"
              />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
              <div>
                <div className="font-semibold text-slate-800">Stock Shortage Handling</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">Control whether POS can continue when item stock or recipe ingredients are short.</div>
              </div>
              <CustomSelect
                value={form.stockOverrideMode || 'MANAGER_OVERRIDE'}
                onChange={(value) => updateField('stockOverrideMode', value)}
                options={stockOverrideModeOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-11 rounded-xl"
                placeholder="Select stock handling"
              />
            </div>

            <div className="mt-5">
              <div className="font-semibold text-slate-800">Stock Override Permissions</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">Choose which roles can confirm a sale that will make stock negative.</div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {stockOverrideRoleDefinitions.map((role) => {
                  const disabled = form.stockOverrideMode === 'BLOCK';
                  return (
                    <label
                      key={role.key}
                      className={`flex h-full items-start justify-between gap-3 rounded-xl border px-4 py-4 ${
                        disabled ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{role.label}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{role.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!form[role.key]}
                        disabled={disabled}
                        onChange={(event) => updateField(role.key, event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {featureDefinitions.filter((feature) => featureAvailability[feature.key]).map((feature) => {
              const Icon = feature.icon;
              const disabled = feature.key === 'dineInEnabled' && !form.tableManagementEnabled;

              return (
                <label
                  key={feature.key}
                  className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-4 ${
                    disabled ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{feature.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{feature.description}</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form[feature.key]}
                    disabled={disabled}
                    onChange={(event) => updateField(feature.key, event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
                  <Ticket size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Kitchen Order Tickets</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">Allow KOT item tagging, manual KOT printing, and automatic KOT after takeaway payment.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={!!form.kotEnabled}
                onChange={(event) => updateField('kotEnabled', event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
                  <Printer size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Print Receipt After Checkout</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">When disabled, use Print Bill before checkout and skip the automatic paid receipt print.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.printReceiptAfterCheckout !== false}
                onChange={(event) => updateField('printReceiptAfterCheckout', event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
                  <ShieldPlus size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Sales Warranty</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">Show warranty selection in POS sales. Existing warranty records remain visible.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={!!form.warrantyEnabled}
                onChange={(event) => updateField('warrantyEnabled', event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {warrantyRoleDefinitions.map((role) => {
                const disabled = !form.warrantyEnabled;
                return (
                  <label
                    key={role.key}
                    className={`flex h-full items-start justify-between gap-3 rounded-xl border px-4 py-4 ${
                      disabled ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{role.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{role.description}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!form[role.key]}
                      disabled={disabled}
                      onChange={(event) => updateField(role.key, event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="admin-panel-card" title="Management" style={{ animationDelay: '130ms' }}>
          <div className="space-y-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{link.label}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{link.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AppConfigurationPage;
