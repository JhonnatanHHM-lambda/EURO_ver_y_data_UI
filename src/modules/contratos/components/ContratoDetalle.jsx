import { useState, useEffect } from 'react';
import {
    FiX, FiUser, FiCalendar, FiMapPin, FiMail, FiPhone,
    FiFileText, FiClock, FiAlertTriangle, FiCheckCircle,
    FiExternalLink, FiDownload, FiMessageSquare,
} from 'react-icons/fi';
import api from '../../../services/api';
import ModalDecision from './ModalDecision';
import { ESTADO_COLORS, ESTADOS_LABEL, TIPO_CARTA_LABEL } from '../hooks/useContratos';

const fmtFecha = (f) =>
    f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDatetime = (dt) =>
    dt ? new Date(dt).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const EVENTO_META = {
    GENERADO:           { icon: <FiFileText size={13} />,     color: '#6366f1', label: 'Contrato generado' },
    ENVIADO_EMAIL:      { icon: <FiMail size={13} />,         color: '#0ea5e9', label: 'Email enviado' },
    ENVIADO_WA:         { icon: <FiMessageSquare size={13} />,color: '#22c55e', label: 'WhatsApp enviado' },
    ACCESO_FIRMA:       { icon: <FiExternalLink size={13} />, color: '#f59e0b', label: 'Acceso a firma' },
    FIRMADO:            { icon: <FiCheckCircle size={13} />,  color: '#16a34a', label: 'Firmado' },
    ESCALADO:           { icon: <FiAlertTriangle size={13} />,color: '#ef4444', label: 'Escalado a director' },
    DECISION_DIRECTOR:  { icon: <FiUser size={13} />,         color: '#8b5cf6', label: 'Decisión de director' },
    ERROR:              { icon: <FiAlertTriangle size={13} />,color: '#ef4444', label: 'Error' },
};

const EstadoBadge = ({ estado }) => {
    const c = ESTADO_COLORS[estado] || ESTADO_COLORS.SIN_CANAL_CONTACTO;
    return (
        <span className="vyd-estado" style={{ background: c.bg, padding: '4px 10px', borderRadius: 20 }}>
            <span className="vyd-estado-dot" style={{ background: c.dot }} />
            <span style={{ color: c.color, fontSize: 11.5, fontWeight: 600 }}>
                {ESTADOS_LABEL[estado] || estado?.replace(/_/g, ' ')}
            </span>
        </span>
    );
};

const ContratoDetalle = ({ contratoId, onClose, onProrrogar, onTerminar, onActualizado }) => {
    const [contrato, setContrato]           = useState(null);
    const [loading, setLoading]             = useState(true);
    const [modalDecision, setModalDecision] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            try {
                const res = await api.get(`contratos/${contratoId}/`);
                setContrato(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [contratoId]);

    const handleDecision = async (tipo, datos) => {
        let ok = false;
        if (tipo === 'prorrogar') ok = await onProrrogar(contratoId, datos);
        else ok = await onTerminar(contratoId, datos);
        if (ok) { setModalDecision(false); onActualizado(); }
    };

    const puedeDecidir = contrato?.estado === 'PENDIENTE_DECISION_DIRECTOR';

    return (
        <>
            {/* Overlay */}
            <div className="ctr-drawer-overlay" onClick={onClose} />

            {/* Drawer */}
            <div className="ctr-drawer">
                {/* Header del drawer */}
                <div className="ctr-drawer-header">
                    <div>
                        <div className="ctr-drawer-title">Detalle del contrato</div>
                        {contrato && (
                            <div className="ctr-drawer-sub">
                                {contrato.tipo_documento} {contrato.documento_id}
                            </div>
                        )}
                    </div>
                    <button className="ctr-drawer-close" onClick={onClose}><FiX size={18} /></button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
                        <div className="spinner" />
                    </div>
                ) : !contrato ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg4)' }}>No se pudo cargar el contrato.</div>
                ) : (
                    <div className="ctr-drawer-body">

                        {/* Estado actual */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                            <EstadoBadge estado={contrato.estado} />
                            <span className="ctr-tipo-pill">{TIPO_CARTA_LABEL[contrato.tipo_carta] || contrato.tipo_carta}</span>
                            {contrato.contador_escalamientos > 0 && (
                                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                                    <FiAlertTriangle size={11} style={{ marginRight: 3 }} />
                                    {contrato.contador_escalamientos} escalamiento{contrato.contador_escalamientos !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Info empleado */}
                        <div className="ctr-section">
                            <div className="ctr-section-title"><FiUser size={13} /> Empleado</div>
                            <div className="ctr-info-grid">
                                <div className="ctr-info-row">
                                    <span className="ctr-info-label">Nombre</span>
                                    <span className="ctr-info-value"><strong>{contrato.nombre_completo}</strong></span>
                                </div>
                                <div className="ctr-info-row">
                                    <span className="ctr-info-label">Documento</span>
                                    <span className="ctr-info-value" style={{ fontFamily: 'ui-monospace,monospace' }}>
                                        {contrato.tipo_documento} {contrato.documento_id}
                                    </span>
                                </div>
                                <div className="ctr-info-row">
                                    <span className="ctr-info-label">Cargo</span>
                                    <span className="ctr-info-value">{contrato.cargo || '—'}</span>
                                </div>
                                {contrato.sede_nombre && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label"><FiMapPin size={11} /> Sede</span>
                                        <span className="ctr-info-value">{contrato.sede_nombre}{contrato.sede_codigo ? ` (${contrato.sede_codigo})` : ''}</span>
                                    </div>
                                )}
                                {contrato.email && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label"><FiMail size={11} /> Email</span>
                                        <span className="ctr-info-value">{contrato.email}</span>
                                    </div>
                                )}
                                {contrato.celular && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label"><FiPhone size={11} /> Celular</span>
                                        <span className="ctr-info-value">{contrato.celular}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info contrato */}
                        <div className="ctr-section">
                            <div className="ctr-section-title"><FiCalendar size={13} /> Contrato</div>
                            <div className="ctr-info-grid">
                                {contrato.fecha_inicio_contrato && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label">Inicio</span>
                                        <span className="ctr-info-value">{fmtFecha(contrato.fecha_inicio_contrato)}</span>
                                    </div>
                                )}
                                <div className="ctr-info-row">
                                    <span className="ctr-info-label">Vencimiento</span>
                                    <span className="ctr-info-value" style={{ fontWeight: 600 }}>{fmtFecha(contrato.fecha_finalizacion)}</span>
                                </div>
                                {contrato.fecha_firma && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label">Fecha firma</span>
                                        <span className="ctr-info-value" style={{ color: '#16a34a' }}>{fmtDatetime(contrato.fecha_firma)}</span>
                                    </div>
                                )}
                                {contrato.ip_confirmacion && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label">IP firma</span>
                                        <span className="ctr-info-value" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11 }}>{contrato.ip_confirmacion}</span>
                                    </div>
                                )}
                                {contrato.duracion_prorroga && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label">Prórroga</span>
                                        <span className="ctr-info-value">{contrato.duracion_prorroga.replace('_', ' ')}</span>
                                    </div>
                                )}
                                {contrato.fecha_fin_prorroga && (
                                    <div className="ctr-info-row">
                                        <span className="ctr-info-label">Nueva fecha fin</span>
                                        <span className="ctr-info-value">{fmtFecha(contrato.fecha_fin_prorroga)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PDFs */}
                        {(contrato.pdf_carta_key || contrato.pdf_firmado_key) && (
                            <div className="ctr-section">
                                <div className="ctr-section-title"><FiDownload size={13} /> Documentos PDF</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {contrato.pdf_carta_key && (
                                        <div className="ctr-doc-item">
                                            <FiFileText size={14} style={{ color: '#6366f1' }} />
                                            <span style={{ flex: 1, fontSize: 12 }}>Carta {TIPO_CARTA_LABEL[contrato.tipo_carta] || ''}</span>
                                            <span style={{ fontSize: 11, color: 'var(--fg4)' }}>generado</span>
                                        </div>
                                    )}
                                    {contrato.pdf_firmado_key && (
                                        <div className="ctr-doc-item">
                                            <FiCheckCircle size={14} style={{ color: '#16a34a' }} />
                                            <span style={{ flex: 1, fontSize: 12 }}>Documento firmado</span>
                                            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>firmado</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Documentos adicionales */}
                        {contrato.documentos_adicionales?.length > 0 && (
                            <div className="ctr-section">
                                <div className="ctr-section-title"><FiFileText size={13} /> Documentos adicionales</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {contrato.documentos_adicionales.map(doc => (
                                        <div key={doc.id} className="ctr-doc-item">
                                            <FiFileText size={13} style={{ color: 'var(--fg3)' }} />
                                            <span style={{ flex: 1, fontSize: 12, color: 'var(--fg2)' }}>{doc.nombre_archivo}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Eventos / trazabilidad */}
                        {contrato.eventos?.length > 0 && (
                            <div className="ctr-section">
                                <div className="ctr-section-title"><FiClock size={13} /> Historial</div>
                                <div className="ctr-timeline">
                                    {contrato.eventos.map((ev, idx) => {
                                        const meta = EVENTO_META[ev.tipo_evento] || { icon: <FiClock size={13} />, color: '#64748b', label: ev.tipo_evento };
                                        const isLast = idx === contrato.eventos.length - 1;
                                        return (
                                            <div key={ev.id} className={`ctr-tl-item${isLast ? ' last' : ''}`}>
                                                <div className="ctr-tl-dot" style={{ background: meta.color }} />
                                                <div className="ctr-tl-card">
                                                    <div className="ctr-tl-header">
                                                        <span style={{ color: meta.color, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
                                                            {meta.icon} {meta.label}
                                                        </span>
                                                        <span className="ctr-tl-time">{fmtDatetime(ev.timestamp)}</span>
                                                    </div>
                                                    {ev.detalle && Object.keys(ev.detalle).length > 0 && (
                                                        <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 4 }}>
                                                            {Object.entries(ev.detalle).map(([k, v]) => (
                                                                <span key={k} style={{ marginRight: 10 }}>
                                                                    <strong>{k}:</strong> {String(v)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Acciones director */}
                        {puedeDecidir && (
                            <div className="ctr-actions-footer">
                                <p style={{ fontSize: 12, color: 'var(--fg3)', margin: '0 0 12px' }}>
                                    Este contrato requiere una decisión antes de vencer.
                                </p>
                                <button className="vyd-btn-sm" onClick={() => setModalDecision(true)} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                                    Tomar decisión
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal decisión */}
            {modalDecision && (
                <ModalDecision
                    contrato={contrato}
                    onClose={() => setModalDecision(false)}
                    onConfirmar={handleDecision}
                />
            )}
        </>
    );
};

export default ContratoDetalle;
