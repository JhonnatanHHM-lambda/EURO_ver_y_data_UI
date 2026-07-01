import { useState } from 'react';
import {
    FiMail, FiDownload, FiRefreshCw, FiChevronDown, FiChevronUp, FiPlus,
} from 'react-icons/fi';
import useOptimizacionCorreos from '../hooks/useOptimizacionCorreos';
import ModalEjecutar from './ModalEjecutar';
import TablaResultados from './TablaResultados';
import '../utils/OptimizacionCorreos.scss';

const ESTADO_BADGE_EJECUCION = {
    PENDIENTE:   { bg: 'rgba(100,116,139,.15)', color: '#475569' },
    EN_PROCESO:  { bg: 'rgba(99,102,241,.12)',  color: '#4338ca' },
    COMPLETADA:  { bg: 'rgba(34,197,94,.12)',   color: '#16a34a' },
    ERROR:       { bg: 'rgba(239,68,68,.12)',   color: '#b91c1c' },
};

const fmtFecha = (f) =>
    f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
    }) : '—';

const EjecucionBadge = ({ estado }) => {
    const c = ESTADO_BADGE_EJECUCION[estado] || ESTADO_BADGE_EJECUCION.PENDIENTE;
    return (
        <span style={{
            background: c.bg, color: c.color,
            padding: '2px 8px', borderRadius: 10,
            fontSize: 11, fontWeight: 600,
        }}>
            {estado?.replace('_', ' ')}
        </span>
    );
};

const FILTROS = [
    { value: '',               label: 'Todos' },
    { value: 'CONCILIADA',     label: 'Conciliada' },
    { value: 'SOLO_RADIAN',    label: 'Solo RADIAN' },
    { value: 'SOLO_CORREO',    label: 'Solo Correo' },
    { value: 'REVISION_MANUAL', label: 'Revisión Manual' },
];

const OptimizacionCorreos = () => {
    const [modalAbierto, setModalAbierto]     = useState(false);
    const [historialAbierto, setHistorialAbierto] = useState(false);

    const {
        ejecuciones,
        ejecucionActual,
        resultados,
        filtroEstado,
        cargando,
        ejecutando,
        totalResultados,
        cargarEjecuciones,
        ejecutarConsolidacion,
        cargarResultados,
        seleccionarEjecucion,
        exportarExcel,
    } = useOptimizacionCorreos();

    const handleFiltroEstado = (estado) => {
        if (ejecucionActual) {
            cargarResultados(ejecucionActual.id, estado);
        }
    };

    const ejecucionesHistorial = ejecuciones.filter(
        e => !ejecucionActual || e.id !== ejecucionActual.id
    );

    return (
        <div className="vyd-main fade-in">
            {/* ── Cabecera ──────────────────────────────────────────────────── */}
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title">
                        <FiMail size={20} /> Optimización Correos
                    </h1>
                    <p className="vyd-page-sub">
                        Conciliación RADIAN vs. correo electrónico
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="vyd-btn-sm ghost"
                        onClick={cargarEjecuciones}
                        title="Recargar"
                        disabled={cargando}
                    >
                        <FiRefreshCw size={13} />
                    </button>
                    <button
                        className="vyd-btn-sm"
                        onClick={() => setModalAbierto(true)}
                        disabled={ejecutando}
                    >
                        <FiPlus size={13} /> Nueva Consolidación
                    </button>
                </div>
            </div>

            {/* ── Indicador de progreso ──────────────────────────────────────── */}
            {ejecutando && (
                <div className="vyd-oc-procesando">
                    <div className="spinner" />
                    <span>
                        Procesando consolidación… esto puede tomar hasta 2 minutos.
                        {ejecucionActual && (
                            <> Período: <strong>{fmtFecha(ejecucionActual.fecha_desde)}</strong> —{' '}
                            <strong>{fmtFecha(ejecucionActual.fecha_hasta)}</strong></>
                        )}
                    </span>
                </div>
            )}

            {/* ── Error de la última ejecución ──────────────────────────────── */}
            {ejecucionActual?.estado === 'ERROR' && ejecucionActual.error_mensaje && (
                <div className="vyd-oc-error">
                    <strong>Error en la ejecución:</strong> {ejecucionActual.error_mensaje}
                </div>
            )}

            {/* ── KPIs (solo cuando hay ejecución completada) ───────────────── */}
            {ejecucionActual?.estado === 'COMPLETADA' && !ejecutando && (
                <div className="vyd-oc-kpis">
                    {[
                        { label: 'Total RADIAN',    value: ejecucionActual.total_radian,      variant: 'azul' },
                        { label: 'Total Correo',    value: ejecucionActual.total_correo,      variant: 'morado' },
                        { label: 'Conciliadas',     value: ejecucionActual.total_conciliadas, variant: 'verde' },
                        { label: 'Solo RADIAN',     value: ejecucionActual.total_solo_radian, variant: 'naranja' },
                        { label: 'Solo Correo',     value: ejecucionActual.total_solo_correo, variant: 'amarillo' },
                        { label: 'Revisión Manual', value: ejecucionActual.total_revision,    variant: 'rojo' },
                    ].map(k => (
                        <div key={k.label} className={`vyd-oc-kpi ${k.variant}`}>
                            <div className="vyd-oc-kpi__num">{k.value ?? '—'}</div>
                            <div className="vyd-oc-kpi__lbl">{k.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Panel de resultados ───────────────────────────────────────── */}
            {ejecucionActual?.estado === 'COMPLETADA' && !ejecutando && (
                <div className="vyd-panel vyd-table-panel">
                    {/* Toolbar tabla */}
                    <div className="vyd-table-head">
                        <div style={{ flex: 1 }}>
                            <div className="vyd-panel-title">Resultados de conciliación</div>
                            <div className="vyd-panel-sub">
                                {totalResultados} registro{totalResultados !== 1 ? 's' : ''}
                                {filtroEstado ? ` · filtrado por ${filtroEstado.replace('_', ' ')}` : ''}
                                {' · '}Período {fmtFecha(ejecucionActual.fecha_desde)} — {fmtFecha(ejecucionActual.fecha_hasta)}
                            </div>
                        </div>
                        <button
                            className="vyd-btn-sm"
                            onClick={() => exportarExcel(ejecucionActual.id)}
                            title="Exportar a Excel"
                        >
                            <FiDownload size={13} /> Exportar Excel
                        </button>
                    </div>

                    {/* Filtros de estado */}
                    <div className="vyd-oc-filtros" style={{ padding: '8px 20px 0' }}>
                        {FILTROS.map(f => (
                            <button
                                key={f.value}
                                className={`vyd-oc-chip ${f.value} ${filtroEstado === f.value ? 'active' : ''}`}
                                onClick={() => handleFiltroEstado(f.value)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Tabla */}
                    <TablaResultados resultados={resultados} cargando={cargando} />
                </div>
            )}

            {/* ── Estado vacío inicial ──────────────────────────────────────── */}
            {!ejecucionActual && !ejecutando && !cargando && (
                <div className="vyd-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <FiMail size={40} style={{ color: 'var(--fg4)', marginBottom: 12 }} />
                    <div style={{ fontSize: 14, color: 'var(--fg3)', marginBottom: 8 }}>
                        No hay ejecuciones aún.
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg4)' }}>
                        Haz clic en <strong>Nueva Consolidación</strong> para iniciar la conciliación.
                    </div>
                </div>
            )}

            {/* ── Historial de ejecuciones ──────────────────────────────────── */}
            {ejecucionesHistorial.length > 0 && (
                <div className="vyd-oc-historial">
                    <button
                        className="vyd-oc-historial__toggle"
                        onClick={() => setHistorialAbierto(h => !h)}
                    >
                        {historialAbierto ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        Historial de ejecuciones ({ejecucionesHistorial.length})
                    </button>

                    {historialAbierto && (
                        <div className="vyd-oc-historial__lista">
                            {ejecucionesHistorial.map(e => (
                                <div key={e.id} className="vyd-oc-hist-item">
                                    <div className="vyd-oc-hist-item__rango">
                                        {fmtFecha(e.fecha_desde)} — {fmtFecha(e.fecha_hasta)}
                                    </div>
                                    <div className="vyd-oc-hist-item__kpis">
                                        <span>R: {e.total_radian}</span>
                                        <span>C: {e.total_correo}</span>
                                        <span>✓ {e.total_conciliadas}</span>
                                    </div>
                                    <EjecucionBadge estado={e.estado} />
                                    <button
                                        className="vyd-oc-hist-item__btn"
                                        onClick={() => seleccionarEjecucion(e)}
                                    >
                                        Ver resultados
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal ejecutar ────────────────────────────────────────────── */}
            {modalAbierto && (
                <ModalEjecutar
                    onEjecutar={ejecutarConsolidacion}
                    onCerrar={() => setModalAbierto(false)}
                    ejecutando={ejecutando}
                />
            )}
        </div>
    );
};

export default OptimizacionCorreos;
