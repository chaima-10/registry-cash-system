import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiHome, FiBox, FiUsers, FiLogOut, FiMenu, FiX, FiShoppingCart, FiSettings, FiUser, FiMoon, FiSun, FiChevronDown, FiActivity, FiShoppingBag, FiGift, FiCalendar, FiTrendingUp
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
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`
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
    const { t, i18n } = useTranslation();
    const { logout, user, toggleTheme } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const menuItems = [
        { to: '/', icon: FiHome, label: t('dashboard'), adminOnly: true },
        { to: '/pos', icon: FiShoppingCart, label: t('posTerminal'), adminOnly: false },
        { to: '/products', icon: FiBox, label: t('products'), adminOnly: true },
        { to: '/users', icon: FiUsers, label: t('users', 'Users'), adminOnly: true },
        { to: '/analytics', icon: FiActivity, label: t('aiAnalytics', 'AI Analytics'), adminOnly: true },
        { to: '/giveaways', icon: FiGift, label: t('giveaways', 'Giveaways'), adminOnly: false },
        { to: '/marketing', icon: FiShoppingBag, label: t('marketingStudio', 'Marketing Studio'), adminOnly: true },
    ];
    const visibleMenuItems = menuItems.filter(item => 
        user?.role === 'admin' || !item.adminOnly
    );

    const getPageTitle = () => {
        const item = menuItems.find(i => i.to === location.pathname);
        if (location.pathname === '/profile') return t('myProfile');
        if (location.pathname === '/settings') return t('settings');
        return item ? item.label : t('dashboard');
    };

    const isRtl = i18n.language === 'ar';

    const SidebarContent = ({ isMobile = false }) => (
        <>
            {/* Logo Area */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
                {(!collapsed || isMobile) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg shadow-lg shadow-blue-500/20" />
                        <span className="font-bold text-xl tracking-tight">Registry<span className="text-blue-500">POS</span></span>
                    </motion.div>
                )}
                {!isMobile ? (
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        {collapsed ? <FiMenu /> : <FiX />}
                    </button>
                ) : (
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    >
                        <FiX />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                {visibleMenuItems.map(item => (
                    <SidebarItem key={item.to} {...item} collapsed={isMobile ? false : collapsed} />
                ))}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-600 transition-colors duration-300">
                {(!collapsed || isMobile) && <span>v1.0.0</span>}
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Desktop Sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 80 : 280 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
                className="hidden xl:flex h-full bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 flex-col relative z-20 transition-colors duration-300"
            >
                <SidebarContent />
            </motion.aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] xl:hidden"
                        />
                        <motion.aside
                            initial={{ x: isRtl ? '100%' : '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: isRtl ? '100%' : '-100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 bottom-0 left-0 right-auto w-[280px] bg-white dark:bg-gray-900 z-[70] xl:hidden flex flex-col shadow-2xl rtl:left-auto rtl:right-0"
                        >
                            <SidebarContent isMobile={true} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full bg-gray-100 dark:bg-gray-950 relative overflow-hidden transition-colors duration-300">
                {/* Header */}
                <header className="h-14 md:h-16 lg:h-20 border-b border-gray-200 dark:border-gray-800/50 px-4 lg:px-8 flex items-center justify-between bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="xl:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        >
                            <FiMenu size={20} />
                        </button>
                        <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate max-w-[150px] sm:max-w-none">
                            {getPageTitle()}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-6">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Toggle Theme"
                        >
                            {user?.theme === 'dark' ? <FiMoon size={18} className="lg:w-5 lg:h-5" /> : <FiSun size={18} className="lg:w-5 lg:h-5" />}
                        </button>

                        <div className="hidden sm:block">
                            <LanguageSwitcher />
                        </div>
                        
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 lg:gap-3 hover:bg-gray-100 dark:hover:bg-gray-800/50 p-1 lg:p-2 rounded-xl transition-colors"
                            >
                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 text-sm lg:text-base">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user?.username}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">{t(user?.role, user?.role)}</p>
                                </div>
                                <FiChevronDown className={`text-gray-500 dark:text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''} hidden sm:block`} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right rtl:origin-top-left rtl:right-auto rtl:left-0"
                                    >
                                        <div className="p-2 space-y-1 text-left rtl:text-right">
                                            <div className="sm:hidden p-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                                                <LanguageSwitcher />
                                            </div>
                                            <button
                                                onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            >
                                                <FiUser className="text-lg" /> {t('viewProfile')}
                                            </button>
                                            <button
                                                onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            >
                                                <FiSettings className="text-lg" /> {t('settings')}
                                            </button>
                                            <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <FiLogOut className="text-lg" /> {t('logout')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
