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
    <div className={`flex h-11 min-w-[132px] max-w-[166px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:min-w-[166px] ${className}`}>
      <Languages size={compact ? 16 : 18} className="text-slate-500" />
      <CustomSelect
        value={language}
        onChange={setLanguage}
        options={options}
        valueKey="value"
        labelKey="label"
        placeholder={t('Language')}
        className="min-w-0 flex-1"
        buttonClassName="h-9 border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0 hover:border-transparent"
        menuClassName="min-w-[140px]"
      />
    </div>
  );
};

export default LanguageSelector;
