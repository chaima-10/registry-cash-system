import { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, logoutUser, getProfile } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
    }, []);

    const login = async (username, password) => {
        const data = await loginUser({ username, password });
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
        setUser(prev => ({ ...prev, ...updatedData }));
        if (updatedData.theme) {
            applyTheme(updatedData.theme);
        }
    };

    const applyTheme = (theme) => {
        if (!theme) return;
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    };

    // Initialize theme on load
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    }, []);

    // Sync theme when user loads
    useEffect(() => {
        if (user?.theme) {
            applyTheme(user.theme);
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser, applyTheme }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
