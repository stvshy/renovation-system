import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { RiMenuUnfold3Line, RiMenuUnfold4Line } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDemo } from '../context/DemoContext';
import LanguageToggleButton from './LanguageToggleButton';
import { clearProjectCreationDirty, getProjectCreationDirty } from '../lib/projectCreationGuard';
import { clearCurrentProjectSnapshot, getCurrentProjectSnapshot, hasUnsavedProjectChanges, saveCurrentProjectDraft } from '../lib/projectDrafts';
import { saveEditedProjectFromSnapshot } from '../lib/projectWizardSave';

type ToastState = { message: string; kind: 'success' | 'error' };


const Sidebar: React.FC = () => {
    const { user, signOut } = useAuth();
    const { isDemoMode, exitDemoMode } = useDemo();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [pendingTargetPath, setPendingTargetPath] = useState<string | null>(null);
    const [showExitWizardModal, setShowExitWizardModal] = useState(false);
    const [isHandlingWizardExit, setIsHandlingWizardExit] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
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

    const resolveEditingProjectId = (): string | null => {
        const stateProjectId = (location.state as any)?.editProjectId as string | undefined;
        if (stateProjectId) return stateProjectId;

        const snapshot = getCurrentProjectSnapshot();
        if (snapshot?.id?.startsWith('edit-')) {
            return snapshot.id.slice('edit-'.length);
        }

        return null;
    };

    const handleProtectedNavigation = async (targetPath: string) => {
        if (location.pathname === targetPath) return;

        try {
            if (isProjectCreationRoute && getProjectCreationDirty()) {
                const hasChanges = await hasUnsavedProjectChanges();
                if (hasChanges) {
                    const editProjectId = resolveEditingProjectId();

                    if (editProjectId) {
                        setPendingTargetPath(targetPath);
                        setShowExitWizardModal(true);
                        return;
                    } else {
                        const savedDraft = await saveCurrentProjectDraft();
                        if (savedDraft) {
                            showToast(t('Zapisano jako wersję roboczą', 'Saved as draft'), 'success');
                        }
                    }
                }

                clearProjectCreationDirty();
                clearCurrentProjectSnapshot();
            }

            navigate(targetPath);
        } catch (error) {
            console.error('Navigation autosave failed:', error);
            const editProjectId = resolveEditingProjectId();
            showToast(
                editProjectId
                    ? t('Nie udało się zapisać zmian projektu', 'Could not save project changes')
                    : t('Nie udało się zapisać wersji roboczej', 'Could not save draft'),
                'error'
            );
        }
    };

    const handleLeaveWithoutSaving = () => {
        const targetPath = pendingTargetPath;
        setShowExitWizardModal(false);
        setPendingTargetPath(null);
        clearProjectCreationDirty();
        clearCurrentProjectSnapshot();
        if (targetPath) {
            navigate(targetPath);
        }
    };

    const handleLeaveWithSaving = async () => {
        const targetPath = pendingTargetPath;
        if (!targetPath) return;

        setIsHandlingWizardExit(true);
        try {
            const editProjectId = resolveEditingProjectId();
            if (!editProjectId) {
                setShowExitWizardModal(false);
                setPendingTargetPath(null);
                navigate(targetPath);
                return;
            }

            await saveEditedProjectFromSnapshot(editProjectId);
            showToast(t('Zapisano zmiany projektu', 'Project changes saved'), 'success');

            clearProjectCreationDirty();
            clearCurrentProjectSnapshot();
            setShowExitWizardModal(false);
            setPendingTargetPath(null);
            navigate(targetPath);
        } catch (error) {
            console.error('Saving project before leave failed:', error);
            showToast(t('Nie udało się zapisać zmian projektu', 'Could not save project changes'), 'error');
        } finally {
            setIsHandlingWizardExit(false);
        }
    };

    const handleLogout = async () => {
        if (isDemoMode) {
            exitDemoMode();
            navigate('/login');
            return;
        }

        await signOut();
        navigate('/login');
    };

    // MOBILE NAVBAR (bottom, icons only)
    // Hidden on sm and up
    const mobileNavItems = [
        { to: '/projects', icon: 'folder', label: t('Projekty', 'Projects') },
        { to: '/inventory', icon: 'warehouse', label: t('Magazyn', 'Inventory') },
        { to: '/clients', icon: 'groups', label: t('Klienci', 'Clients') },
        { to: '/calendar', icon: 'calendar_month', label: t('Kalendarz', 'Calendar') },
        { to: '/settings', icon: 'settings', label: t('Ustawienia', 'Settings') },
    ];

    // Touch gesture for closing mobile drawer
    const drawerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!showMobileMenu) return;
        let startY = 0;
        let currentY = 0;
        let dragging = false;
        const drawer = drawerRef.current;
        if (!drawer) return;
        const handleTouchStart = (e: TouchEvent) => {
            dragging = true;
            startY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (!dragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                drawer.style.transform = `translateY(${diff}px)`;
            }
        };
        const handleTouchEnd = () => {
            if (!dragging) return;
            dragging = false;
            const diff = currentY - startY;
            drawer.style.transform = '';
            if (diff > 60) setShowMobileMenu(false);
        };
        drawer.addEventListener('touchstart', handleTouchStart);
        drawer.addEventListener('touchmove', handleTouchMove);
        drawer.addEventListener('touchend', handleTouchEnd);
        return () => {
            drawer.removeEventListener('touchstart', handleTouchStart);
            drawer.removeEventListener('touchmove', handleTouchMove);
            drawer.removeEventListener('touchend', handleTouchEnd);
        };
    }, [showMobileMenu]);

    return (
        <>
            {/* Desktop sidebar */}
            <aside
                className={`hidden sm:flex flex-col ${isExpanded ? 'w-64' : 'w-16 sm:w-20'} bg-white dark:bg-background-dark shadow-md h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 print:hidden transition-[width] duration-300 shrink-0`}
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

            {/* Mobile navbar (bottom) */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-800 flex justify-between items-center px-1 py-1.5 print:hidden shadow-t-md">
                {mobileNavItems.map((item, idx) => (
                    <button
                        key={item.to}
                        className="flex flex-col items-center justify-center flex-1 py-1 px-0 group"
                        onClick={() => {
                            if (item.to === '/settings') handleProtectedNavigation('/settings');
                            else handleProtectedNavigation(item.to);
                        }}
                        aria-label={item.label}
                    >
                        <span
                            className={`material-symbols-outlined ${
                                item.to === '/clients' ? 'text-[30px]' : 'text-[26px]'
                            } ${location.pathname.startsWith(item.to) ? 'text-primary' : 'text-gray-500 dark:text-gray-300 group-hover:text-primary'}`}
                        >
                            {item.icon}
                        </span>
                    </button>
                ))}
                {/* Profile/menu icon (last) */}
                <button
                    className="flex flex-col items-center justify-center flex-1 py-1 px-0 group"
                    onClick={() => setShowMobileMenu(true)}
                    aria-label={t('Konto i więcej', 'Account and more')}
                >
                    <span className="material-symbols-outlined text-[28px] text-gray-500 dark:text-gray-300 group-hover:text-primary">
                        person
                    </span>
                </button>
            </nav>

            {/* Mobile menu modal/drawer */}
            {showMobileMenu && (
                createPortal(
                    <div className="fixed inset-0 z-[10060] flex items-end sm:hidden bg-black/40 backdrop-blur-sm">
                        <div
                            ref={drawerRef}
                            className="w-full rounded-t-2xl bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slideUp"
                        >
                            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center text-red-600 active:scale-95 transition-transform"
                                    aria-label={t('Wyloguj', 'Sign out')}
                                >
                                    <span className="material-symbols-outlined text-[24px] leading-none">logout</span>
                                </button>
                                <button
                                    onClick={() => setShowMobileMenu(false)}
                                    className="flex items-center justify-center text-gray-500 dark:text-gray-300 active:scale-95 transition-transform"
                                    aria-label={t('Zamknij', 'Close')}
                                >
                                    <span className="material-symbols-outlined text-[24px] leading-none">close</span>
                                </button>
                            </div>
                            <div className="flex flex-col items-center gap-4 py-1 pb-6 px-6">
                            <div className="flex flex-col items-center gap-1.5 -mt-[36px]">
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-14 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-3xl">person</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <h1
                                        className="text-gray-800 dark:text-gray-200 text-base font-medium"
                                            title={user?.email}
                                        >
                                            {user?.email?.split('@')[0] || t('Użytkownik', 'User')}
                                        </h1>
                                        <p
                                            className="text-gray-500 dark:text-gray-400 text-xs"
                                            title={user?.email}
                                        >
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-1 w-full">
                                    <LanguageToggleButton
                                        size="xxs"
                                        className="border border-gray-300 dark:border-gray-600 rounded-full p-0 w-[26px] h-[26px] "
                                    />
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            )}

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

            {showExitWizardModal &&
                createPortal(
                    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-[28rem] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('Opuścić edycję projektu?', 'Leave project editing?')}</h3>
                                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                                    {t(
                                        'Masz niezapisane zmiany. Możesz zostać, zapisać zmiany i wyjść albo wyjść bez zapisywania.',
                                        'You have unsaved changes. You can stay, save changes and leave, or leave without saving.'
                                    )}
                                </p>
                            </div>

                            <div className="px-6 py-5 flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowExitWizardModal(false);
                                        setPendingTargetPath(null);
                                    }}
                                    className="h-10 px-4 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-slate-800"
                                >
                                    {t('Zostań', 'Stay')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLeaveWithoutSaving}
                                    className="h-10 px-4 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    {t('Wyjdź bez zapisywania', 'Leave without saving')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLeaveWithSaving}
                                    disabled={isHandlingWizardExit}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isHandlingWizardExit ? t('Zapisywanie...', 'Saving...') : t('Zapisz i wyjdź', 'Save and leave')}
                                </button>
                            </div>
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