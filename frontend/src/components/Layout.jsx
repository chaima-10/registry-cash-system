import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiHome, FiBox, FiUsers, FiLogOut, FiMenu, FiX, FiShoppingCart, FiSettings, FiUser, FiMoon, FiSun, FiChevronDown
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
// import LanguageSwitcher from './LanguageSwitcher'; // Removed as per request

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
    const { logout, user, applyTheme } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleTheme = () => {
        const newTheme = user?.theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        // Optimistically update if user is logged in, actual update happens via Settings or context sync
        // Ideally we should call updateUser but for toggle button specific logic:
        if (user) {
            // We might want to call updateUser API here but for now just context
            // The AuthContext updateProfile function handles this better
        }
    };

    const menuItems = [
        { to: '/', icon: FiHome, label: t('dashboard') },
        { to: '/pos', icon: FiShoppingCart, label: 'POS Terminal' },
        { to: '/products', icon: FiBox, label: t('products') },
        { to: '/users', icon: FiUsers, label: t('users') },
        // Settings moved to dropdown
    ];

    const getPageTitle = () => {
        const item = menuItems.find(i => i.to === location.pathname);
        if (location.pathname === '/profile') return 'My Profile';
        if (location.pathname === '/settings') return 'Settings';
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

                {/* Sidebar Footer (Version) */}
                <div className="p-4 border-t border-gray-800 text-center text-xs text-gray-600">
                    {!collapsed && <span>v1.0.0</span>}
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full bg-gray-950 relative overflow-hidden">
                {/* Header */}
                <header className="h-20 border-b border-gray-800/50 px-8 flex items-center justify-between bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 transition-colors">
                    <h1 className="text-2xl font-bold text-gray-100">{getPageTitle()}</h1>

                    <div className="flex items-center gap-6">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Toggle Theme"
                        >
                            {user?.theme === 'dark' ? <FiMoon size={20} /> : <FiSun size={20} />}
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-3 hover:bg-gray-800/50 p-2 rounded-xl transition-colors"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-bold text-white leading-none">{user?.username}</p>
                                    <p className="text-xs text-blue-400 font-medium mt-1">{user?.role}</p>
                                </div>
                                <FiChevronDown className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50"
                                    >
                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                            >
                                                <FiUser className="text-lg" /> View Profile
                                            </button>
                                            <button
                                                onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                            >
                                                <FiSettings className="text-lg" /> Settings
                                            </button>
                                            <div className="h-px bg-gray-800 my-1" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <FiLogOut className="text-lg" /> Logout
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
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
