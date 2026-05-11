import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy Load Components
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Users = lazy(() => import('./pages/Users'));
const POS = lazy(() => import('./pages/POS'));
const Giveaways = lazy(() => import('./pages/Giveaways'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AIAnalytics = lazy(() => import('./pages/AIAnalytics'));
const AIMarketing = lazy(() => import('./pages/AIMarketing'));
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

// Loading Fallback Component
const PageLoader = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-50">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-xs tracking-widest animate-pulse">Chargement...</p>
        </div>
    </div>
);

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

function AppRoutes() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                
                <Route element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/analytics" element={<AIAnalytics />} />
                    <Route path="/marketing" element={<AIMarketing />} />
                    <Route path="/products" element={<Products />} />
                </Route>

                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/pos" element={<POS />} />
                    <Route path="/giveaways" element={<Giveaways />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}



function App() {
    return (
        <GlobalErrorBoundary>
            <AuthProvider>
                <Router>
                    <AppRoutes />
                </Router>
            </AuthProvider>
        </GlobalErrorBoundary>
    );
}

export default App;
