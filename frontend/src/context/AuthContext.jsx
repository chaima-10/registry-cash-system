import { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, logoutUser, getProfile } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState('USD');

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await getProfile();
                    setUser(userData);
                } catch (error) {
                    console.error("Auth init failed", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        initAuth();

        const savedCurrency = localStorage.getItem('currency') || 'USD';
        setCurrency(savedCurrency);
    }, []);

    const changeCurrency = (newCurrency) => {
        setCurrency(newCurrency);
        localStorage.setItem('currency', newCurrency);
    };

    const login = async (identifier, password) => {
        // If identifier contains '@', treat as email, otherwise username
        const isEmail = identifier.includes('@');
        const credentials = isEmail 
            ? { email: identifier, password } 
            : { username: identifier, password };
            
        const data = await loginUser(credentials);
        if (data.token) {
            const userData = await getProfile();
            setUser(userData);
            applyTheme(userData.theme);
        }
        return data;
    };

    const logout = () => {
        logoutUser();
        setUser(null);
        applyTheme('light'); // Revert to default or keep last preference? 'light' is safe.
        localStorage.removeItem('theme');
    };

    const updateUser = (updatedData) => {
        setUser(prev => {
            const newUser = prev ? { ...prev, ...updatedData } : null;
            if (updatedData.theme) {
                applyTheme(updatedData.theme);
            }
            return newUser;
        });
    };

    const applyTheme = (theme) => {
        if (!theme) return;
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    };

    const toggleTheme = async () => {
        const currentTheme = user?.theme || localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        // 1. Update DOM immediately for instant feedback
        applyTheme(newTheme);

        // 2. Update local state
        if (user) {
            updateUser({ theme: newTheme });

            // 3. Persist to backend if logged in
            try {
                const api = (await import('../api/axios')).default;
                await api.put('/users/profile', { theme: newTheme });
            } catch (error) {
                console.error('Failed to save theme preference to backend:', error);
            }
        }
    };

    // Initialize theme on load (from localStorage or user profile)
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    }, []);

    // Sync theme when user data is fetched
    useEffect(() => {
        if (user?.theme) {
            applyTheme(user.theme);
        }
    }, [user?.id]); // Only sync when the user itself changes (login/init)

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser, applyTheme, toggleTheme, currency, changeCurrency }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
