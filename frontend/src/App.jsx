import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Users from './pages/Users';
import Categories from './pages/Categories';

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Layout Routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/users" element={<div className="text-white">User Management Coming Soon</div>} />
                <Route path="/pos" element={<div className="text-white">POS Terminal Coming Soon</div>} />
                <Route path="/settings" element={<div className="text-white">Settings Coming Soon</div>} />
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
