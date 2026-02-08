import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiHome, FiBox, FiUsers, FiLogOut, FiMenu, FiX, FiShoppingCart, FiSettings
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const SidebarItem = ({ to, icon: Icon, label, collapsed }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
      ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
        }
    >
        <Icon className="text-xl min-w-[20px]" />
        <AnimatePresence>
            {!collapsed && (
                <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden font-medium"
                >
                    {label}
                </motion.span>
            )}
        </AnimatePresence>
    </NavLink>
);

const Layout = () => {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { to: '/', icon: FiHome, label: t('dashboard') },
        { to: '/pos', icon: FiShoppingCart, label: 'POS Terminal' }, // Add translation key later
        { to: '/products', icon: FiBox, label: t('products') },
        { to: '/users', icon: FiUsers, label: t('users') },
        { to: '/settings', icon: FiSettings, label: t('settings') },
    ];

    const getPageTitle = () => {
        const item = menuItems.find(i => i.to === location.pathname);
        return item ? item.label : 'Dashboard';
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 80 : 280 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
                className="h-full bg-gray-900 border-e border-gray-800 flex flex-col relative z-20"
            >
                {/* Logo Area */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-gray-800">
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                        >
                            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg shadow-lg shadow-blue-500/20" />
                            <span className="font-bold text-xl tracking-tight">Registry<span className="text-blue-500">POS</span></span>
                        </motion.div>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                        {collapsed ? <FiMenu /> : <FiX />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map(item => (
                        <SidebarItem key={item.to} {...item} collapsed={collapsed} />
                    ))}
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.username || 'Admin'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.role || 'Administrator'}</p>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                            title="Logout"
                        >
                            <FiLogOut className="text-xl" />
                        </button>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full bg-gray-950 relative overflow-hidden">
                {/* Header (Optional, for search/notifications) */}
                <header className="h-20 border-b border-gray-800/50 px-8 flex items-center justify-between bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                    <h1 className="text-2xl font-bold text-gray-100">{getPageTitle()}</h1>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <div className="text-sm text-gray-500">v1.0.0</div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
