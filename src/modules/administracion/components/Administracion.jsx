import { FiEdit2, FiTrash2, FiPlus, FiMapPin, FiDatabase,
         FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import useAdministracion from '../hooks/useAdministracion';
import '../utils/Administracion.scss';

const TABS = [
    { key: 'sedes',    label: 'Sedes',    icon: <FiMapPin size={14} /> },
    { key: 'origenes', label: 'Orígenes', icon: <FiDatabase size={14} /> },
];

/* ── Formulario modal ────────────────────────────────────────────────────── */
const Modal = ({ tab, editing, form, errores, cambiarForm, guardar, cerrarModal }) => {
    const esSede  = tab === 'sedes';
    const titulo  = editing
        ? (esSede ? 'Editar sede' : 'Editar origen')
        : (esSede ? 'Nueva sede' : 'Nuevo origen');

    return (
        <div className="adm-modal-overlay" onClick={cerrarModal}>
            <div className="adm-modal" onClick={e => e.stopPropagation()}>
                <div className="adm-modal-head">
                    <span className="adm-modal-title">{titulo}</span>
                    <button className="adm-modal-close" onClick={cerrarModal}>×</button>
                </div>

                <div className="adm-modal-body">
                    {/* Nombre — común a ambos */}
                    <div className="adm-field">
                        <label>Nombre *</label>
                        <input
                            type="text"
                            value={form.nombre || ''}
                            onChange={e => cambiarForm('nombre', e.target.value)}
                            placeholder={esSede ? 'Ej: Euro Laureles' : 'Ej: COOPISER'}
                            className={errores.nombre ? 'error' : ''}
                            autoFocus
                        />
                        {errores.nombre && <span className="adm-field-err">{errores.nombre}</span>}
                    </div>

                    {esSede ? (
                        <>
                            <div className="adm-field">
                                <label>Ciudad *</label>
                                <input
                                    type="text"
                                    value={form.ciudad || ''}
                                    onChange={e => cambiarForm('ciudad', e.target.value)}
                                    placeholder="Ej: Medellín"
                                    className={errores.ciudad ? 'error' : ''}
                                />
                                {errores.ciudad && <span className="adm-field-err">{errores.ciudad}</span>}
                            </div>
                            <div className="adm-field">
                                <label>Código único *</label>
                                <input
                                    type="text"
                                    value={form.codigo || ''}
                                    onChange={e => cambiarForm('codigo', e.target.value.toUpperCase())}
                                    placeholder="Ej: EUR-LAURELES"
                                    className={errores.codigo ? 'error' : ''}
                                    maxLength={20}
                                />
                                {errores.codigo && <span className="adm-field-err">{errores.codigo}</span>}
                                <span className="adm-field-hint">Identificador único. Solo letras, números y guiones.</span>
                            </div>
                            <div className="adm-field">
                                <label>Días de alerta al director</label>
                                <input
                                    type="number"
                                    value={form.dias_alerta_director ?? 5}
                                    onChange={e => {
                                        const v = parseInt(e.target.value) || 5;
                                        cambiarForm('dias_alerta_director', Math.max(5, v));
                                    }}
                                    min={5}
                                    max={60}
                                />
                                <span className="adm-field-hint">Mínimo 5 días. El director recibirá una notificación este número de días antes del vencimiento del contrato.</span>
                            </div>
                        </>
                    ) : (
                        <div className="adm-field">
                            <label>Descripción</label>
                            <input
                                type="text"
                                value={form.descripcion || ''}
                                onChange={e => cambiarForm('descripcion', e.target.value)}
                                placeholder="Ej: Base de datos de personal temporal"
                                maxLength={250}
                            />
                        </div>
                    )}
                </div>

                <div className="adm-modal-footer">
                    <button className="vyd-btn-sm" onClick={guardar}>
                        {editing ? 'Guardar cambios' : 'Crear'}
                    </button>
                    <button className="vyd-btn-sm ghost" onClick={cerrarModal}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};

/* ── Tabla genérica ──────────────────────────────────────────────────────── */
const Tabla = ({ items, columnas, onEditar, onEliminar, onToggle }) => {
    if (!items.length) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg4)', fontSize: 13 }}>
                No hay registros aún. Haz clic en "Nuevo" para agregar.
            </div>
        );
    }

    return (
        <div className="adm-table-wrap">
            <table className="adm-table">
                <thead>
                    <tr>{columnas.map(c => <th key={c.key}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className={!item.estado ? 'inactivo' : ''}>
                            {columnas.map(c => (
                                <td key={c.key}>
                                    {c.render ? c.render(item) : (item[c.key] ?? '—')}
                                </td>
                            ))}
                            <td className="adm-actions">
                                <button
                                    className="adm-btn-icon edit"
                                    onClick={() => onEditar(item)}
                                    title="Editar"
                                >
                                    <FiEdit2 size={13} />
                                </button>
                                <button
                                    className={`adm-btn-icon ${item.estado ? 'toggle-off' : 'toggle-on'}`}
                                    onClick={() => onToggle(item)}
                                    title={item.estado ? 'Desactivar' : 'Activar'}
                                >
                                    {item.estado
                                        ? <FiXCircle size={13} />
                                        : <FiCheckCircle size={13} />}
                                </button>
                                <button
                                    className="adm-btn-icon delete"
                                    onClick={() => onEliminar(item)}
                                    title={item.total_cargas > 0 ? `No eliminable: ${item.total_cargas} carga(s)` : 'Eliminar'}
                                    disabled={item.total_cargas > 0}
                                >
                                    {item.total_cargas > 0
                                        ? <FiAlertTriangle size={13} />
                                        : <FiTrash2 size={13} />}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/* ── Componente principal ─────────────────────────────────────────────────── */
const Administracion = () => {
    const {
        tab, setTab,
        sedes, origenes, loading,
        modal, editing, form, errores,
        abrirCrear, abrirEditar, cerrarModal, cambiarForm, guardar, eliminar, toggleEstado,
    } = useAdministracion();

    const items = tab === 'sedes' ? sedes : origenes;

    const COLS_SEDES = [
        { key: 'nombre',  label: 'Nombre' },
        { key: 'ciudad',  label: 'Ciudad' },
        { key: 'codigo',  label: 'Código' },
        {
            key: 'total_cargas', label: 'Cargas',
            render: item => (
                <span className={`adm-badge ${item.total_cargas > 0 ? 'has-cargas' : 'no-cargas'}`}>
                    {item.total_cargas}
                </span>
            ),
        },
        {
            key: 'estado', label: 'Estado',
            render: item => (
                <span className={`adm-badge ${item.estado ? 'activo' : 'inactivo'}`}>
                    {item.estado ? 'Activa' : 'Inactiva'}
                </span>
            ),
        },
        { key: '_acc', label: 'Acciones' },
    ];

    const COLS_ORIGENES = [
        { key: 'nombre',      label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción', render: i => i.descripcion || <span style={{ color: 'var(--fg4)' }}>—</span> },
        {
            key: 'total_cargas', label: 'Cargas',
            render: item => (
                <span className={`adm-badge ${item.total_cargas > 0 ? 'has-cargas' : 'no-cargas'}`}>
                    {item.total_cargas}
                </span>
            ),
        },
        {
            key: 'estado', label: 'Estado',
            render: item => (
                <span className={`adm-badge ${item.estado ? 'activo' : 'inactivo'}`}>
                    {item.estado ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        { key: '_acc', label: 'Acciones' },
    ];

    return (
        <div className="vyd-main fade-in">
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title">Sedes y Orígenes</h1>
                    <p className="vyd-page-sub">Administración de sedes y fuentes de datos del repositorio</p>
                </div>
                <button className="vyd-btn-sm" onClick={abrirCrear}>
                    <FiPlus size={13} /> {tab === 'sedes' ? 'Nueva sede' : 'Nuevo origen'}
                </button>
            </div>

            {/* Tabs */}
            <div className="adm-tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`adm-tab ${tab === t.key ? 'active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.icon} {t.label}
                        <span className="adm-tab-count">
                            {t.key === 'sedes' ? sedes.length : origenes.length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="vyd-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Info tooltip de protección */}
                <div className="adm-info-bar">
                    <FiAlertTriangle size={12} />
                    {tab === 'sedes'
                        ? 'Las sedes con cargas asociadas no pueden eliminarse. Primero revierte las cargas correspondientes.'
                        : 'Los orígenes con cargas asociadas no pueden eliminarse. Primero revierte las cargas correspondientes.'}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}>
                        <div className="spinner" />
                    </div>
                ) : (
                    <Tabla
                        items={items}
                        columnas={tab === 'sedes' ? COLS_SEDES : COLS_ORIGENES}
                        onEditar={abrirEditar}
                        onEliminar={eliminar}
                        onToggle={toggleEstado}
                    />
                )}
            </div>

            {/* Modal */}
            {modal && (
                <Modal
                    tab={tab}
                    editing={editing}
                    form={form}
                    errores={errores}
                    cambiarForm={cambiarForm}
                    guardar={guardar}
                    cerrarModal={cerrarModal}
                />
            )}
        </div>
    );
};

export default Administracion;
