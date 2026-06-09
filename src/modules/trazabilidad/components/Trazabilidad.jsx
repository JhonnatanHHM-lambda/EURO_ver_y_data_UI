import { useState } from 'react';
import { FiSearch, FiUpload, FiPlus, FiChevronLeft, FiChevronRight, FiFilter, FiX, FiGitBranch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import useTrazabilidad from '../hooks/useTrazabilidad';
import TrazabilidadDetalle from './TrazabilidadDetalle';
import ModalAgregarRegistro from './ModalAgregarRegistro';
import '../utils/Trazabilidad.scss';

const ESTADO_COLORS = {
    REGISTRADO:                  { bg: 'rgba(100,116,139,.15)', color: '#94a3b8',  dot: '#64748b' },
    HABILITADO:                  { bg: 'rgba(34,197,94,.12)',   color: '#16a34a',  dot: '#22c55e' },
    INHABILITADO:                { bg: 'rgba(239,68,68,.12)',   color: '#b91c1c',  dot: '#ef4444' },
    VERIFICACION_PARCIAL:        { bg: 'rgba(245,158,11,.12)',  color: '#b45309',  dot: '#f59e0b' },
    REVISION_MANUAL_AUTORIZADA:  { bg: 'rgba(99,102,241,.12)', color: '#4338ca',  dot: '#6366f1' },
    REVISION_MANUAL_RECHAZADA:   { bg: 'rgba(239,68,68,.12)',  color: '#b91c1c',  dot: '#ef4444' },
};

const PROCESO_COLORS = {
    EMPLEADO:     { bg: '#16a34a', color: '#fff' },
    RETIRADO:     { bg: '#64748b', color: '#fff' },
    SELECCIONADO: { bg: '#6366f1', color: '#fff' },
    CANDIDATO:    { bg: '#f59e0b', color: '#1a1a1f' },
    APRENDIZ:     { bg: '#0ea5e9', color: '#fff' },
    ENTREVISTADO: { bg: '#8b5cf6', color: '#fff' },
};

const EstadoBadge = ({ estado }) => {
    const c = ESTADO_COLORS[estado] || ESTADO_COLORS.REGISTRADO;
    return (
        <span className="vyd-estado">
            <span className="vyd-estado-dot" style={{ background: c.dot }} />
            <span style={{ color: c.color, fontSize: 11.5, fontWeight: 600 }}>
                {estado?.replace(/_/g, ' ')}
            </span>
        </span>
    );
};

const ProcesoPill = ({ tipo }) => {
    const c = PROCESO_COLORS[tipo] || { bg: '#64748b', color: '#fff' };
    return (
        <span className="vyd-pill" style={{ background: c.bg, color: c.color, fontSize: 9.5, padding: '3px 10px' }}>
            {tipo || '—'}
        </span>
    );
};

const Trazabilidad = () => {
    const navigate              = useNavigate();
    const [drawerDoc,    setDrawerDoc]    = useState(null);
    const [modalAgregar, setModalAgregar] = useState(false);

    // Permiso para agregar registros manualmente
    const user     = JSON.parse(localStorage.getItem('user') || '{}');
    const canEdit  = user.is_superuser || (user.permisos_rol || []).includes('can_edit_registros');
    const {
        empleados, kpis, loading, loadingKpis,
        page, totalPages, total, PAGE_SIZE,
        filtros, filtrosTemp, setFiltrosTemp,
        ORIGENES, ESTADOS, PROCESOS,
        aplicarFiltros, limpiarFiltros, irAPagina,
        hayFiltrosActivos, sedeActiva,
    } = useTrazabilidad();

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
        <div className="vyd-main fade-in">
            {/* Header */}
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiGitBranch size={20} /> Trazabilidad</h1>
                    <p className="vyd-page-sub">
                        Historial unificado de candidatos y empleados
                        {sedeActiva && <> · <strong style={{ color: 'var(--accent)' }}>{sedeActiva.nombre}</strong></>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="vyd-btn-sm ghost" onClick={() => navigate('/app/carga')}>
                        <FiUpload size={13} /> Cargar Excel
                    </button>
                    {canEdit && (
                        <button className="vyd-btn-sm" onClick={() => setModalAgregar(true)}>
                            <FiPlus size={13} /> Nuevo registro
                        </button>
                    )}
                </div>
            </div>

            {/* KPIs */}
            <div className="vyd-kpis">
                {[
                    { label: 'Total registros',  value: kpis?.total       ?? '—', variant: '' },
                    { label: 'Activos',           value: kpis?.activos     ?? '—', variant: 'ok' },
                    { label: 'Retirados',         value: kpis?.retirados   ?? '—', variant: 'mute' },
                    { label: 'Inhabilitados',     value: kpis?.inhabilitados ?? '—', variant: 'danger' },
                ].map(k => (
                    <div key={k.label} className={`vyd-kpi${k.variant ? ` ${k.variant}` : ''}`}>
                        <div className="vyd-kpi-num">{loadingKpis ? '—' : k.value.toLocaleString()}</div>
                        <div className="vyd-kpi-lbl">{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Filtros + tabla */}
            <div className="vyd-panel vyd-table-panel">
                {/* Toolbar */}
                <div className="vyd-table-head">
                    <div style={{ flex: 1 }}>
                        <div className="vyd-panel-title">Tabla central · empleados y candidatos</div>
                        {total > 0 && (
                            <div className="vyd-panel-sub">
                                {total} registros{hayFiltrosActivos ? ' (filtrado)' : ''} · mostrando {desde}–{hasta}
                            </div>
                        )}
                    </div>
                    <div className="vyd-toolbar" style={{ flexWrap: 'wrap' }}>
                        <div className="vyd-search" style={{ minWidth: 220, flex: 1 }}>
                            <FiSearch size={14} />
                            <input
                                placeholder="Buscar por documento o nombre..."
                                value={filtrosTemp.search}
                                onChange={e => setFiltrosTemp(f => ({ ...f, search: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>
                        <button className="vyd-btn-sm ghost" onClick={() => document.getElementById('vyd-filtros-panel').classList.toggle('open')}>
                            <FiFilter size={13} /> Filtros {hayFiltrosActivos && <span className="vyd-filter-dot" />}
                        </button>
                        {hayFiltrosActivos && (
                            <button className="vyd-btn-sm ghost" onClick={limpiarFiltros} style={{ color: 'var(--danger)' }}>
                                <FiX size={13} /> Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Panel de filtros expandible */}
                <div id="vyd-filtros-panel" className="vyd-filtros-panel">
                    <div className="vyd-form-grid" style={{ padding: '12px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                        <div className="vyd-form-group">
                            <label>Origen de datos</label>
                            <select value={filtrosTemp.origen_datos} onChange={e => setFiltrosTemp(f => ({ ...f, origen_datos: e.target.value }))}>
                                <option value="">Todos los orígenes</option>
                                {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="vyd-form-group">
                            <label>Estado candidato</label>
                            <select value={filtrosTemp.estado} onChange={e => setFiltrosTemp(f => ({ ...f, estado: e.target.value }))}>
                                <option value="">Todos los estados</option>
                                {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        <div className="vyd-form-group">
                            <label>Tipo de proceso</label>
                            <select value={filtrosTemp.tipo_proceso} onChange={e => setFiltrosTemp(f => ({ ...f, tipo_proceso: e.target.value }))}>
                                <option value="">Todos los procesos</option>
                                {PROCESOS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="vyd-form-group" style={{ justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                            <button className="vyd-btn-sm" onClick={aplicarFiltros}>Aplicar</button>
                            <button className="vyd-btn-sm ghost" onClick={limpiarFiltros}>Limpiar</button>
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="vyd-tbl-wrap">
                    <table className="vyd-tbl">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Nombre completo</th>
                                <th>Origen</th>
                                <th>Sede</th>
                                <th>Cargo</th>
                                <th>Proceso</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }} />
                                </td></tr>
                            ) : empleados.length === 0 ? (
                                <tr><td colSpan={7} className="vyd-tbl-empty">
                                    {hayFiltrosActivos ? 'Sin resultados para los filtros aplicados.' : 'No hay registros. Carga un Excel para comenzar.'}
                                </td></tr>
                            ) : (
                                empleados.map(emp => (
                                    <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => setDrawerDoc(emp.documento_id)}>
                                        <td>
                                            <span className="vyd-doc-mono" style={{ fontFamily: 'ui-monospace,monospace', color: 'var(--fg1)', fontWeight: 600 }}>
                                                {emp.tipo_documento} {emp.documento_id}
                                            </span>
                                        </td>
                                        <td className="vyd-nm">
                                            <strong>{emp.nombre_completo}</strong>
                                            {emp.email && <div style={{ fontSize: 10.5, color: 'var(--fg3)', marginTop: 1 }}>{emp.email}</div>}
                                        </td>
                                        <td><span style={{ fontSize: 11, color: 'var(--fg3)' }}>{emp.origen_datos || '—'}</span></td>
                                        <td>
                                            <span style={{ fontSize: 12, color: 'var(--fg2)' }}>{emp.sede_nombre || '—'}</span>
                                            {emp.sede_ciudad && <div style={{ fontSize: 10, color: 'var(--fg4)' }}>{emp.sede_ciudad}</div>}
                                        </td>
                                        <td style={{ color: 'var(--fg2)', fontSize: 12 }}>{emp.cargo || '—'}</td>
                                        <td><ProcesoPill tipo={emp.tipo_proceso} /></td>
                                        <td><EstadoBadge estado={emp.estado_candidato} /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Cards móvil ─────────────────────────────────────────────────── */}
                <div className="vyd-cards">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <div className="spinner" style={{ margin: '0 auto' }} />
                        </div>
                    ) : empleados.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--fg4)', fontSize: 13 }}>
                            {hayFiltrosActivos ? 'Sin resultados para los filtros aplicados.' : 'No hay registros. Carga un Excel para comenzar.'}
                        </div>
                    ) : empleados.map(emp => (
                        <div key={emp.id} className="vyd-card-row" onClick={() => setDrawerDoc(emp.documento_id)}>
                            <div className="vyd-card-top">
                                <div>
                                    <span className="vyd-card-doc">{emp.tipo_documento} {emp.documento_id}</span>
                                    <div className="vyd-card-name">{emp.nombre_completo}</div>
                                    {emp.email && <div className="vyd-card-email">{emp.email}</div>}
                                </div>
                            </div>
                            <div className="vyd-card-badges">
                                {emp.tipo_proceso && <ProcesoPill tipo={emp.tipo_proceso} />}
                                <EstadoBadge estado={emp.estado_candidato} />
                            </div>
                            {(emp.sede_nombre || emp.cargo) && (
                                <div className="vyd-card-meta">
                                    {emp.sede_nombre && <span className="vyd-card-meta-item"><strong>{emp.sede_nombre}</strong>{emp.sede_ciudad ? ` · ${emp.sede_ciudad}` : ''}</span>}
                                    {emp.cargo && <span className="vyd-card-meta-item">{emp.cargo}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="vyd-pagination">
                        <span className="vyd-pag-info">{desde}–{hasta} de {total}</span>
                        <div className="vyd-pag-controls">
                            <button className="vyd-pag-btn" onClick={() => irAPagina(page - 1)} disabled={page === 1}>
                                <FiChevronLeft size={14} />
                            </button>
                            {paginasVisibles().map((p, i) =>
                                p === '...' ? (
                                    <span key={`dots-${i}`} className="vyd-pag-dots">···</span>
                                ) : (
                                    <button
                                        key={p}
                                        className={`vyd-pag-btn${p === page ? ' active' : ''}`}
                                        onClick={() => irAPagina(p)}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                            <button className="vyd-pag-btn" onClick={() => irAPagina(page + 1)} disabled={page === totalPages}>
                                <FiChevronRight size={14} />
                            </button>
                        </div>
                        <span className="vyd-pag-info">Página {page} de {totalPages}</span>
                    </div>
                )}
            </div>

            {/* Drawer de detalle */}
            {drawerDoc && (
                <TrazabilidadDetalle
                    documento={drawerDoc}
                    onClose={() => setDrawerDoc(null)}
                />
            )}

            {/* Modal agregar registro / nueva casilla */}
            {modalAgregar && (
                <ModalAgregarRegistro
                    onClose={() => setModalAgregar(false)}
                    onGuardado={(documentoId) => {
                        setModalAgregar(false);
                        setDrawerDoc(documentoId);
                    }}
                />
            )}
        </div>
    );
};

export default Trazabilidad;
