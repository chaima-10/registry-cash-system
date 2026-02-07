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
        // Assuming loginUser sets localStorage as updated in previous steps, 
        // but better to handle state here too for consistency if API just returns token
        if (data.token) {
            // Double check API consistency, assuming api/auth.js handles localStorage
            const userData = await getProfile(); // Fetch full profile
            setUser(userData);
        }
        return data;
    };

    const logout = () => {
        logoutUser();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
