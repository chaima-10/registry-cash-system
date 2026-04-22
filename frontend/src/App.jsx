import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import EmailVerification from './pages/EmailVerification';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'cashier' ? '/pos' : '/'} replace />;
    }
    return children;
};

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Users from './pages/Users';
import POS from './pages/POS';
import Giveaways from './pages/Giveaways';

import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AIAnalytics from './pages/AIAnalytics';
import AIMarketing from './pages/AIMarketing';

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<EmailVerification />} />

            {/* Admin Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/analytics" element={<AIAnalytics />} />
                <Route path="/marketing" element={<AIMarketing />} />
                <Route path="/products" element={<Products />} />
            </Route>

            {/* Shared Routes (Admin + Cashier) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/pos" element={<POS />} />
                <Route path="/giveaways" element={<Giveaways />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;
// aaa