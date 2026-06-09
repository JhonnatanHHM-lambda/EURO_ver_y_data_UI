import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import swal from '../../../../utils/swal';

const TienePermiso = ({ permiso, fallback = null, children }) => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const user      = JSON.parse(localStorage.getItem('user') || '{}');
    const permisos  = user.permisos_rol || [];
    const tienePermiso = user.is_superuser || permisos.includes(permiso);

    useEffect(() => {
        if (!tienePermiso) {
            // Si el usuario llegó aquí desde una redirección interna (state.redirected)
            // o desde /app/inicio, no mostrar alerta — solo redirigir silenciosamente
            const desdeRedirect = location.state?.redirected || document.referrer.includes('/app/inicio');
            if (desdeRedirect) {
                navigate('/app/inicio', { replace: true });
            } else {
                swal({
                    icon: 'error',
                    title: 'Acceso denegado',
                    text: 'No tienes permisos para acceder a esta sección.',
                }).then(() => navigate('/app/inicio', { replace: true }));
            }
        }
    }, [permiso, navigate, tienePermiso, location.state]);

    return tienePermiso ? <>{children}</> : (fallback || null);
};

export default TienePermiso;
