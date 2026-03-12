import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    enterDemoMode as enterStore,
    exitDemoMode as exitStore,
    isDemoModeActive,
} from '../lib/demoStore';

interface DemoContextType {
    isDemoMode: boolean;
    enterDemoMode: () => void;
    exitDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDemoMode, setIsDemoMode] = useState(isDemoModeActive);

    const enterDemoMode = useCallback(() => {
        enterStore();
        setIsDemoMode(true);
    }, []);

    const exitDemoMode = useCallback(() => {
        exitStore();
        setIsDemoMode(false);
    }, []);

    return (
        <DemoContext.Provider value={{ isDemoMode, enterDemoMode, exitDemoMode }}>
            {children}
        </DemoContext.Provider>
    );
};

export const useDemo = () => {
    const context = useContext(DemoContext);
    if (!context) throw new Error('useDemo must be used within DemoProvider');
    return context;
};
