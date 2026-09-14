import React from 'react';
import { Moon, Sun } from 'lucide-react';

import PillToggle from '../common/PillToggle';
import { useTheme } from '../../hooks/useTheme';
import { THEMES, resolveTheme } from '../../utils/themePreference';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Light / Dark as a two-way switch, the same control at every width.
 *
 * "System" is still a stored value (App Configuration offers it), but the
 * header shows whichever theme System resolved to and a tap sets the other
 * one explicitly: a cashier flipping the switch wants the screen to change,
 * not to be told it is following the OS. Measured, the toolbar holds this
 * 88px switch down to 285px; under that the control moves into the user menu
 * and this component renders nothing visible.
 */
const ThemeSelector = () => {
  const [theme, setTheme] = useTheme();
  const { t } = useLanguage();

  const resolved = resolveTheme(theme);

  const options = [
    { value: THEMES.LIGHT, icon: Sun, title: t('Light') },
    { value: THEMES.DARK, icon: Moon, title: t('Dark') },
  ];

  return (
    <PillToggle
      value={resolved === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT}
      options={options}
      onChange={setTheme}
      ariaLabel={t('Theme')}
      className="hidden min-[285px]:inline-flex"
    />
  );
};

export default ThemeSelector;
