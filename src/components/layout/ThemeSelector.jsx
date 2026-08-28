import React from 'react';
import { Moon, Sun, SunMoon } from 'lucide-react';

import CustomSelect from '../common/CustomSelect';
import { useTheme } from '../../hooks/useTheme';
import { THEMES } from '../../utils/themePreference';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Light / Dark / System, shaped exactly like LanguageSelector so it reads as
 * part of the header rather than something bolted on.
 */
const ThemeSelector = ({ compact = false, className = 'flex' }) => {
  const [theme, setTheme] = useTheme();
  const { t } = useLanguage();

  const options = [
    { value: THEMES.LIGHT, label: t('Light') },
    { value: THEMES.DARK, label: t('Dark') },
    { value: THEMES.SYSTEM, label: t('System') },
  ];

  const Icon = theme === THEMES.DARK ? Moon : theme === THEMES.SYSTEM ? SunMoon : Sun;

  return (
    <div
      className={`h-11 min-w-[132px] max-w-[166px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:min-w-[150px] ${className}`}
    >
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
  );
};

export default ThemeSelector;
