import React from 'react';
import { Moon, Sun, SunMoon } from 'lucide-react';

import CustomSelect from '../common/CustomSelect';
import { useTheme } from '../../hooks/useTheme';
import { THEMES } from '../../utils/themePreference';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Light / Dark / System - one control, two forms.
 *
 * From lg up it is a dropdown shaped exactly like LanguageSelector, so it
 * reads as part of the header rather than something bolted on. Below lg the
 * other pills earn their width by shrinking, but this one cannot usefully
 * shrink - "System" does not truncate well in two languages - and hiding it
 * outright left phones and small tills with no way to switch theme at all.
 * So from sm to lg it becomes an icon button in the same 44px chrome as the
 * notification bell, stepping through the three themes in the dropdown's
 * own order. Below sm even 44px is too much - the smallest tills overflow -
 * so there the control moves into the user menu next to Language, and this
 * component renders nothing visible.
 */
const ORDER = [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM];

const ICONS = {
  [THEMES.LIGHT]: Sun,
  [THEMES.DARK]: Moon,
  [THEMES.SYSTEM]: SunMoon,
};

const ThemeSelector = ({ compact = false }) => {
  const [theme, setTheme] = useTheme();
  const { t } = useLanguage();

  const options = [
    { value: THEMES.LIGHT, label: t('Light') },
    { value: THEMES.DARK, label: t('Dark') },
    { value: THEMES.SYSTEM, label: t('System') },
  ];

  const Icon = ICONS[theme] ?? Sun;
  const labelOf = (value) => options.find((o) => o.value === value)?.label ?? value;
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? THEMES.LIGHT;

  return (
    <>
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`${t('Theme')}: ${labelOf(theme)}`}
        title={`${t('Theme')}: ${labelOf(theme)}`}
        className="shell-panel-hover hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex lg:hidden"
      >
        <Icon size={18} aria-hidden="true" />
      </button>

      <div className="hidden h-11 min-w-[132px] max-w-[166px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:min-w-[150px] lg:flex">
        <Icon size={compact ? 16 : 18} className="text-slate-500" aria-hidden="true" />
        <CustomSelect
          value={theme}
          onChange={setTheme}
          options={options}
          valueKey="value"
          labelKey="label"
          placeholder={t('Theme')}
          aria-label={t('Theme')}
          className="min-w-0 flex-1"
          buttonClassName="h-11 border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0 hover:border-transparent"
          menuClassName="min-w-[140px]"
        />
      </div>
    </>
  );
};

export default ThemeSelector;
