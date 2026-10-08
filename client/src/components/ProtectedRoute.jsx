import { Navigate, Outlet } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';

/**
 * Signed-in users only. `roles` limits the area to those roles (anyone else is sent to their own home);
 * `adminOnly` further limits it to admins.
 */
const ProtectedRoute = ({ roles = null, adminOnly = false }) => {
    const { user, loading, isAdmin, signedOut } = useAuth();
    if (loading) return <p className="center-note">Loading…</p>;
    if (!user) return <Navigate to={signedOut ? '/' : '/login'} replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
    if (adminOnly && !isAdmin) return <Navigate to={homeFor(user)} replace />;
    return <Outlet />;
};

export default ProtectedRoute;
