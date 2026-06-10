import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiUsers, FiShield, FiUpload, FiGitBranch, FiLogOut,
    FiLayers, FiEdit, FiChevronDown, FiHome,
    FiFileText, FiBriefcase, FiSettings, FiServer,
    FiFolder, FiZap, FiBox,
} from 'react-icons/fi';
import swal from '../../../../utils/swal';
import api from '../../../../services/api';
import euroLogo from '../../../../assets/euro-logo.png';
import '../utils/Sidebar.scss';

const grupos = [
    {
        key: 'gestion',
        label: 'Gestión Humana',
        icon: <FiBriefcase size={15} />,
        items: [
            { key: 'dashboard',    label: 'Dashboard',      icon: <FiHome size={16} />,       path: '/app/dashboard',       permiso: null,                    badge: 'Próximo' },
            { key: 'contratos',    label: 'Contratos',        icon: <FiFileText size={16} />,   path: '/app/contratos',       permiso: null, badge: 'Próximo' },
            { key: 'trazabilidad', label: 'Trazabilidad',   icon: <FiGitBranch size={16} />,  path: '/app/trazabilidad',    permiso: 'can_view_trazabilidad' },
            { key: 'carga',        label: 'Carga de datos', icon: <FiUpload size={16} />,     path: '/app/carga',           permiso: 'can_upload_excel' },
            { key: 'hist-cargas',  label: 'Hist. Cargas',   icon: <FiServer size={16} />,     path: '/app/bd-centralizada', permiso: 'can_manage_cargas' },
            { key: 'registros',    label: 'Adm. Registros', icon: <FiEdit size={16} />,       path: '/app/registros',       permiso: 'can_edit_registros' },
        ],
    },
    {
        key: 'documental',
        label: 'Gestión Documental',
        icon: <FiFolder size={15} />,
        items: [
            { key: 'optimizaciones', label: 'Optimizaciones', icon: <FiZap size={16} />,  path: '/app/optimizaciones', permiso: null, badge: 'Próximo' },
            { key: 'cajas',          label: 'Cajas',          icon: <FiBox size={16} />,  path: '/app/cajas',          permiso: null, badge: 'Próximo' },
        ],
    },
    {
        key: 'admin',
        label: 'Administración',
        icon: <FiSettings size={15} />,
        items: [
            { key: 'usuarios',       label: 'Usuarios',         icon: <FiUsers size={16} />,  path: '/app/usuarios',       permiso: 'can_manage_users' },
            { key: 'roles',          label: 'Roles y permisos', icon: <FiShield size={16} />, path: '/app/roles',          permiso: 'can_manage_roles' },
            { key: 'administracion', label: 'Sedes y Orígenes', icon: <FiLayers size={16} />, path: '/app/administracion', permiso: 'can_manage_sedes' },
        ],
    },
];

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const user      = JSON.parse(localStorage.getItem('user') || '{}');
    const permisos  = user.permisos_rol || [];
    const esSuperuser = user.is_superuser;

    const tienePermiso = (p) => !p || esSuperuser || permisos.includes(p);

    // Estado de grupos abiertos/cerrados — todos abiertos por defecto
    const [abiertos, setAbiertos] = useState(() =>
        Object.fromEntries(grupos.map(g => [g.key, true]))
    );

    const toggleGrupo = (key) => setAbiertos(prev => ({ ...prev, [key]: !prev[key] }));

    const handleNavClick = (item) => {
        if (item.badge) return;
        navigate(item.path);
        if (onMobileClose) onMobileClose();
    };

    const handleLogout = async () => {
        const result = await swal({
            title: 'Cerrar sesión', icon: 'question',
            showCancelButton: true, confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6366f1',
        });
        if (!result.isConfirmed) return;
        try { await api.post('auth/logout/', { refresh: localStorage.getItem('refresh_token') }); } catch {}
        localStorage.clear();
        navigate('/');
    };

    return (
        <>
            {mobileOpen && <div className="vyd-sb-scrim" onClick={onMobileClose} />}

            <aside className={`vyd-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
                {/* Marca */}
                <div className="vyd-sb-brand">
                    <div
                        className="vyd-logo-bg"
                        onClick={onToggle}
                        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
                    >
                        <img src={euroLogo} alt="Euro Supermercado" />
                    </div>
                    <div className="vyd-sb-brand-txt">
                        <div className="vyd-brand-title">Euro Supermercados</div>
                        <div className="vyd-brand-sub">Gestión Humana</div>
                    </div>
                </div>

                {/* Navegación */}
                <nav className="vyd-sb-nav">
                    {grupos.map((grupo) => {
                        const items = grupo.items.filter(i => tienePermiso(i.permiso));
                        if (!items.length) return null;
                        const estaAbierto = abiertos[grupo.key];

                        return (
                            <div key={grupo.key} className={`vyd-sb-group${estaAbierto ? ' open' : ''}`}>
                                {/* Cabecera del grupo */}
                                <button
                                    className="vyd-sb-group-header"
                                    onClick={() => toggleGrupo(grupo.key)}
                                    title={grupo.label}
                                >
                                    <span className="vyd-sb-ic vyd-sb-group-icon">{grupo.icon}</span>
                                    <span className="vyd-sb-group-lbl">{grupo.label}</span>
                                    <FiChevronDown size={13} className="vyd-sb-group-chevron" />
                                </button>

                                {/* Ítems del grupo */}
                                <div className="vyd-sb-group-body">
                                    {items.map((item) => (
                                        <button
                                            key={item.key}
                                            className={`vyd-sb-item vyd-sb-sub${location.pathname === item.path ? ' active' : ''}${item.badge ? ' soon' : ''}`}
                                            onClick={() => handleNavClick(item)}
                                            title={item.label}
                                        >
                                            <span className="vyd-sb-ic">{item.icon}</span>
                                            <span className="vyd-sb-label">{item.label}</span>
                                            {item.badge && <span className="vyd-sb-badge">{item.badge}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Pie */}
                <div className="vyd-sb-foot">
                    <div className="vyd-sb-version"><span>v1.0 · Fase 1 · Lambda Analytics</span></div>
                    <button
                        className="vyd-sb-item vyd-sb-logout"
                        onClick={handleLogout}
                        title="Cerrar sesión"
                    >
                        <span className="vyd-sb-ic"><FiLogOut size={16} /></span>
                        <span className="vyd-sb-label">Cerrar sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
