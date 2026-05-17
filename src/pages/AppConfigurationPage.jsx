import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Building2, ChefHat, FileText, Save, Scale, Settings2, ShieldCheck, Table2, Users, Wrench } from 'lucide-react';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useAppConfiguration } from '../context/AppConfigurationContext';
import { useAuth } from '../context/AuthContext';
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

const AppConfigurationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { configuration, loading, saveConfiguration } = useAppConfiguration();
  const [form, setForm] = useState(configuration);
  const [saving, setSaving] = useState(false);
  const featureAvailability = useMemo(
    () => getConfigurableFeatureAvailability(user?.planName),
    [user?.planName]
  );

  React.useEffect(() => {
    setForm(configuration);
  }, [configuration]);

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
            Keep shop-level modules and operational settings in one place.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || loading}>
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">
        <Card className="admin-panel-card" title="Feature Visibility" style={{ animationDelay: '90ms' }}>
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
