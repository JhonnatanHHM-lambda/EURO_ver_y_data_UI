import { useState, useEffect, useCallback } from 'react';
import {
    FiBriefcase, FiSearch, FiRefreshCw, FiChevronDown, FiEye,
    FiCheckCircle, FiFileText, FiAlertTriangle,
} from 'react-icons/fi';
import api from '../../../services/api';
import ContratoDetalle from '../../contratos/components/ContratoDetalle';
import { TIPO_CARTA_LABEL } from '../../contratos/hooks/useContratos';
import '../utils/Contrataciones.scss';

const fmtFecha = (f) =>
    f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDatetime = (dt) =>
    dt ? new Date(dt).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const TIPO_ICON = {
    NO_PRORROGA: { icon: <FiAlertTriangle size={12} />, color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    PRORROGA:    { icon: <FiRefreshCw     size={12} />, color: '#6366f1', bg: 'rgba(99,102,241,.12)' },
    TERMINACION: { icon: <FiAlertTriangle size={12} />, color: '#ef4444', bg: 'rgba(239,68,68,.12)'  },
};

const Contrataciones = () => {
    const [search, setSearch]       = useState('');
    const [data, setData]           = useState({ empleados: [], total_empleados: 0, total_contratos: 0 });
    const [loading, setLoading]     = useState(true);
    const [expandidos, setExpandidos] = useState({});
    const [contratoId, setContratoId] = useState(null);

    const cargar = useCallback(async (q = '') => {
        setLoading(true);
        try {
            const params = q ? `?search=${encodeURIComponent(q)}` : '';
            const res = await api.get(`contratos/contrataciones/${params}`);
            setData(res.data);
            // Expandir todos por defecto si hay pocos empleados
            if (res.data.total_empleados <= 5) {
                const exp = {};
                res.data.empleados.forEach(e => { exp[e.documento_id] = true; });
                setExpandidos(exp);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const toggleEmpleado = (docId) =>
        setExpandidos(p => ({ ...p, [docId]: !p[docId] }));

    return (
        <div className="vyd-main fade-in">
            {/* Header */}
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiBriefcase size={20} /> Contrataciones</h1>
                    <p className="vyd-page-sub">Historial de documentos firmados por empleado</p>
                </div>
                <button className="vyd-btn-sm ghost" onClick={() => cargar(search)} title="Recargar">
                    <FiRefreshCw size={13} />
                </button>
            </div>

            {/* KPIs */}
            <div className="vyd-kpis">
                <div className="vyd-kpi ok">
                    <div className="vyd-kpi-num">{loading ? '—' : data.total_empleados.toLocaleString()}</div>
                    <div className="vyd-kpi-lbl">Empleados</div>
                </div>
                <div className="vyd-kpi">
                    <div className="vyd-kpi-num">{loading ? '—' : data.total_contratos.toLocaleString()}</div>
                    <div className="vyd-kpi-lbl">Documentos firmados</div>
                </div>
            </div>

            {/* Panel */}
            <div className="vyd-panel vyd-table-panel">
                {/* Toolbar */}
                <div className="vyd-table-head">
                    <div className="vyd-panel-title" style={{ flex: 1 }}>Empleados con contratos firmados</div>
                    <div className="vyd-search" style={{ minWidth: 260 }}>
                        <FiSearch size={14} />
                        <input
                            placeholder="Buscar por nombre o documento..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && cargar(search)}
                        />
                    </div>
                </div>

                {/* Lista */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}>
                        <div className="spinner" />
                    </div>
                ) : data.empleados.length === 0 ? (
                    <div className="vyd-tbl-empty">
                        {search
                            ? 'Sin resultados para la búsqueda.'
                            : 'No hay contratos firmados aún.'}
                    </div>
                ) : (
                    <div className="ctn-empleados-list">
                        {data.empleados.map(emp => {
                            const abierto = !!expandidos[emp.documento_id];
                            return (
                                <div key={emp.documento_id} className="ctn-empleado-card">
                                    {/* Cabecera empleado */}
                                    <button
                                        className="ctn-empleado-header"
                                        onClick={() => toggleEmpleado(emp.documento_id)}
                                    >
                                        <div className="ctn-emp-avatar">
                                            {emp.nombre_completo.trim()[0]}
                                        </div>
                                        <div className="ctn-empleado-info">
                                            <strong>{emp.nombre_completo}</strong>
                                            <span>{emp.tipo_documento} {emp.documento_id}</span>
                                        </div>
                                        <div className="ctn-empleado-meta">
                                            <span className="ctn-doc-count">
                                                <FiCheckCircle size={11} />
                                                {emp.total_documentos ?? emp.contratos.length} doc{(emp.total_documentos ?? emp.contratos.length) !== 1 ? 's' : ''}
                                            </span>
                                            {/* Mini-badges de tipos */}
                                            <div className="ctn-tipo-pills">
                                                {['NO_PRORROGA', 'PRORROGA', 'TERMINACION'].map(tipo => {
                                                    const n = emp.contratos.filter(c => c.tipo_carta === tipo).length;
                                                    if (!n) return null;
                                                    const m = TIPO_ICON[tipo];
                                                    return (
                                                        <span key={tipo} className="ctn-mini-pill"
                                                            style={{ color: m.color, background: m.bg }}>
                                                            {m.icon} {n}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <FiChevronDown size={14} className={`ctn-chevron${abierto ? ' open' : ''}`} />
                                        </div>
                                    </button>

                                    {/* Contratos del empleado */}
                                    {abierto && (
                                        <div className="ctn-contratos-list">
                                            {emp.contratos.map(c => {
                                                const m = TIPO_ICON[c.tipo_carta];
                                                return (
                                                    <div
                                                        key={c.id}
                                                        className="ctn-contrato-row"
                                                        onClick={() => setContratoId(c.id)}
                                                        title="Ver detalle"
                                                    >
                                                        <span className="ctn-tipo-badge"
                                                            style={{ color: m?.color, background: m?.bg }}>
                                                            {m?.icon} {TIPO_CARTA_LABEL[c.tipo_carta] || c.tipo_carta}
                                                        </span>
                                                        <span className="ctn-row-cargo">{c.cargo || '—'}</span>
                                                        <span className="ctn-row-sede">{c.sede_nombre || '—'}</span>
                                                        <div className="ctn-row-fechas">
                                                            <span>Vence: <strong>{fmtFecha(c.fecha_finalizacion)}</strong></span>
                                                            <span style={{ color: '#16a34a' }}>
                                                                <FiCheckCircle size={10} /> Firmado: {fmtDatetime(c.fecha_firma)}
                                                            </span>
                                                        </div>
                                                        <button className="ctn-ver-btn" onClick={e => { e.stopPropagation(); setContratoId(c.id); }}>
                                                            <FiEye size={13} /> Ver
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Drawer detalle */}
            {contratoId && (
                <ContratoDetalle
                    contratoId={contratoId}
                    onClose={() => setContratoId(null)}
                    onProrrogar={() => Promise.resolve(false)}
                    onTerminar={() => Promise.resolve(false)}
                    onActualizado={() => { setContratoId(null); cargar(search); }}
                />
            )}
        </div>
    );
};

export default Contrataciones;
