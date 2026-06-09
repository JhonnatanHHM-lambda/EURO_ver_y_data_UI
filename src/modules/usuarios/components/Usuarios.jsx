import { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiAlertCircle, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';
import DataTable from '../../core/Tabla/components/DataTable.jsx';
import Modal from '../../core/Modal/components/Modal.jsx';
import useUsuarios from '../hooks/useUsuarios.jsx';
import '../utils/Usuarios.scss';

const Campo = ({ label, error, children, hint }) => (
    <div className={`vyd-form-group${error ? ' has-error' : ''}`}>
        <label>{label}</label>
        {children}
        {error && <span className="vyd-field-error"><FiAlertCircle size={11} /> {error}</span>}
        {!error && hint && <span className="vyd-field-hint">{hint}</span>}
    </div>
);

const Usuarios = () => {
    const [verPassword, setVerPassword] = useState(false);
    const {
        usuarios, roles, loading, modalOpen, editing,
        search, setSearch, formData, setFormData, erroresCampos,
        abrirModalCrear, abrirModalEditar, cerrarModal, handleSubmit, eliminar,
    } = useUsuarios();

    const update = (campo, val) => setFormData(f => ({ ...f, [campo]: val }));

    const columns = [
        {
            key: 'nombre_completo', label: 'Nombre', sortable: true,
            render: (row) => (
                <div className="vyd-usr-cell">
                    <div className="vyd-usr-avatar">{(row.nombres?.[0] || 'U').toUpperCase()}</div>
                    <div>
                        <div className="vyd-usr-name">{row.nombre_completo}</div>
                        <div className="vyd-usr-email">{row.correo}</div>
                    </div>
                </div>
            ),
        },
        { key: 'cedula', label: 'Cedula', sortable: true },
        {
            key: 'rol', label: 'Rol',
            render: (row) => row.rol && row.rol !== 'Sin rol'
                ? <span className="vyd-pill" style={{ background: 'rgba(99,102,241,.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.3)' }}>{row.rol}</span>
                : <span style={{ color: 'var(--fg4)', fontSize: 11 }}>Sin rol</span>,
        },
        {
            key: 'is_active', label: 'Estado',
            render: (row) => (
                <span className={`vyd-pill ${row.is_active ? 'estado-activo' : 'estado-inactivo'}`}>
                    {row.is_active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
    ];

    return (
        <div className="vyd-main fade-in">
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiUser size={20} /> Usuarios</h1>
                    <p className="vyd-page-sub">{usuarios.length} usuarios registrados</p>
                </div>
                <button className="vyd-btn-sm" onClick={abrirModalCrear}>
                    <FiPlus size={14} /> Nuevo usuario
                </button>
            </div>

            <div className="vyd-panel" style={{ padding: '14px 18px' }}>
                <div className="vyd-toolbar">
                    <div className="vyd-search">
                        <FiSearch size={14} />
                        <input
                            placeholder="Buscar por nombre, correo o cedula..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="vyd-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <DataTable
                    data={usuarios} columns={columns} loading={loading}
                    emptyMessage="No se encontraron usuarios"
                    renderActions={(row) => (
                        <div className="table-actions">
                            <button className="action-btn edit" onClick={() => abrirModalEditar(row)} title="Editar"><FiEdit2 size={14} /></button>
                            <button className="action-btn delete" onClick={() => eliminar(row)} title="Eliminar"><FiTrash2 size={14} /></button>
                        </div>
                    )}
                />
            </div>

            {/* Modal crear/editar */}
            <Modal isOpen={modalOpen} onClose={cerrarModal} title={editing ? 'Editar usuario' : 'Nuevo usuario'}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="vyd-form-grid">
                        <Campo label="Nombres *" error={erroresCampos.nombres}>
                            <input value={formData.nombres} onChange={e => update('nombres', e.target.value)} placeholder="Ej: Juan Carlos" />
                        </Campo>
                        <Campo label="Apellidos *" error={erroresCampos.apellidos}>
                            <input value={formData.apellidos} onChange={e => update('apellidos', e.target.value)} placeholder="Ej: Perez Lopez" />
                        </Campo>
                        <Campo label="Cedula *" error={erroresCampos.cedula} hint="Solo numeros (5-20 digitos)">
                            <input
                                value={formData.cedula}
                                onChange={e => update('cedula', e.target.value)}
                                placeholder="Ej: 1093512874"
                                autoComplete="off"
                            />
                        </Campo>
                        <Campo label="Correo electronico *" error={erroresCampos.correo}>
                            <input
                                type="email"
                                value={formData.correo}
                                onChange={e => update('correo', e.target.value)}
                                placeholder="correo@dominio.com"
                                autoComplete="off"
                            />
                        </Campo>
                        <Campo label="Telefono" error={erroresCampos.telefono} hint="Solo numeros (7-15 digitos)">
                            <input
                                value={formData.telefono}
                                onChange={e => update('telefono', e.target.value)}
                                placeholder="Ej: 3101234567"
                                autoComplete="off"
                            />
                        </Campo>
                        <Campo label="Genero">
                            <select value={formData.genero} onChange={e => update('genero', e.target.value)}>
                                <option value="">Seleccionar...</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="O">Otro</option>
                            </select>
                        </Campo>
                        <Campo
                            label={editing ? 'Nueva contrasena (opcional)' : 'Contrasena *'}
                            error={erroresCampos.password}
                            hint="Minimo 8 caracteres"
                        >
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type={verPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={e => update('password', e.target.value)}
                                    placeholder={editing ? 'Dejar vacio para no cambiar' : 'Minimo 8 caracteres'}
                                    autoComplete="new-password"
                                    style={{ paddingRight: 36, flex: 1, width: '100%' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVerPassword(v => !v)}
                                    style={{
                                        position: 'absolute', right: 10,
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--fg4)', padding: 0, display: 'flex',
                                        transition: 'color .15s',
                                    }}
                                    title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {verPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                                </button>
                            </div>
                        </Campo>

                        {/* Selector de roles mejorado */}
                        <div className="vyd-form-group vyd-roles-selector">
                            <label><FiShield size={12} style={{ marginRight: 5 }} />Rol(es) asignados</label>
                            {roles.length === 0 ? (
                                <div className="vyd-roles-empty">
                                    <FiAlertCircle size={14} />
                                    No hay roles creados. Ve a <strong>Roles y permisos</strong> para crear uno.
                                </div>
                            ) : (
                                <div className="vyd-roles-checkboxes">
                                    {roles.map(r => {
                                        const seleccionado = formData.grupos.includes(r.name);
                                        return (
                                            <label
                                                key={r.id}
                                                className={`vyd-role-toggle${seleccionado ? ' selected' : ''}`}
                                                onClick={() => {
                                                    const nuevos = seleccionado
                                                        ? formData.grupos.filter(g => g !== r.name)
                                                        : [...formData.grupos, r.name];
                                                    update('grupos', nuevos);
                                                }}
                                            >
                                                <span className="vyd-role-toggle-check">
                                                    {seleccionado && '✓'}
                                                </span>
                                                <span>{r.name}</span>
                                                <span className="vyd-role-toggle-count">{r.total_usuarios} usuarios</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="vyd-modal-actions">
                        <button type="submit" className="vyd-btn-sm">Guardar</button>
                        <button type="button" className="vyd-btn-sm ghost" onClick={cerrarModal}>Cancelar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Usuarios;
