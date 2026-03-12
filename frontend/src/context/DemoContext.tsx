import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
    enterDemoMode as enterStore,
    exitDemoMode as exitStore,
    isDemoModeActive,
} from '../lib/demoStore';
import { useLanguage } from './LanguageContext';

interface DemoContextType {
    isDemoMode: boolean;
    demoRevision: number;
    enterDemoMode: () => void;
    exitDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDemoMode, setIsDemoMode] = useState(isDemoModeActive);
    const [demoRevision, setDemoRevision] = useState(0);
    const { language } = useLanguage();

    const enterDemoMode = useCallback(() => {
        enterStore(language);
        setIsDemoMode(true);
        setDemoRevision((v) => v + 1);
    }, [language]);

    const exitDemoMode = useCallback(() => {
        exitStore();
        setIsDemoMode(false);
        setDemoRevision((v) => v + 1);
    }, []);

    useEffect(() => {
        if (!isDemoMode) return;
        enterStore(language);
        setDemoRevision((v) => v + 1);
    }, [language, isDemoMode]);

    return (
        <DemoContext.Provider value={{ isDemoMode, demoRevision, enterDemoMode, exitDemoMode }}>
            {children}
        </DemoContext.Provider>
    );
};

export const useDemo = () => {
    const context = useContext(DemoContext);
    if (!context) throw new Error('useDemo must be used within DemoProvider');
    return context;
};
