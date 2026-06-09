import { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiSearch, FiEdit2, FiTrash2, FiPlus, FiChevronLeft, FiChevronRight,
    FiFilter, FiX, FiDatabase, FiAlertCircle, FiLock,
} from 'react-icons/fi';
import api from '../../../services/api';
import swal from '../../../utils/swal';
import ModalEditarRegistro from '../../trazabilidad/components/ModalEditarRegistro';
import ModalAgregarRegistro from '../../trazabilidad/components/ModalAgregarRegistro';
import './AdminRegistros.scss';

const ESTADOS = [
    'REGISTRADO','HABILITADO','INHABILITADO',
    'VERIFICACION_PARCIAL','REVISION_MANUAL_AUTORIZADA','REVISION_MANUAL_RECHAZADA',
];
const PROCESOS = ['EMPLEADO','RETIRADO','SELECCIONADO','CANDIDATO','ENTREVISTADO','APRENDIZ','PASANTE'];

const ESTADO_COLOR = {
    HABILITADO:                  '#22c55e',
    INHABILITADO:                '#ef4444',
    REGISTRADO:                  '#94a3b8',
    VERIFICACION_PARCIAL:        '#f59e0b',
    REVISION_MANUAL_AUTORIZADA:  '#6366f1',
    REVISION_MANUAL_RECHAZADA:   '#ef4444',
};

const PROCESO_BG = {
    EMPLEADO: '#16a34a', RETIRADO: '#475569', SELECCIONADO: '#6366f1',
    CANDIDATO: '#d97706', ENTREVISTADO: '#8b5cf6', APRENDIZ: '#0ea5e9', PASANTE: '#06b6d4',
};

const fmt = (d) => d ? new Date(d).toISOString().slice(0, 10) : '—';
const fmtDt = (d) => {
    if (!d) return '—';
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
            + ' ' + dt.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    } catch { return d; }
};

const AdminRegistros = () => {
    const [registros,   setRegistros]   = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [page,        setPage]        = useState(1);
    const [total,       setTotal]       = useState(0);
    const [totalPages,  setTotalPages]  = useState(1);
    const PAGE_SIZE = 25;

    const [sedes,       setSedes]       = useState([]);
    const [editando,    setEditando]    = useState(null);
    const [modalAgregar,setModalAgregar]= useState(false);

    const [filtros,     setFiltros]     = useState({
        search: '', tipo_proceso: '', estado: '', sede: '',
    });
    const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });
    const [filtrosOpen, setFiltrosOpen] = useState(false);
    const timerRef = useRef(null);

    const cargar = useCallback((p = page, f = filtros) => {
        setLoading(true);
        const params = { page: p, page_size: PAGE_SIZE, ...f };
        Object.keys(params).forEach(k => !params[k] && delete params[k]);
        api.get('trazabilidad/admin/registros/', { params })
            .then(r => {
                setRegistros(r.data.results || []);
                setTotal(r.data.count || 0);
                setTotalPages(Math.ceil((r.data.count || 0) / PAGE_SIZE));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, filtros]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => {
        api.get('admin/sedes/').then(r => setSedes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    const aplicarFiltros = () => {
        setFiltros({ ...filtrosTemp });
        setPage(1);
    };
    const limpiarFiltros = () => {
        const limpio = { search: '', tipo_proceso: '', estado: '', sede: '' };
        setFiltros(limpio); setFiltrosTemp(limpio); setPage(1);
    };
    const hayFiltros = Object.values(filtros).some(Boolean);

    // Búsqueda con debounce
    const handleSearch = (val) => {
        setFiltrosTemp(f => ({ ...f, search: val }));
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setFiltros(f => ({ ...f, search: val }));
            setPage(1);
        }, 400);
    };

    const irAPagina = (p) => { if (p >= 1 && p <= totalPages) setPage(p); };

    const handleEliminar = async (reg) => {
        if (!reg.puede_eliminar) {
            swal({
                icon: 'warning',
                title: 'No se puede eliminar',
                text: reg.razon_bloqueo,
            });
            return;
        }

        const confirm = await swal({
            icon: 'warning',
            title: '¿Eliminar este registro?',
            html: `<b>${reg.nombre_completo}</b><br/>${reg.tipo_documento} ${reg.documento_id}`,
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
        });
        if (!confirm.isConfirmed) return;

        try {
            await api.delete(`trazabilidad/registros/${reg.id}/eliminar/`);
            await swal({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
            cargar();
        } catch (err) {
            swal({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'No se pudo eliminar.' });
        }
    };

    const desde = (page - 1) * PAGE_SIZE + 1;
    const hasta = Math.min(page * PAGE_SIZE, total);

    const paginasVisibles = () => {
        const pages = [];
        const start = Math.max(1, page - 2);
        const end   = Math.min(totalPages, page + 2);
        if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }
        return pages;
    };

    return (
        <div className="ar-main fade-in">
            {/* Header */}
            <div className="ar-page-header">
                <div>
                    <h1 className="ar-page-title"><FiDatabase size={20} /> Administración de registros</h1>
                    <p className="ar-page-sub">Vista completa de todos los registros individuales · edición y eliminación directa</p>
                </div>
                <button className="ar-btn-primary" onClick={() => setModalAgregar(true)}>
                    <FiPlus size={13} /> Nuevo registro
                </button>
            </div>

            <div className="ar-panel">
                {/* Toolbar */}
                <div className="ar-toolbar">
                    <div className="ar-search-wrap">
                        <FiSearch size={14} />
                        <input
                            placeholder="Cédula o nombre…"
                            value={filtrosTemp.search}
                            onChange={e => handleSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className={`ar-btn-filter${filtrosOpen ? ' active' : ''}`}
                        onClick={() => setFiltrosOpen(o => !o)}
                    >
                        <FiFilter size={13} /> Filtros {hayFiltros && <span className="ar-filter-dot" />}
                    </button>
                    {hayFiltros && (
                        <button className="ar-btn-ghost danger" onClick={limpiarFiltros}>
                            <FiX size={13} /> Limpiar
                        </button>
                    )}
                    {total > 0 && (
                        <span className="ar-count">
                            {total.toLocaleString()} registro{total !== 1 ? 's' : ''}
                            {hayFiltros ? ' (filtrado)' : ''}
                        </span>
                    )}
                </div>

                {/* Panel filtros */}
                {filtrosOpen && (
                    <div className="ar-filtros">
                        <div className="ar-filtros-grid">
                            <div className="ar-fg">
                                <label>Tipo de proceso</label>
                                <select value={filtrosTemp.tipo_proceso}
                                    onChange={e => setFiltrosTemp(f => ({ ...f, tipo_proceso: e.target.value }))}>
                                    <option value="">Todos</option>
                                    {PROCESOS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="ar-fg">
                                <label>Estado</label>
                                <select value={filtrosTemp.estado}
                                    onChange={e => setFiltrosTemp(f => ({ ...f, estado: e.target.value }))}>
                                    <option value="">Todos</option>
                                    {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>
                            <div className="ar-fg">
                                <label>Sede</label>
                                <select value={filtrosTemp.sede}
                                    onChange={e => setFiltrosTemp(f => ({ ...f, sede: e.target.value }))}>
                                    <option value="">Todas</option>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>)}
                                </select>
                            </div>
                            <div className="ar-fg ar-fg--actions">
                                <button className="ar-btn-primary" onClick={aplicarFiltros}>Aplicar</button>
                                <button className="ar-btn-ghost" onClick={limpiarFiltros}>Limpiar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabla */}
                <div className="ar-tbl-wrap">
                    <table className="ar-tbl">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Nombre</th>
                                <th>Proceso</th>
                                <th>Estado</th>
                                <th>Sede</th>
                                <th>Cargo</th>
                                <th>Ingreso</th>
                                <th>Retiro</th>
                                <th>Motivo</th>
                                <th>Origen</th>
                                <th>Subido</th>
                                <th className="ar-th-actions">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '48px 0' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }} />
                                </td></tr>
                            ) : registros.length === 0 ? (
                                <tr><td colSpan={12} className="ar-tbl-empty">
                                    {hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'No hay registros.'}
                                </td></tr>
                            ) : registros.map(r => (
                                <tr key={r.id} className={r.es_manual ? 'ar-row--manual' : ''}>
                                    <td>
                                        <span className="ar-mono">{r.tipo_documento} {r.documento_id}</span>
                                    </td>
                                    <td className="ar-nm">
                                        <strong>{r.nombre_completo}</strong>
                                        {r.email && <div className="ar-sub">{r.email}</div>}
                                        {r.es_manual && <span className="ar-manual-badge">Manual</span>}
                                    </td>
                                    <td>
                                        {r.tipo_proceso ? (
                                            <span className="ar-pill" style={{ background: PROCESO_BG[r.tipo_proceso] || '#475569' }}>
                                                {r.tipo_proceso}
                                            </span>
                                        ) : <span className="ar-dash">—</span>}
                                    </td>
                                    <td>
                                        <span className="ar-estado" style={{ color: ESTADO_COLOR[r.estado_candidato] || '#94a3b8' }}>
                                            <span className="ar-dot" style={{ background: ESTADO_COLOR[r.estado_candidato] || '#94a3b8' }} />
                                            {(r.estado_candidato || '').replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="ar-sede">{r.sede_nombre || '—'}</span>
                                        {r.sede_ciudad && <div className="ar-sub">{r.sede_ciudad}</div>}
                                    </td>
                                    <td className="ar-cargo">{r.cargo || '—'}</td>
                                    <td className="ar-fecha">{fmt(r.fecha_ingreso)}</td>
                                    <td className="ar-fecha">{fmt(r.fecha_retiro)}</td>
                                    <td className="ar-motivo" title={r.motivo_retiro}>
                                        {r.motivo_retiro ? r.motivo_retiro.slice(0, 35) + (r.motivo_retiro.length > 35 ? '…' : '') : '—'}
                                    </td>
                                    <td className="ar-sub ar-origen">{r.fuente_carga || r.origen_datos || '—'}</td>
                                    <td className="ar-sub">{fmtDt(r.creado)}</td>
                                    <td className="ar-actions">
                                        <button
                                            className="ar-act-btn edit"
                                            title="Editar registro"
                                            onClick={() => setEditando(r)}
                                        >
                                            <FiEdit2 size={13} />
                                        </button>
                                        <button
                                            className={`ar-act-btn delete${!r.puede_eliminar ? ' locked' : ''}`}
                                            title={r.puede_eliminar ? 'Eliminar registro' : r.razon_bloqueo}
                                            onClick={() => handleEliminar(r)}
                                        >
                                            {r.puede_eliminar ? <FiTrash2 size={13} /> : <FiLock size={12} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Cards móvil ────────────────────────────────────── */}
                <div className="ar-cards">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <div className="spinner" style={{ margin: '0 auto' }} />
                        </div>
                    ) : registros.length === 0 ? (
                        <div className="ar-tbl-empty">
                            {hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'No hay registros.'}
                        </div>
                    ) : registros.map(r => (
                        <div key={r.id} className={`ar-card${r.es_manual ? ' ar-card--manual' : ''}`}>
                            <div className="ar-card-top">
                                <div className="ar-card-id">
                                    <span className="ar-card-doc">{r.tipo_documento} {r.documento_id}</span>
                                    <span className="ar-card-name">{r.nombre_completo}</span>
                                    {r.email && <span className="ar-card-email">{r.email}</span>}
                                </div>
                                <div className="ar-card-actions">
                                    <button className="ar-act-btn edit" onClick={() => setEditando(r)}>
                                        <FiEdit2 size={13} />
                                    </button>
                                    <button
                                        className={`ar-act-btn delete${!r.puede_eliminar ? ' locked' : ''}`}
                                        title={r.puede_eliminar ? 'Eliminar' : r.razon_bloqueo}
                                        onClick={() => handleEliminar(r)}
                                    >
                                        {r.puede_eliminar ? <FiTrash2 size={13} /> : <FiLock size={12} />}
                                    </button>
                                </div>
                            </div>

                            <div className="ar-card-badges">
                                {r.tipo_proceso && (
                                    <span className="ar-pill" style={{ background: PROCESO_BG[r.tipo_proceso] || '#475569' }}>
                                        {r.tipo_proceso}
                                    </span>
                                )}
                                <span className="ar-estado" style={{ color: ESTADO_COLOR[r.estado_candidato] || '#94a3b8' }}>
                                    <span className="ar-dot" style={{ background: ESTADO_COLOR[r.estado_candidato] || '#94a3b8' }} />
                                    {(r.estado_candidato || '').replace(/_/g, ' ')}
                                </span>
                                {r.es_manual && <span className="ar-manual-badge">Manual</span>}
                            </div>

                            <div className="ar-card-details">
                                {r.sede_nombre && (
                                    <div className="ar-card-row">
                                        <span className="ar-card-lbl">Sede</span>
                                        <span className="ar-card-val">{r.sede_nombre}</span>
                                    </div>
                                )}
                                {r.cargo && (
                                    <div className="ar-card-row">
                                        <span className="ar-card-lbl">Cargo</span>
                                        <span className="ar-card-val">{r.cargo}</span>
                                    </div>
                                )}
                                {r.fecha_ingreso && (
                                    <div className="ar-card-row">
                                        <span className="ar-card-lbl">Ingreso</span>
                                        <span className="ar-card-val">{fmt(r.fecha_ingreso)}</span>
                                    </div>
                                )}
                                {r.fecha_retiro && (
                                    <div className="ar-card-row">
                                        <span className="ar-card-lbl">Retiro</span>
                                        <span className="ar-card-val">{fmt(r.fecha_retiro)}</span>
                                    </div>
                                )}
                                {r.fuente_carga && (
                                    <div className="ar-card-row" style={{ gridColumn: 'span 2' }}>
                                        <span className="ar-card-lbl">Origen</span>
                                        <span className="ar-card-val">{r.fuente_carga}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="ar-pagination">
                        <span className="ar-pag-info">{desde}–{hasta} de {total}</span>
                        <div className="ar-pag-controls">
                            <button className="ar-pag-btn" onClick={() => irAPagina(page - 1)} disabled={page === 1}>
                                <FiChevronLeft size={14} />
                            </button>
                            {paginasVisibles().map((p, i) =>
                                p === '...' ? (
                                    <span key={`d${i}`} className="ar-pag-dots">···</span>
                                ) : (
                                    <button key={p} className={`ar-pag-btn${p === page ? ' active' : ''}`} onClick={() => irAPagina(p)}>
                                        {p}
                                    </button>
                                )
                            )}
                            <button className="ar-pag-btn" onClick={() => irAPagina(page + 1)} disabled={page === totalPages}>
                                <FiChevronRight size={14} />
                            </button>
                        </div>
                        <span className="ar-pag-info">Pág. {page} de {totalPages}</span>
                    </div>
                )}
            </div>

            {/* Modal editar */}
            {editando && (
                <ModalEditarRegistro
                    registro={editando}
                    sedes={sedes}
                    onClose={() => setEditando(null)}
                    onGuardado={() => { setEditando(null); cargar(); }}
                />
            )}

            {/* Modal agregar */}
            {modalAgregar && (
                <ModalAgregarRegistro
                    onClose={() => setModalAgregar(false)}
                    onGuardado={() => { setModalAgregar(false); cargar(); }}
                />
            )}
        </div>
    );
};

export default AdminRegistros;
