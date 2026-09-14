import React from 'react';

import PillToggle from '../common/PillToggle';
import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGES } from '../../utils/translations';

/**
 * English / Sinhala as a two-way switch. The labels are written in their own
 * script rather than translated, so each side reads correctly to the person
 * who wants it.
 */
const LanguageSelector = ({ className = 'inline-flex' }) => {
  const { language, setLanguage, t } = useLanguage();

  const options = [
    { value: LANGUAGES.EN, label: 'EN', title: 'English' },
    { value: LANGUAGES.SI, label: 'සිං', title: 'සිංහල' },
  ];

  return (
    <PillToggle
      value={language === LANGUAGES.SI ? LANGUAGES.SI : LANGUAGES.EN}
      options={options}
      onChange={setLanguage}
      ariaLabel={t('Language')}
      className={className}
    />
  );
};

export default LanguageSelector;
