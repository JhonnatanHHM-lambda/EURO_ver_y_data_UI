import { useState, useEffect } from 'react';
import { FiX, FiTrash2, FiUserPlus, FiUsers } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';

const ROL_LABEL = { GH: 'Gestión Humana', DIRECTOR: 'Director' };
const ROL_COLORS = {
    GH:       { bg: 'rgba(99,102,241,.1)',  color: '#4338ca' },
    DIRECTOR: { bg: 'rgba(245,158,11,.12)', color: '#92400e' },
};

const AsignacionesCentro = ({ onClose }) => {
    const [asignaciones, setAsignaciones] = useState([]);
    const [usuarios,     setUsuarios]     = useState([]);
    const [sedes,        setSedes]        = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [guardando,    setGuardando]    = useState(false);

    const [form, setForm] = useState({ usuario: '', sede: '', rol: 'DIRECTOR' });

    const cargar = async () => {
        setLoading(true);
        try {
            const [rA, rU, rS] = await Promise.all([
                api.get('contratos/asignaciones/'),
                api.get('usuarios/'),
                api.get('admin/sedes/'),
            ]);
            setAsignaciones(rA.data);
            setUsuarios(rU.data.results ?? rU.data);
            setSedes(rS.data.results ?? rS.data);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los datos.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const handleCrear = async () => {
        if (!form.usuario || !form.sede || !form.rol) {
            Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Selecciona usuario, sede y rol.' });
            return;
        }
        setGuardando(true);
        try {
            await api.post('contratos/asignaciones/', {
                usuario: parseInt(form.usuario),
                sede:    parseInt(form.sede),
                rol:     form.rol,
            });
            setForm({ usuario: '', sede: '', rol: 'DIRECTOR' });
            await cargar();
            Swal.fire({ icon: 'success', title: 'Asignación creada', timer: 1500, showConfirmButton: false });
        } catch (e) {
            const msg = e.response?.data?.usuario?.[0] || e.response?.data?.non_field_errors?.[0]
                     || e.response?.data?.detail || 'No se pudo crear la asignación.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (asig) => {
        const conf = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar asignación?',
            text: `Se quitará a ${asig.usuario_nombre || asig.usuario_correo} del rol ${ROL_LABEL[asig.rol]} en ${asig.sede_nombre}.`,
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });
        if (!conf.isConfirmed) return;
        try {
            await api.delete(`contratos/asignaciones/${asig.id}/`);
            setAsignaciones(prev => prev.filter(a => a.id !== asig.id));
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la asignación.' });
        }
    };

    const usuariosAsignadosEnSede = new Set(
        asignaciones
            .filter(a => String(a.sede) === String(form.sede))
            .map(a => a.usuario)
    );

    return (
        <>
            <div className="ctr-drawer-overlay" onClick={onClose} />
            <div className="ctr-drawer">
                {/* Header */}
                <div className="ctr-drawer-header">
                    <div>
                        <div className="ctr-drawer-title"><FiUsers size={15} style={{ marginRight: 6 }} />Asignaciones de centro</div>
                        <div className="ctr-drawer-sub">Relaciona usuarios con sedes y sus roles</div>
                    </div>
                    <button className="ctr-drawer-close" onClick={onClose}><FiX size={18} /></button>
                </div>

                <div className="ctr-drawer-body">
                    {/* ── Formulario nueva asignación ─────────────────────────── */}
                    <div className="ctr-section">
                        <div className="ctr-section-title"><FiUserPlus size={12} />Nueva asignación</div>

                        <div className="ctr-asig-form">
                            <div className="ctr-asig-field">
                                <label>Usuario</label>
                                <select
                                    value={form.usuario}
                                    onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}
                                    className="ctr-input"
                                    disabled={loading}
                                >
                                    <option value="">Selecciona un usuario...</option>
                                    {usuarios.map(u => (
                                        <option key={u.id} value={u.id} disabled={usuariosAsignadosEnSede.has(u.id)}>
                                            {u.nombre_completo || `${u.nombres} ${u.apellidos}`} — {u.correo}
                                            {usuariosAsignadosEnSede.has(u.id) ? ' (ya asignado en esta sede)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="ctr-asig-row">
                                <div className="ctr-asig-field">
                                    <label>Sede</label>
                                    <select
                                        value={form.sede}
                                        onChange={e => setForm(f => ({ ...f, sede: e.target.value }))}
                                        className="ctr-input"
                                        disabled={loading}
                                    >
                                        <option value="">Selecciona...</option>
                                        {sedes.map(s => (
                                            <option key={s.id} value={s.id}>{s.codigo} — {s.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="ctr-asig-field">
                                    <label>Rol</label>
                                    <select
                                        value={form.rol}
                                        onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                                        className="ctr-input"
                                    >
                                        <option value="DIRECTOR">Director</option>
                                        <option value="GH">Gestión Humana</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                className="vyd-btn-sm"
                                onClick={handleCrear}
                                disabled={guardando || loading || !form.usuario || !form.sede}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                {guardando ? 'Guardando...' : '+ Crear asignación'}
                            </button>
                        </div>
                    </div>

                    {/* ── Lista de asignaciones ────────────────────────────────── */}
                    <div className="ctr-section">
                        <div className="ctr-section-title">
                            <FiUsers size={12} />Asignaciones activas
                            {asignaciones.length > 0 && (
                                <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--accent)' }}>
                                    {asignaciones.length}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg4)', fontSize: 13 }}>
                                Cargando...
                            </div>
                        ) : asignaciones.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg4)', fontSize: 13 }}>
                                No hay asignaciones. Crea la primera arriba.
                            </div>
                        ) : (
                            <div className="ctr-asig-list">
                                {asignaciones.map(a => {
                                    const rc = ROL_COLORS[a.rol] || ROL_COLORS.GH;
                                    return (
                                        <div key={a.id} className="ctr-asig-item">
                                            <div className="ctr-asig-item-info">
                                                <div className="ctr-asig-nombre">
                                                    {a.usuario_nombre || a.usuario_correo}
                                                </div>
                                                <div className="ctr-asig-meta">
                                                    <span style={{ color: 'var(--fg4)', fontSize: 11 }}>{a.usuario_correo}</span>
                                                    <span className="ctr-asig-sep">·</span>
                                                    <span style={{ fontSize: 11, color: 'var(--fg3)' }}>
                                                        {a.sede_codigo} — {a.sede_nombre}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                <span className="ctr-asig-rol-badge" style={{ background: rc.bg, color: rc.color }}>
                                                    {ROL_LABEL[a.rol]}
                                                </span>
                                                <button
                                                    className="ctr-file-remove"
                                                    onClick={() => handleEliminar(a)}
                                                    title="Eliminar asignación"
                                                >
                                                    <FiTrash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AsignacionesCentro;
