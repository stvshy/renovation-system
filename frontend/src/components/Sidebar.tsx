import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="flex flex-col w-64 bg-white dark:bg-background-dark shadow-md h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 print:hidden">
            <div className="flex flex-col flex-1">
                {/* Profile Section - Static */}
                <div className="border-b border-gray-200 dark:border-gray-700 shrink-0 p-4">
                    <div className="flex items-center gap-3">
                        <div 
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0"
                        >
                            <span className="material-symbols-outlined">person</span>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <h1 className="text-gray-800 dark:text-gray-200 text-base font-medium truncate w-40" title={user?.email}>
                                {user?.email?.split('@')[0] || 'Użytkownik'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-xs truncate w-40" title={user?.email}>
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <NavItem to="/projects" icon="folder" label="Projekty" />
                    <NavItem to="/inventory" icon="warehouse" label="Magazyn" />
                    <NavItem to="/clients" icon="groups" label="Klienci" />
                    <NavItem to="/calendar" icon="calendar_month" label="Kalendarz" />
                    <NavItem to="/settings" icon="settings" label="Ustawienia" />
                </nav>
                
                <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700 shrink-0 flex flex-col gap-3">
                    <NavLink to="/projects/new/client" className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-bold tracking-wide">
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span className="truncate">Nowy Projekt</span>
                    </NavLink>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 text-sm font-bold tracking-wide"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        <span className="truncate">Wyloguj</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface NavItemProps {
    to: string;
    icon: string;
    label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => {
    return (
        <NavLink 
            to={to} 
            className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
            }
        >
            <span className="material-symbols-outlined">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </NavLink>
    );
};

export default Sidebar;