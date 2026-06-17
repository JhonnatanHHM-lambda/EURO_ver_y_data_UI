import { FiPlus, FiEdit2, FiTrash2, FiShield, FiUsers, FiCheck, FiDatabase, FiUpload, FiGrid, FiMapPin, FiEdit, FiFileText, FiCheckSquare, FiZap, FiUserCheck, FiBriefcase } from 'react-icons/fi';
import Modal from '../../core/Modal/components/Modal.jsx';
import useRoles from '../hooks/useRoles.jsx';
import '../utils/Roles.scss';

const PERMISOS_INFO = {
    // Trazabilidad
    can_view_trazabilidad:  { label: 'Ver trazabilidad',            desc: 'Consultar el historial de empleados y candidatos por sede',   icon: <FiDatabase size={14} />,    grupo: 'Trazabilidad' },
    can_upload_excel:       { label: 'Cargar archivos Excel',       desc: 'Subir bases de datos de empleados al sistema',               icon: <FiUpload size={14} />,      grupo: 'Trazabilidad' },
    can_manage_sedes:       { label: 'Gestionar sedes',             desc: 'Crear nuevas sedes al cargar archivos Excel',                 icon: <FiMapPin size={14} />,      grupo: 'Trazabilidad' },
    can_manage_cargas:      { label: 'BD Centralizada',             desc: 'Ver historial de cargas y revertirlas',                       icon: <FiDatabase size={14} />,    grupo: 'Trazabilidad' },
    can_edit_registros:     { label: 'Editar registros',            desc: 'Cambiar estado, proceso y datos de cada registro individual', icon: <FiEdit size={14} />,        grupo: 'Trazabilidad' },
    // Vencimientos y Contrataciones
    can_view_contratos:           { label: 'Ver vencimientos',            desc: 'Acceder al panel de vencimientos activos y firma digital',           icon: <FiFileText size={14} />,    grupo: 'Vencimientos' },
    can_decide_contratos:         { label: 'Decidir vencimientos',        desc: 'Tomar decisiones sobre vencimientos: prorrogar o terminar (Director)', icon: <FiCheckSquare size={14} />, grupo: 'Vencimientos' },
    can_set_condiciones_contratos:{ label: 'Definir condiciones GH',      desc: 'Definir condiciones de prórroga/terminación y subir documentos (GH)',  icon: <FiUserCheck size={14} />,   grupo: 'Vencimientos' },
    can_escanear_siesa:           { label: 'Consultar SIESA',             desc: 'Ejecutar escaneo manual de contratos próximos a vencer',               icon: <FiZap size={14} />,         grupo: 'Vencimientos' },
    can_manage_asignaciones:      { label: 'Gestionar asignaciones',      desc: 'Asignar directores y gestores humanos a sedes',                        icon: <FiUserCheck size={14} />,   grupo: 'Vencimientos' },
    can_view_contrataciones:      { label: 'Ver contrataciones',          desc: 'Consultar historial de documentos firmados por empleado',              icon: <FiBriefcase size={14} />,   grupo: 'Vencimientos' },
    // Administración
    can_manage_users:       { label: 'Gestionar usuarios',          desc: 'Crear, editar y desactivar cuentas de usuario',               icon: <FiUsers size={14} />,       grupo: 'Administración' },
    can_manage_roles:       { label: 'Gestionar roles y permisos',  desc: 'Crear roles y asignar permisos a cada uno',                   icon: <FiShield size={14} />,      grupo: 'Administración' },
    // General
    can_view_dashboard:     { label: 'Ver dashboard',               desc: 'Acceder al panel de resumen y estadísticas generales',        icon: <FiGrid size={14} />,        grupo: 'General' },
};

const Roles = () => {
    const {
        roles, loading, modalOpen, editing, formData, setFormData,
        permisos,
        abrirModalCrear, abrirModalEditar, cerrarModal,
        handleSubmit, eliminar, togglePermiso,
    } = useRoles();

    if (loading) {
        return (
            <div className="vyd-main fade-in" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '50vh', display: 'flex' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="vyd-main fade-in">
            {/* Header */}
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiShield size={20} /> Roles &amp; Permisos</h1>
                    <p className="vyd-page-sub">{roles.length} roles configurados</p>
                </div>
                <button className="vyd-btn-sm" onClick={abrirModalCrear}>
                    <FiPlus size={14} /> Nuevo rol
                </button>
            </div>

            {/* Cards de roles */}
            <div className="vyd-roles-grid">
                {roles.length === 0 && (
                    <div className="vyd-panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 20px', color: 'var(--fg3)' }}>
                        <FiShield size={32} style={{ opacity: .3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                        <div style={{ fontWeight: 700, color: 'var(--fg2)', marginBottom: 6 }}>No hay roles configurados</div>
                        <div style={{ fontSize: 12.5, marginBottom: 18 }}>Crea el primer rol y asígnale permisos.</div>
                        <button className="vyd-btn-sm" onClick={abrirModalCrear}><FiPlus size={13} /> Crear primer rol</button>
                    </div>
                )}
                {roles.map((rol) => (
                    <div key={rol.id} className="vyd-panel vyd-role-card">
                        <div className="vyd-role-card-header">
                            <div className="vyd-role-icon"><FiShield size={18} /></div>
                            <div>
                                <div className="vyd-role-name">{rol.name}</div>
                                <div className="vyd-role-meta">
                                    <FiUsers size={11} /> {rol.total_usuarios} usuario{rol.total_usuarios !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <div className="vyd-role-actions">
                                <button className="action-btn edit" onClick={() => abrirModalEditar(rol)} title="Editar"><FiEdit2 size={13} /></button>
                                <button className="action-btn delete" onClick={() => eliminar(rol)} title="Eliminar"><FiTrash2 size={13} /></button>
                            </div>
                        </div>
                        <div className="vyd-role-perms">
                            {(rol.permisos || []).slice(0, 4).map((p) => (
                                <span key={p} className="vyd-perm-chip">
                                    {PERMISOS_INFO[p]?.label || p}
                                </span>
                            ))}
                            {(rol.permisos || []).length > 4 && (
                                <span className="vyd-perm-chip more">+{rol.permisos.length - 4} más</span>
                            )}
                            {(rol.permisos || []).length === 0 && (
                                <span style={{ fontSize: 11, color: 'var(--fg4)' }}>Sin permisos asignados</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal crear/editar */}
            <Modal isOpen={modalOpen} onClose={cerrarModal} title={editing ? `Editar rol: ${editing.name}` : 'Nuevo rol'} size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="vyd-form-grid cols-1" style={{ marginBottom: 20 }}>
                        <div className="vyd-form-group">
                            <label>Nombre del rol *</label>
                            <input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Analista GH, Coordinador, Admin..."
                                required
                            />
                        </div>
                    </div>

                    <div className="vyd-perms-section">
                        <div className="vyd-perms-title">Permisos del rol</div>
                        {Object.entries(
                            permisos.reduce((acc, p) => {
                                const info = PERMISOS_INFO[p.codename];
                                const grupo = info?.grupo || 'Otros';
                                if (!acc[grupo]) acc[grupo] = [];
                                acc[grupo].push(p);
                                return acc;
                            }, {})
                        ).map(([grupo, permsGrupo]) => (
                            <div key={grupo} className="vyd-perms-group">
                                <div className="vyd-perms-group-lbl">{grupo}</div>
                                <div className="vyd-perms-list">
                                    {permsGrupo.map((p) => {
                                        const info  = PERMISOS_INFO[p.codename] || {};
                                        const activo = formData.permisos.includes(p.codename);
                                        return (
                                            <label
                                                key={p.id}
                                                className={`vyd-perm-check${activo ? ' checked' : ''}`}
                                                onClick={() => togglePermiso(p.codename)}
                                            >
                                                <span className="vyd-check-box">
                                                    {activo && <FiCheck size={11} />}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                                    {info.icon && (
                                                        <span className="vyd-perm-icon">{info.icon}</span>
                                                    )}
                                                    <div>
                                                        <span className="vyd-perm-name">{info.label || p.name}</span>
                                                        {info.desc && <span className="vyd-perm-desc">{info.desc}</span>}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="vyd-modal-actions">
                        <button type="submit" className="vyd-btn-sm">Guardar rol</button>
                        <button type="button" className="vyd-btn-sm ghost" onClick={cerrarModal}>Cancelar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Roles;
