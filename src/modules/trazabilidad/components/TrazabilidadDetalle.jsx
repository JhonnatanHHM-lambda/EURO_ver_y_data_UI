import { useState, useEffect, useCallback } from 'react';
import { FiX, FiMapPin, FiEdit2, FiClock, FiDatabase } from 'react-icons/fi';
import api from '../../../services/api';
import ModalEditarRegistro from './ModalEditarRegistro';
import './TrazabilidadDetalle.scss';

const PROCESO_STYLE = {
    EMPLEADO:     { bg: '#16a34a', color: '#fff' },
    RETIRADO:     { bg: '#334155', color: '#fff' },
    SELECCIONADO: { bg: '#6366f1', color: '#fff' },
    CANDIDATO:    { bg: '#d97706', color: '#fff' },
    APRENDIZ:     { bg: '#0ea5e9', color: '#fff' },
    PASANTE:      { bg: '#06b6d4', color: '#fff' },
    ENTREVISTADO: { bg: '#8b5cf6', color: '#fff' },
};

const ESTADO_INFO = {
    HABILITADO:                  { color: '#22c55e', label: 'Habilitado' },
    INHABILITADO:                { color: '#ef4444', label: 'Inhabilitado' },
    REGISTRADO:                  { color: '#94a3b8', label: 'Registrado' },
    VERIFICACION_PARCIAL:        { color: '#f59e0b', label: 'Verificación parcial' },
    REVISION_MANUAL_AUTORIZADA:  { color: '#6366f1', label: 'Autorizado manualmente' },
    REVISION_MANUAL_RECHAZADA:   { color: '#ef4444', label: 'Rechazado manualmente' },
};

const CAMPO_LABEL = {
    estado_candidato: 'Estado',
    tipo_proceso:     'Tipo de proceso',
};

const fmt = (fecha) => {
    if (!fecha) return null;
    try { return new Date(fecha).toISOString().slice(0, 10); }
    catch { return fecha; }
};

const fmtFull = (dt) => {
    if (!dt) return '—';
    try {
        const d = new Date(dt);
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch { return dt; }
};

const PersonField = ({ label, value }) => (
    <div className="vyd-person-field">
        <div className="vyd-person-lbl">{label}</div>
        <div className="vyd-person-val">{value || '—'}</div>
    </div>
);

// Minibloque de un cambio en el historial
const HistorialItem = ({ cambio }) => {
    const u = cambio.modificado_por;
    return (
        <div className="vyd-hist-item">
            <div className="vyd-hist-campo">{CAMPO_LABEL[cambio.campo] || cambio.campo}</div>
            <div className="vyd-hist-valores">
                <span className="vyd-hist-viejo">{cambio.valor_anterior}</span>
                <span className="vyd-hist-arrow">→</span>
                <span className="vyd-hist-nuevo">{cambio.valor_nuevo}</span>
            </div>
            <div className="vyd-hist-meta">
                {u ? `${u.nombre} · ${u.correo}${u.telefono !== '—' ? ` · ${u.telefono}` : ''}` : '—'}
                <span className="vyd-hist-fecha">{fmtFull(cambio.fecha)}</span>
            </div>
            {cambio.justificacion && (
                <div className="vyd-hist-just">"{cambio.justificacion}"</div>
            )}
        </div>
    );
};

const TrazabilidadDetalle = ({ documento, onClose }) => {
    const [registros,  setRegistros]  = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [sedes,      setSedes]      = useState([]);
    const [historial,  setHistorial]  = useState({});   // { [registro_id]: [] }
    const [editando,   setEditando]   = useState(null); // registro completo o null
    const [histAbierto,setHistAbierto]= useState({});   // { [id]: bool }

    // Permiso: superuser o can_edit_registros
    const user     = JSON.parse(localStorage.getItem('user') || '{}');
    const canEdit  = user.is_superuser || (user.permisos_rol || []).includes('can_edit_registros');

    const cargarRegistros = useCallback(() => {
        if (!documento) return;
        setLoading(true);
        api.get(`trazabilidad/empleados/${documento}/`)
            .then(r => setRegistros(Array.isArray(r.data) ? r.data : []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [documento]);

    useEffect(() => { cargarRegistros(); }, [cargarRegistros]);

    // Cargar sedes para el modal de edición
    useEffect(() => {
        if (!canEdit) return;
        api.get('admin/sedes/')
            .then(r => setSedes(Array.isArray(r.data) ? r.data : r.data?.sedes || []))
            .catch(() => {});
    }, [canEdit]);

    // Cargar historial de cambios de todos los registros
    useEffect(() => {
        if (!registros.length) return;
        registros.forEach(r => {
            api.get(`trazabilidad/registros/${r.id}/historial/`)
                .then(res => {
                    if (res.data?.length) {
                        setHistorial(prev => ({ ...prev, [r.id]: res.data }));
                    }
                })
                .catch(() => {});
        });
    }, [registros]);

    // Cerrar con Escape (no propagar al modal si está abierto)
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && !editando) onClose?.();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, editando]);

    if (!documento) return null;

    // Coalesce: primer valor no-vacío para cada campo personal entre todos los registros
    const coalesce = (campo) => registros.map(r => r[campo]).find(v => v) || null;

    const base       = registros[0] || null;
    const tipoSangre = coalesce('tipo_sangre');
    const celularUnif = coalesce('celular');
    const emailUnif   = coalesce('email');
    const nacUnif     = coalesce('fecha_nacimiento');
    const escolarUnif = coalesce('nivel_escolaridad');
    const nombreUnif  = coalesce('nombre_completo') || base?.nombre_completo || documento;

    // Detectar incoherencias de nombre entre registros
    const nombresDistintos = [...new Set(
        registros.map(r => (r.nombre_completo || '').trim().toUpperCase()).filter(Boolean)
    )];
    const hayNombreIncoherente = nombresDistintos.length > 1;

    const estadoGlobal = registros.some(r => r.estado_candidato === 'INHABILITADO')
        ? 'INHABILITADO'
        : registros.some(r => r.estado_candidato === 'HABILITADO')
            ? 'HABILITADO'
            : 'REGISTRADO';

    const estadoInfo = ESTADO_INFO[estadoGlobal] || ESTADO_INFO.REGISTRADO;

    const timeline = [...registros].sort((a, b) => {
        const da = new Date(a.fecha_retiro || a.fecha_ingreso || 0);
        const db = new Date(b.fecha_retiro || b.fecha_ingreso || 0);
        return db - da;
    });

    return (
        <>
            {/* Overlay oscuro con blur */}
            <div className="vyd-drawer-overlay" onClick={editando ? undefined : onClose} />

            {/* Panel lateral derecho */}
            <div className="vyd-drawer">
                {/* Header sticky con línea amarilla */}
                <div className="vyd-drawer-head">
                    <div>
                        <div className="vyd-drawer-person">
                            {loading ? 'Cargando...' : nombreUnif}
                            {!loading && hayNombreIncoherente && (
                                <span className="vyd-nombre-alerta" title={`Nombres en BD: ${nombresDistintos.join(' / ')}`}>
                                    ⚠ Nombres inconsistentes
                                </span>
                            )}
                        </div>
                        <div className="vyd-drawer-doc">
                            {base?.tipo_documento || 'CC'} {documento}
                            {!loading && (
                                <span className="vyd-drawer-estado" style={{ color: estadoInfo.color }}>
                                    <span style={{ background: estadoInfo.color, width: 7, height: 7, borderRadius: '50%', display: 'inline-block', marginRight: 5 }} />
                                    {estadoInfo.label}
                                </span>
                            )}
                        </div>
                    </div>
                    <button className="vyd-drawer-close" onClick={onClose} title="Cerrar">
                        <FiX size={16} />
                    </button>
                </div>

                {/* Cuerpo */}
                <div className="vyd-drawer-body">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : !base ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,.4)' }}>
                            Sin registros disponibles
                        </div>
                    ) : (
                        <>
                            {/* Grid de datos personales — valores unificados entre todos los registros */}
                            <div className="vyd-person-grid">
                                <PersonField label="Celular"        value={celularUnif ? `+57 ${celularUnif}` : null} />
                                <PersonField label="Correo"         value={emailUnif} />
                                <PersonField label="Nacimiento"     value={fmt(nacUnif)} />
                                <PersonField label="Tipo de sangre" value={tipoSangre} />
                                <PersonField label="Escolaridad"    value={escolarUnif} />
                                <div className="vyd-person-field">
                                    <div className="vyd-person-lbl">Procesos registrados</div>
                                    <div className="vyd-person-val" style={{ fontSize: 22, color: '#c4b5fd', fontWeight: 900 }}>
                                        {registros.length}
                                    </div>
                                </div>
                            </div>

                            {/* Línea de tiempo */}
                            <div className="vyd-sec-title">Línea de tiempo · Recorrido en Euro</div>

                            <div className="vyd-timeline">
                                {timeline.map((r, i) => {
                                    const proc      = PROCESO_STYLE[r.tipo_proceso] || { bg: '#64748b', color: '#fff' };
                                    const est       = ESTADO_INFO[r.estado_candidato] || ESTADO_INFO.REGISTRADO;
                                    const esUltimo  = i === timeline.length - 1;
                                    const nodeColor = r.estado_candidato === 'INHABILITADO'
                                        ? '#ef4444'
                                        : proc.bg || '#64748b';
                                    const cambiosRegistro = historial[r.id] || [];
                                    const histVisible     = histAbierto[r.id];

                                    return (
                                        <div key={r.id} className="vyd-tl-event">
                                            {/* Columna izquierda: nodo + línea */}
                                            <div className="vyd-tl-axis">
                                                <div className="vyd-tl-node" style={{ borderColor: nodeColor }} />
                                                {!esUltimo && <div className="vyd-tl-line" />}
                                            </div>

                                            <div className="vyd-tl-card">
                                                <div className="vyd-tl-top">
                                                    <div className="vyd-tl-sede">
                                                        <FiMapPin size={12} style={{ opacity: .55, flexShrink: 0 }} />
                                                        {r.sede_nombre || r.sede_ciudad || 'Sede no especificada'}
                                                        {r.sede_ciudad && r.sede_nombre && (
                                                            <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>
                                                                {r.sede_ciudad}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="vyd-tl-fecha">
                                                            {fmt(r.fecha_ingreso) || fmt(r.fecha_entrevista) || '—'}
                                                            {!r.fecha_ingreso && r.fecha_entrevista && (
                                                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', marginLeft: 4 }}>
                                                                    entrevista
                                                                </span>
                                                            )}
                                                        </div>
                                                        {canEdit && (
                                                            <button
                                                                className="vyd-tl-btn-edit"
                                                                title="Editar registro"
                                                                onClick={() => setEditando(r)}
                                                            >
                                                                <FiEdit2 size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="vyd-tl-meta">
                                                    {r.tipo_proceso && (
                                                        <span style={{
                                                            background: proc.bg, color: proc.color,
                                                            fontSize: 10, fontWeight: 800, padding: '3px 10px',
                                                            borderRadius: 5, textTransform: 'uppercase', letterSpacing: '.04em',
                                                        }}>
                                                            {r.tipo_proceso}
                                                        </span>
                                                    )}
                                                    {r.cargo && <span className="vyd-tl-empresa">{r.cargo}</span>}
                                                    {r.origen_datos && (
                                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.30)' }}>
                                                            via {r.origen_datos}
                                                        </span>
                                                    )}
                                                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, color:est.color, fontWeight:600 }}>
                                                        <span style={{ width:6, height:6, borderRadius:'50%', background:est.color, display:'inline-block' }} />
                                                        {est.label}
                                                    </span>
                                                </div>

                                                {/* Para EMPLEADO/ACTIVO → mostrar fecha de ingreso */}
                                                {['EMPLEADO', 'APRENDIZ', 'PASANTE', 'SELECCIONADO', 'CANDIDATO'].includes(r.tipo_proceso) ? (
                                                    r.fecha_ingreso && (
                                                        <div className="vyd-tl-retiro-block">
                                                            <span className="vyd-tl-retiro-fecha">
                                                                Fecha de ingreso: {fmt(r.fecha_ingreso)}
                                                            </span>
                                                        </div>
                                                    )
                                                ) : (
                                                    (r.tipo_proceso === 'RETIRADO' || r.fecha_retiro || r.motivo_retiro) && (
                                                        <div className="vyd-tl-retiro-block">
                                                            {r.fecha_retiro && (
                                                                <span className="vyd-tl-retiro-fecha">
                                                                    Fecha de salida: {fmt(r.fecha_retiro)}
                                                                </span>
                                                            )}
                                                            <div className="vyd-tl-motivo">
                                                                <span className="vyd-tl-motivo-lbl">Motivo: </span>
                                                                {r.motivo_retiro || 'Sin especificar'}
                                                            </div>
                                                        </div>
                                                    )
                                                )}

                                                {r.observaciones && !r.motivo_retiro && (
                                                    <div className="vyd-tl-detalle">{r.observaciones}</div>
                                                )}

                                                {/* Origen de datos (archivo Excel fuente) */}
                                                {r.fuente_carga && (
                                                    <div className="vyd-fuente-block">
                                                        <button
                                                            className="vyd-fuente-toggle"
                                                            onClick={() => setHistAbierto(prev => ({
                                                                ...prev,
                                                                [`fuente_${r.id}`]: !prev[`fuente_${r.id}`],
                                                            }))}
                                                        >
                                                            <FiDatabase size={10} />
                                                            Origen del registro
                                                            <span className="vyd-hist-chevron" style={{
                                                                transform: histAbierto[`fuente_${r.id}`] ? 'rotate(180deg)' : 'none',
                                                            }}>▾</span>
                                                        </button>
                                                        {histAbierto[`fuente_${r.id}`] && (
                                                            <div className="vyd-fuente-valor">
                                                                <div>{r.fuente_carga}</div>
                                                                {r.creado && (
                                                                    <div className="vyd-fuente-fecha">
                                                                        Subido el {fmtFull(r.creado)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Historial de cambios del registro */}
                                                {cambiosRegistro.length > 0 && (
                                                    <div className="vyd-hist-block">
                                                        <button
                                                            className="vyd-hist-toggle"
                                                            onClick={() => setHistAbierto(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                                                        >
                                                            <FiClock size={10} />
                                                            {cambiosRegistro.length} cambio{cambiosRegistro.length !== 1 ? 's' : ''} manual{cambiosRegistro.length !== 1 ? 'es' : ''}
                                                            <span className="vyd-hist-chevron" style={{ transform: histVisible ? 'rotate(180deg)' : 'none' }}>
                                                                ▾
                                                            </span>
                                                        </button>
                                                        {histVisible && (
                                                            <div className="vyd-hist-list">
                                                                {cambiosRegistro.map(c => (
                                                                    <HistorialItem key={c.id} cambio={c} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal de edición */}
            {editando && (
                <ModalEditarRegistro
                    registro={editando}
                    sedes={sedes}
                    onClose={() => setEditando(null)}
                    onGuardado={() => {
                        setHistorial({});
                        cargarRegistros();
                    }}
                />
            )}
        </>
    );
};

export default TrazabilidadDetalle;
