import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useTokenRefresh from '../hooks/useTokenRefresh';

const ProtectedRoute = () => {
    const location = useLocation();
    const accessToken = localStorage.getItem('access_token');
    const sessionExpired = localStorage.getItem('session_expired') === 'true';
    useTokenRefresh();

    if (sessionExpired) {
        localStorage.removeItem('session_expired');
        return <Navigate to="/" replace />;
    }
    if (!accessToken) return <Navigate to="/" state={{ from: location }} replace />;
    return <Outlet />;
};

export default ProtectedRoute;
