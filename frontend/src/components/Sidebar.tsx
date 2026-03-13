import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { RiMenuUnfold3Line, RiMenuUnfold4Line } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggleButton from './LanguageToggleButton';
import { clearProjectCreationDirty, getProjectCreationDirty } from '../lib/projectCreationGuard';
import { clearCurrentProjectSnapshot, hasUnsavedProjectChanges, saveCurrentProjectDraft } from '../lib/projectDrafts';

type ToastState = { message: string; kind: 'success' | 'error' };

const Sidebar: React.FC = () => {
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const isProjectCreationRoute = location.pathname.startsWith('/projects/new');

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                window.clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const showToast = (message: string, kind: 'success' | 'error' = 'success') => {
        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }
        setToast({ message, kind });
        toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
    };

    const handleProtectedNavigation = async (targetPath: string) => {
        if (location.pathname === targetPath) return;

        try {
            if (isProjectCreationRoute && getProjectCreationDirty()) {
                const hasChanges = await hasUnsavedProjectChanges();
                if (hasChanges) {
                    const savedDraft = await saveCurrentProjectDraft();
                    if (savedDraft) {
                        showToast(t('Zapisano jako wersja robocza', 'Saved as draft'), 'success');
                    }
                }

                clearProjectCreationDirty();
                clearCurrentProjectSnapshot();
            }

            navigate(targetPath);
        } catch (error) {
            console.error('Navigation autosave failed:', error);
            showToast(t('Nie udało się zapisać wersji roboczej', 'Could not save draft'), 'error');
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <>
            <aside
                className={`flex flex-col ${isExpanded ? 'w-64' : 'w-16 sm:w-20'} bg-white dark:bg-background-dark shadow-md h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 print:hidden transition-[width] duration-300 shrink-0`}
                aria-label={t('Nawigacja boczna', 'Sidebar navigation')}
            >
                <div className="flex flex-col flex-1">
                    <div className="border-b border-gray-200 dark:border-gray-700 shrink-0 p-3">
                        <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} gap-2`}>
                            <button
                                onClick={() => setIsExpanded((prev) => !prev)}
                                className="size-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center"
                                aria-label={isExpanded ? t('Zwiń pasek boczny', 'Collapse sidebar') : t('Rozwiń pasek boczny', 'Expand sidebar')}
                                title={isExpanded ? t('Zwiń pasek boczny', 'Collapse sidebar') : t('Rozwiń pasek boczny', 'Expand sidebar')}
                            >
                                {isExpanded ? <RiMenuUnfold4Line className="text-lg" /> : <RiMenuUnfold3Line className="text-lg" />}
                            </button>

                            {isExpanded && (
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div className="flex flex-col overflow-hidden min-w-0">
                                        <h1 className="text-gray-800 dark:text-gray-200 text-base font-medium truncate" title={user?.email}>
                                            {user?.email?.split('@')[0] || t('Użytkownik', 'User')}
                                        </h1>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs truncate" title={user?.email}>
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isExpanded && (
                            <div
                                className="mt-3 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 mx-auto bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0"
                                title={user?.email}
                            >
                                <span className="material-symbols-outlined">person</span>
                            </div>
                        )}
                    </div>

                    <nav className={`flex-1 py-4 space-y-2 ${isExpanded ? 'px-2' : 'px-1 sm:px-2'}`}>
                        <NavItem to="/projects" icon="folder" label={t('Projekty', 'Projects')} expanded={isExpanded} onNavigate={handleProtectedNavigation} />
                        <NavItem to="/inventory" icon="warehouse" label={t('Magazyn', 'Inventory')} expanded={isExpanded} onNavigate={handleProtectedNavigation} />
                        <NavItem to="/clients" icon="groups" label={t('Klienci', 'Clients')} expanded={isExpanded} onNavigate={handleProtectedNavigation} />
                        <NavItem to="/calendar" icon="calendar_month" label={t('Kalendarz', 'Calendar')} expanded={isExpanded} onNavigate={handleProtectedNavigation} />
                        <NavItem to="/settings" icon="settings" label={t('Ustawienia', 'Settings')} expanded={isExpanded} onNavigate={handleProtectedNavigation} />
                    </nav>

                    <div className={`mt-auto border-t border-gray-200 dark:border-gray-700 shrink-0 flex flex-col gap-3 ${isExpanded ? 'p-4' : 'p-2 sm:p-3'}`}>
                        <button
                            type="button"
                            onClick={() => handleProtectedNavigation('/projects/new/client')}
                            title={t('Nowy Projekt', 'New Project')}
                            className={`w-full flex items-center justify-center cursor-pointer rounded-lg h-10 bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-bold tracking-wide ${isExpanded ? 'gap-2 px-4' : 'px-0'}`}
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            {isExpanded && <span className="truncate">{t('Nowy Projekt', 'New Project')}</span>}
                        </button>

                        <button
                            onClick={handleLogout}
                            title={t('Wyloguj', 'Sign out')}
                            className={`w-full flex items-center justify-center cursor-pointer rounded-lg h-10 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 text-sm font-bold tracking-wide ${isExpanded ? 'gap-2 px-4' : 'px-0'}`}
                        >
                            <span className="material-symbols-outlined text-lg">logout</span>
                            {isExpanded && <span className="truncate">{t('Wyloguj', 'Sign out')}</span>}
                        </button>

                        <div className="flex justify-center pt-1">
                            <LanguageToggleButton size="xxs" className="border border-gray-300 dark:border-gray-600" />
                        </div>
                    </div>
                </div>
            </aside>

            {toast &&
                createPortal(
                    <div className="fixed bottom-4 left-[4.5rem] right-3 z-[10050] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-4 sm:w-full sm:max-w-md">
                        <div
                            className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm flex items-center gap-2 ${
                                toast.kind === 'success'
                                    ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-100'
                                    : 'bg-red-50/95 border-red-300 text-red-900 dark:bg-red-900/50 dark:border-red-700 dark:text-red-100'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px] leading-none">
                                {toast.kind === 'success' ? 'check_circle' : 'error'}
                            </span>
                            <p className="text-sm sm:text-base font-semibold leading-tight">{toast.message}</p>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

interface NavItemProps {
    to: string;
    icon: string;
    label: string;
    expanded: boolean;
    onNavigate: (targetPath: string) => void | Promise<void>;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, expanded, onNavigate }) => {
    return (
        <NavLink
            to={to}
            title={label}
            onClick={(event) => {
                event.preventDefault();
                onNavigate(to);
            }}
            className={({ isActive }) =>
                `flex items-center rounded-lg transition-colors ${expanded ? 'gap-3 px-3 py-2' : 'justify-center px-2 py-2.5'} ${
                    isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
            }
        >
            <span className="material-symbols-outlined">{icon}</span>
            {expanded && <span className="text-sm font-medium truncate">{label}</span>}
        </NavLink>
    );
};

export default Sidebar;