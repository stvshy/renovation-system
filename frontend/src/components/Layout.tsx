import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useDemo } from '../context/DemoContext';
import { useLanguage } from '../context/LanguageContext';

const Layout: React.FC = () => {
    const { isDemoMode, exitDemoMode } = useDemo();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleExitDemo = () => {
        exitDemoMode();
        navigate('/login');
    };

    return (
        <div className="flex relative bg-background-light dark:bg-background-dark h-dvh sm:h-screen w-full font-display text-text-light dark:text-text-dark overflow-hidden print:bg-white print:h-auto print:overflow-visible">
            <Sidebar />
            <main className="flex-1 min-w-0 h-dvh sm:h-screen overflow-x-hidden overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-0 print:pb-0 print:h-auto print:overflow-visible">
                {isDemoMode && (
                    <div className="print-color-exact z-40 flex items-center justify-between gap-3 bg-gradient-to-r from-sky-500 to-dependable-blue px-4 py-2 text-white shadow-md sm:sticky sm:top-0 print:relative print:top-auto print:mb-3 print:rounded-lg print:px-3 print:py-2 print:shadow-none">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold print:bg-white/25">
                                <span className="ml-[1.7px] print:hidden">▶</span>
                                <span className="hidden print:inline material-symbols-outlined text-xs leading-none">construction</span>
                            </span>
                            <span className="print:hidden sm:hidden">{t('Tryb Demo', 'Demo Mode')}</span>
                            <span className="print:hidden hidden sm:inline">
                                {t(
                                    "Tryb Demo – dane są tymczasowe i resetują się przy każdym wejściu.",
                                    "Demo Mode – data is temporary and resets on every visit."
                                )}
                            </span>
                            <span className="hidden print:inline">
                                {t("Wersja demonstracyjna Renovation System", "Renovation System Demo Version")}
                            </span>
                        </div>
                        <button
                            onClick={handleExitDemo}
                            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25 active:bg-white/30 print:hidden"
                        >
                            <span className="material-symbols-outlined text-sm leading-none">logout</span>
                            <span className="sm:hidden">{t('Wyjdź', 'Exit')}</span>
                            <span className="hidden sm:inline">{t("Wyjdź z demo", "Exit Demo")}</span>
                        </button>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;