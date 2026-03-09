import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'pl' | 'en';

interface LanguageContextValue {
    language: Language;
    setLanguage: (language: Language) => void;
    toggleLanguage: () => void;
    t: (pl: string, en: string) => string;
}

const STORAGE_KEY = 'renovation-system-language';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('pl');

    useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'pl' || saved === 'en') {
            setLanguageState(saved);
        }
    }, []);

    const setLanguage = (nextLanguage: Language) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    };

    const toggleLanguage = () => {
        setLanguage(language === 'pl' ? 'en' : 'pl');
    };

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            toggleLanguage,
            t: (pl: string, en: string) => (language === 'pl' ? pl : en),
        }),
        [language]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};
