import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
    return (
        <div className="flex relative bg-background-light dark:bg-background-dark h-screen w-full font-display text-text-light dark:text-text-dark overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-w-0 h-screen overflow-x-hidden overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;