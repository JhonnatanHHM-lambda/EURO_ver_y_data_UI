import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Rutas en orden de prioridad — la primera que el usuario tenga habilitada
const RUTAS_PRIORIDAD = [
    { permiso: 'can_view_trazabilidad', path: '/app/trazabilidad'   },
    { permiso: 'can_view_contratos',    path: '/app/contratos'      },
    { permiso: 'can_view_contrataciones', path: '/app/contrataciones' },
    { permiso: 'can_upload_excel',      path: '/app/carga'          },
    { permiso: 'can_manage_cargas',     path: '/app/bd-centralizada'},
    { permiso: 'can_manage_sedes',      path: '/app/administracion' },
    { permiso: 'can_manage_users',      path: '/app/usuarios'       },
    { permiso: 'can_manage_roles',      path: '/app/roles'          },
    { permiso: 'can_edit_registros',    path: '/app/registros'      },
];

const RedireccionarDash = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const user     = JSON.parse(localStorage.getItem('user') || '{}');
        const permisos = user.permisos_rol || [];
        const esSU     = user.is_superuser;

        // Superusuario siempre va a trazabilidad
        if (esSU) { navigate('/app/trazabilidad', { replace: true }); return; }

        // Primer permiso disponible
        const destino = RUTAS_PRIORIDAD.find(r => permisos.includes(r.permiso));
        if (destino) {
            navigate(destino.path, { replace: true });
        } else {
            // Sin ningún permiso → pantalla de sin acceso (no hay loop)
            navigate('/app/sin-acceso', { replace: true });
        }
    }, [navigate]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="spinner" />
        </div>
    );
};

export default RedireccionarDash;
