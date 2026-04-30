import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGES } from '../../utils/translations';
import CustomSelect from '../common/CustomSelect';

const LanguageSelector = ({ compact = false, className = '' }) => {
  const { language, setLanguage, t } = useLanguage();
  const options = [
    { value: LANGUAGES.EN, label: t('English') },
    { value: LANGUAGES.SI, label: t('Sinhala') },
  ];

  return (
    <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 ${className}`}>
      <Languages size={compact ? 16 : 18} className="text-slate-500" />
      <CustomSelect
        value={language}
        onChange={setLanguage}
        options={options}
        valueKey="value"
        labelKey="label"
        placeholder={t('Language')}
        className="min-w-[116px]"
        buttonClassName={`border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0 ${compact ? 'min-h-[20px]' : ''}`}
        menuClassName="min-w-[140px]"
      />
    </div>
  );
};

export default LanguageSelector;
