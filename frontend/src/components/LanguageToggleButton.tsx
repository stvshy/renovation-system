import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface LanguageToggleButtonProps {
    className?: string;
    size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
}

const LanguageToggleButton: React.FC<LanguageToggleButtonProps> = ({ className = '', size = 'md' }) => {
    const { language, toggleLanguage, t } = useLanguage();

    const flagCode = language === 'pl' ? 'gb' : 'pl';
    const sizeClass =
        size === 'xxs' ? 'h-5 w-5' : size === 'xs' ? 'h-7 w-7' : size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9';
    const flagSrc = `https://flagcdn.com/w80/${flagCode}.png`;

    return (
        <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t('Przełącz język', 'Switch language')}
            title={t('Przełącz język', 'Switch language')}
            className={`flex items-center justify-center overflow-hidden rounded-full bg-white shadow-md transition-transform hover:scale-105 dark:bg-slate-900 ${sizeClass} ${className}`}
        >
            <img src={flagSrc} alt={flagCode === 'gb' ? 'UK flag' : 'Polish flag'} className="h-full w-full rounded-full object-cover" />
        </button>
    );
};

export default LanguageToggleButton;
