import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    FiFileText, FiSearch, FiFilter, FiX,
    FiChevronLeft, FiChevronRight, FiRefreshCw,
    FiSettings, FiZap, FiPlay, FiTrash2,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import useContratos, { ESTADO_COLORS, ESTADOS_LABEL, TIPO_CARTA_LABEL } from '../hooks/useContratos';
import ContratoDetalle from './ContratoDetalle';
import AsignacionesCentro from './AsignacionesCentro';
import '../utils/Contratos.scss';

const fmtFecha = (f) =>
    f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const diasRestantes = (fechaStr) => {
    if (!fechaStr) return null;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin = new Date(fechaStr + 'T00:00:00');
    return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
};

const EstadoBadge = ({ estado }) => {
    const c = ESTADO_COLORS[estado] || ESTADO_COLORS.SIN_CANAL_CONTACTO;
    return (
        <span className="vyd-estado">
            <span className="vyd-estado-dot" style={{ background: c.dot }} />
            <span style={{ color: c.color, fontSize: 11, fontWeight: 600 }}>
                {ESTADOS_LABEL[estado] || estado?.replace(/_/g, ' ') || '—'}
            </span>
        </span>
    );
};

const Contratos = () => {
    const [contratoId,       setContratoId]       = useState(null);
    const [verAsignaciones,  setVerAsignaciones]  = useState(false);
    const [escaneando,       setEscaneando]       = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // Auto-abrir detalle cuando se navega desde una notificación (?abrirContrato=<id>)
    useEffect(() => {
        const id = searchParams.get('abrirContrato');
        if (id) {
            setContratoId(parseInt(id, 10));
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const _user            = JSON.parse(localStorage.getItem('user') || '{}');
    const permisos         = _user.permisos_rol || [];
    const esSU             = _user.is_superuser || permisos.includes('can_manage_users');
    const puedeEscanear    = esSU || permisos.includes('can_escanear_siesa');
    const puedeAsignaciones = esSU || permisos.includes('can_manage_asignaciones');

    const [creandoDemo,   setCreandoDemo]   = useState(false);
    const [limpiadoDemo, setLimpiandoDemo] = useState(false);

    const handleCrearDemo = async () => {
        let sedes = [];
        try {
            const { data } = await api.get('sedes/');
            sedes = data;
        } catch (_) { /* continúa sin sedes */ }

        const opcionesHtml = sedes.length > 0
            ? sedes.map(s => `<option value="${s.id}">${s.nombre}${s.ciudad ? ` — ${s.ciudad}` : ''}</option>`).join('')
            : '<option value="">Sin sedes activas</option>';

        const emailDefault = _user.correo || _user.email || '';

        const { isConfirmed, value } = await Swal.fire({
            title: 'Crear contrato demo',
            width: 520,
            html: `
                <p style="font-size:12px;color:#888;margin-bottom:14px">
                    Contrato ficticio que vence en <b>2 días</b> — para demostrar el flujo completo.
                </p>
                <div style="display:grid;gap:10px;text-align:left">
                    <div>
                        <label style="font-size:12px;display:block;margin-bottom:3px">Nombre completo *</label>
                        <input id="d-nombre" class="swal2-input" style="margin:0;width:100%"
                            placeholder="Ej: Juan Pérez García" value="Demo Empleado Prueba">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                        <div>
                            <label style="font-size:12px;display:block;margin-bottom:3px">N.º documento *</label>
                            <input id="d-doc" class="swal2-input" style="margin:0;width:100%"
                                placeholder="Ej: 1234567890" value="9999000001">
                        </div>
                        <div>
                            <label style="font-size:12px;display:block;margin-bottom:3px">Cargo</label>
                            <input id="d-cargo" class="swal2-input" style="margin:0;width:100%"
                                placeholder="Ej: Cajero" value="Cargo de Demostración">
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                        <div>
                            <label style="font-size:12px;display:block;margin-bottom:3px">
                                Email <span style="color:#888">(link de firma)</span>
                            </label>
                            <input id="d-email" class="swal2-input" type="email" style="margin:0;width:100%"
                                placeholder="correo@ejemplo.com" value="${emailDefault}">
                        </div>
                        <div>
                            <label style="font-size:12px;display:block;margin-bottom:3px">
                                Celular <span style="color:#888">(WhatsApp)</span>
                            </label>
                            <input id="d-celular" class="swal2-input" type="tel" style="margin:0;width:100%"
                                placeholder="Ej: 3001234567">
                        </div>
                    </div>
                    <div>
                        <label style="font-size:12px;display:block;margin-bottom:3px">Sede</label>
                        <select id="d-sede" class="swal2-select" style="margin:0;width:100%">
                            ${opcionesHtml}
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Crear demo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
            focusConfirm: false,
            preConfirm: () => {
                const nombre  = document.getElementById('d-nombre')?.value?.trim();
                const doc     = document.getElementById('d-doc')?.value?.trim();
                const cargo   = document.getElementById('d-cargo')?.value?.trim();
                const email   = document.getElementById('d-email')?.value?.trim();
                const celular = document.getElementById('d-celular')?.value?.trim();
                const sedeEl  = document.getElementById('d-sede');
                const sedeId  = sedeEl?.value ? parseInt(sedeEl.value, 10) : null;
                if (!nombre) { Swal.showValidationMessage('El nombre es requerido'); return false; }
                if (!doc)    { Swal.showValidationMessage('El número de documento es requerido'); return false; }
                return { nombre, doc, cargo, email, celular, sedeId };
            },
        });
        if (!isConfirmed || !value) return;

        setCreandoDemo(true);
        try {
            const { data } = await api.post('contratos/crear-demo/', {
                nombre_completo: value.nombre,
                documento_id:    value.doc,
                cargo:           value.cargo || 'Cargo de Demostración',
                email:           value.email,
                celular:         value.celular,
                sede_id:         value.sedeId,
            });
            await Swal.fire({
                icon: 'success',
                title: 'Demo creado',
                text: data.mensaje,
                timer: 3500,
                showConfirmButton: false,
            });
            recargar();
            setContratoId(data.id);
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e.response?.data?.error || 'No se pudo crear el contrato demo.',
            });
        } finally {
            setCreandoDemo(false);
        }
    };

    const handleLimpiarDemos = async () => {
        const conf = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar todos los demos?',
            text: 'Se borrarán todos los contratos cuyo documento empiece con "DEMO", junto con sus archivos en MinIO. Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });
        if (!conf.isConfirmed) return;

        setLimpiandoDemo(true);
        try {
            const { data } = await api.delete('contratos/crear-demo/');
            await Swal.fire({
                icon: 'success',
                title: 'Demos eliminados',
                text: data.mensaje,
                timer: 3000,
                showConfirmButton: false,
            });
            recargar();
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.error || 'No se pudieron eliminar los demos.' });
        } finally {
            setLimpiandoDemo(false);
        }
    };

    const handleEscanear = async () => {
        const conf = await Swal.fire({
            icon: 'question',
            title: '¿Consultar SIESA?',
            text: 'Se procesarán los contratos próximos a vencer (60 días) y se generarán las notificaciones correspondientes.',
            showCancelButton: true,
            confirmButtonText: 'Sí, escanear',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6366f1',
        });
        if (!conf.isConfirmed) return;
        setEscaneando(true);
        try {
            const { data } = await api.post('contratos/escanear/');
            await Swal.fire({
                icon: 'success',
                title: 'Escaneo completado',
                text: data.mensaje,
                timer: 3000,
                showConfirmButton: false,
            });
            recargar();
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error en escaneo', text: e.response?.data?.error || 'Error inesperado.' });
        } finally {
            setEscaneando(false);
        }
    };

    const {
        contratos, resumen, loading, loadingResumen,
        page, setPage, total, totalPages, PAGE_SIZE,
        filtros, filtrosTemp, setFiltrosTemp,
        aplicarFiltros, limpiarFiltros, hayFiltrosActivos,
        ESTADOS,
        prorrogar, terminar, condicionesGH, notificarEmpleado, recargar,
    } = useContratos();

    const desde = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
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
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiFileText size={20} /> Vencimientos</h1>
                    <p className="vyd-page-sub">Gestión de vencimientos activos, firma digital y decisiones de director</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {esSU && (
                        <button
                            className="vyd-btn-sm ghost"
                            onClick={handleCrearDemo}
                            disabled={creandoDemo}
                            title="Crear contrato ficticio para probar el flujo completo"
                            style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                        >
                            <FiPlay size={13} /> {creandoDemo ? 'Creando...' : 'Demo'}
                        </button>
                    )}
                    {esSU && (
                        <button
                            className="vyd-btn-sm ghost"
                            onClick={handleLimpiarDemos}
                            disabled={limpiadoDemo}
                            title="Eliminar todos los contratos demo"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                        >
                            <FiTrash2 size={13} />
                        </button>
                    )}
                    {puedeEscanear && (
                        <button
                            className="vyd-btn-sm ghost"
                            onClick={handleEscanear}
                            disabled={escaneando}
                            title="Consultar SIESA y generar contratos"
                        >
                            <FiZap size={13} /> {escaneando ? 'Escaneando...' : 'Consultar SIESA'}
                        </button>
                    )}
                    {puedeAsignaciones && (
                        <button
                            className="vyd-btn-sm ghost"
                            onClick={() => setVerAsignaciones(true)}
                            title="Gestionar asignaciones de centro"
                        >
                            <FiSettings size={13} />
                        </button>
                    )}
                    <button className="vyd-btn-sm ghost" onClick={recargar} title="Recargar datos">
                        <FiRefreshCw size={13} />
                    </button>
                </div>
            </div>

            {/* ── KPIs ───────────────────────────────────────────────────────── */}
            <div className="vyd-kpis">
                {[
                    { label: 'Total contratos',    value: resumen?.total              ?? '—', variant: '' },
                    { label: 'Pendiente firma',     value: resumen?.pendiente_firma    ?? '—', variant: 'warn' },
                    { label: 'Pend. director',      value: resumen?.pendiente_decision ?? '—', variant: '' },
                    { label: 'Firmados',            value: resumen?.firmados           ?? '—', variant: 'ok' },
                    { label: 'Sin contacto',        value: resumen?.sin_canal          ?? '—', variant: 'mute' },
                ].map(k => (
                    <div key={k.label} className={`vyd-kpi${k.variant ? ` ${k.variant}` : ''}`}>
                        <div className="vyd-kpi-num">
                            {loadingResumen ? '—' : (typeof k.value === 'number' ? k.value.toLocaleString() : k.value)}
                        </div>
                        <div className="vyd-kpi-lbl">{k.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Panel tabla ────────────────────────────────────────────────── */}
            <div className="vyd-panel vyd-table-panel">

                {/* Toolbar */}
                <div className="vyd-table-head">
                    <div style={{ flex: 1 }}>
                        <div className="vyd-panel-title">Contratos por vencer</div>
                        {total > 0 && (
                            <div className="vyd-panel-sub">
                                {total} registro{total !== 1 ? 's' : ''}{hayFiltrosActivos ? ' (filtrado)' : ''}
                                {total > PAGE_SIZE ? ` · mostrando ${desde}–${hasta}` : ''}
                            </div>
                        )}
                    </div>
                    <div className="vyd-toolbar" style={{ flexWrap: 'wrap' }}>
                        <div className="vyd-search" style={{ minWidth: 220, flex: 1 }}>
                            <FiSearch size={14} />
                            <input
                                placeholder="Buscar por nombre, documento o cargo..."
                                value={filtrosTemp.search}
                                onChange={e => setFiltrosTemp(f => ({ ...f, search: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>
                        <button
                            className="vyd-btn-sm ghost"
                            onClick={() => document.getElementById('ctr-filtros-panel').classList.toggle('open')}
                        >
                            <FiFilter size={13} /> Filtros {hayFiltrosActivos && <span className="vyd-filter-dot" />}
                        </button>
                        {hayFiltrosActivos && (
                            <button className="vyd-btn-sm ghost" onClick={limpiarFiltros} style={{ color: 'var(--danger)' }}>
                                <FiX size={13} /> Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtros expandibles */}
                <div id="ctr-filtros-panel" className="vyd-filtros-panel">
                    <div className="vyd-form-grid" style={{ padding: '12px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                        <div className="vyd-form-group">
                            <label>Estado</label>
                            <select
                                value={filtrosTemp.estado}
                                onChange={e => setFiltrosTemp(f => ({ ...f, estado: e.target.value }))}
                            >
                                <option value="">Todos los estados</option>
                                {ESTADOS.map(e => <option key={e} value={e}>{ESTADOS_LABEL[e]}</option>)}
                            </select>
                        </div>
                        <div className="vyd-form-group" style={{ justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                            <button className="vyd-btn-sm" onClick={aplicarFiltros}>Aplicar</button>
                            <button className="vyd-btn-sm ghost" onClick={limpiarFiltros}>Limpiar</button>
                        </div>
                    </div>
                </div>

                {/* ── Tabla desktop ───────────────────────────────────────────── */}
                <div className="vyd-tbl-wrap">
                    <table className="vyd-tbl">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Documento</th>
                                <th>Cargo</th>
                                <th>Sede</th>
                                <th>Tipo carta</th>
                                <th>Estado</th>
                                <th>Vence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }} />
                                </td></tr>
                            ) : contratos.length === 0 ? (
                                <tr><td colSpan={7} className="vyd-tbl-empty">
                                    {hayFiltrosActivos
                                        ? 'Sin resultados para los filtros aplicados.'
                                        : 'No hay contratos registrados. Ejecuta el escaneo SIESA para generar contratos.'}
                                </td></tr>
                            ) : contratos.map(c => {
                                const dias = diasRestantes(c.fecha_finalizacion);
                                // Dentro del umbral de alerta o ya expirado → el director debe decidir
                                const enUmbral = dias !== null && c.dias_alerta_director != null && dias <= c.dias_alerta_director;
                                const estadoDisplay = (c.estado === 'PENDIENTE_FIRMA_NO_PRORROGA' && enUmbral)
                                    ? 'PENDIENTE_DECISION_DIRECTOR'
                                    : c.estado;
                                return (
                                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setContratoId(c.id)}>
                                        <td className="vyd-nm">
                                            <strong>{c.nombre_completo}</strong>
                                            {c.email && <div style={{ fontSize: 10.5, color: 'var(--fg3)', marginTop: 1 }}>{c.email}</div>}
                                        </td>
                                        <td>
                                            <span className="vyd-doc-mono">{c.tipo_documento} {c.documento_id}</span>
                                        </td>
                                        <td style={{ color: 'var(--fg2)', fontSize: 12 }}>{c.cargo || '—'}</td>
                                        <td style={{ color: 'var(--fg2)', fontSize: 12 }}>{c.sede_nombre || '—'}</td>
                                        <td>
                                            <span className="ctr-tipo-pill">{TIPO_CARTA_LABEL[c.tipo_carta] || c.tipo_carta}</span>
                                        </td>
                                        <td><EstadoBadge estado={estadoDisplay} /></td>
                                        <td>
                                            <span style={{ fontSize: 12, color: 'var(--fg2)' }}>{fmtFecha(c.fecha_finalizacion)}</span>
                                            {dias !== null && (
                                                <div style={{
                                                    fontSize: 10, marginTop: 1,
                                                    color: dias < 0 ? '#ef4444' : dias <= 7 ? '#ef4444' : dias <= 30 ? '#f59e0b' : 'var(--fg4)',
                                                    fontWeight: dias <= 7 ? 600 : 400,
                                                }}>
                                                    {dias < 0
                                                        ? `Venció hace ${Math.abs(dias)}d`
                                                        : dias === 0 ? 'Vence hoy'
                                                        : `${dias}d restantes`}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Cards móvil ─────────────────────────────────────────────── */}
                <div className="vyd-cards">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : contratos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--fg4)', fontSize: 13 }}>
                            {hayFiltrosActivos ? 'Sin resultados para los filtros aplicados.' : 'No hay contratos registrados aún.'}
                        </div>
                    ) : contratos.map(c => {
                        const dias = diasRestantes(c.fecha_finalizacion);
                        const enUmbral = dias !== null && c.dias_alerta_director != null && dias <= c.dias_alerta_director;
                        const estadoDisplay = (c.estado === 'PENDIENTE_FIRMA_NO_PRORROGA' && enUmbral)
                            ? 'PENDIENTE_DECISION_DIRECTOR'
                            : c.estado;
                        return (
                            <div key={c.id} className="vyd-card-row" onClick={() => setContratoId(c.id)}>
                                <div className="vyd-card-top">
                                    <span className="vyd-card-doc">{c.tipo_documento} {c.documento_id}</span>
                                    <div className="vyd-card-name">{c.nombre_completo}</div>
                                    {c.email && <div className="vyd-card-email">{c.email}</div>}
                                </div>
                                <div className="vyd-card-badges">
                                    <span className="ctr-tipo-pill" style={{ fontSize: 10 }}>{TIPO_CARTA_LABEL[c.tipo_carta] || c.tipo_carta}</span>
                                    <EstadoBadge estado={estadoDisplay} />
                                </div>
                                <div className="vyd-card-meta">
                                    {c.sede_nombre && <span className="vyd-card-meta-item"><strong>{c.sede_nombre}</strong></span>}
                                    {c.cargo && <span className="vyd-card-meta-item">{c.cargo}</span>}
                                    {c.fecha_finalizacion && (
                                        <span className="vyd-card-meta-item" style={{ color: dias !== null && dias <= 7 ? '#ef4444' : undefined }}>
                                            Vence: {fmtFecha(c.fecha_finalizacion)}{dias !== null ? ` · ${dias < 0 ? `venció hace ${Math.abs(dias)}d` : `${dias}d`}` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="vyd-pagination">
                        <span className="vyd-pag-info">{desde}–{hasta} de {total}</span>
                        <div className="vyd-pag-controls">
                            <button className="vyd-pag-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                                <FiChevronLeft size={14} />
                            </button>
                            {paginasVisibles().map((p, i) =>
                                p === '...'
                                    ? <span key={`d${i}`} className="vyd-pag-dots">···</span>
                                    : <button key={p} className={`vyd-pag-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                            )}
                            <button className="vyd-pag-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                                <FiChevronRight size={14} />
                            </button>
                        </div>
                        <span className="vyd-pag-info">Página {page} de {totalPages}</span>
                    </div>
                )}
            </div>

            {/* ── Drawer detalle ─────────────────────────────────────────────── */}
            {contratoId && (
                <ContratoDetalle
                    contratoId={contratoId}
                    onClose={() => setContratoId(null)}
                    onProrrogar={prorrogar}
                    onTerminar={terminar}
                    onCondicionesGH={condicionesGH}
                    onNotificarEmpleado={notificarEmpleado}
                    onActualizado={() => { setContratoId(null); recargar(); }}
                />
            )}

            {/* ── Drawer asignaciones ─────────────────────────────────────────── */}
            {verAsignaciones && (
                <AsignacionesCentro onClose={() => setVerAsignaciones(false)} />
            )}
        </div>
    );
};

export default Contratos;
