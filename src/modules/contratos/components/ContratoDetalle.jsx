import { useState, useEffect } from 'react';
import {
    FiX, FiUser, FiCalendar, FiMapPin, FiMail, FiPhone,
    FiFileText, FiClock, FiAlertTriangle, FiCheckCircle,
    FiExternalLink, FiDownload, FiBell, FiAlertCircle,
    FiEdit2, FiSend, FiCheck,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import ModalDecision from './ModalDecision';
import ModalCondicionesGH from './ModalCondicionesGH';
import { ESTADO_COLORS, ESTADOS_LABEL, TIPO_CARTA_LABEL } from '../hooks/useContratos';

const fmtFecha = (f) =>
    f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDatetime = (dt) =>
    dt ? new Date(dt).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const EVENTO_META = {
    GENERADO:           { icon: <FiFileText size={13} />,     color: '#6366f1', label: 'Contrato generado' },
    ENVIADO_EMAIL:      { icon: <FiMail size={13} />,         color: '#0ea5e9', label: 'Email enviado' },
    ACCESO_FIRMA:       { icon: <FiExternalLink size={13} />, color: '#f59e0b', label: 'Acceso a firma' },
    FIRMADO:            { icon: <FiCheckCircle size={13} />,  color: '#16a34a', label: 'Firmado' },
    ESCALADO:           { icon: <FiAlertTriangle size={13} />, color: '#ef4444', label: 'Escalado a director' },
    DECISION_DIRECTOR:  { icon: <FiUser size={13} />,          color: '#8b5cf6', label: 'Decisión de director' },
    CONDICIONES_GH:     { icon: <FiCheckCircle size={13} />,   color: '#0ea5e9', label: 'Condiciones GH' },
    NOTIFICACION_EMPLEADO: { icon: <FiBell size={13} />,       color: '#a855f7', label: 'Notificación al empleado' },
    ERROR:              { icon: <FiAlertTriangle size={13} />, color: '#ef4444', label: 'Error' },
};

const renderDetalle = (tipo, detalle) => {
    if (!detalle || Object.keys(detalle).length === 0) return null;

    if (tipo === 'ESCALADO') {
        const { motivo, nro, dias, dias_restantes, dias_vencido } = detalle;
        let texto = '';
        if (motivo === 'revision_proximos_vencer') {
            texto = `Dentro del umbral de alerta de sede — faltan ${dias} día(s) para vencer`;
        } else if (motivo === 'alerta_urgente_vencimiento') {
            texto = dias_restantes <= 0
                ? `Alerta urgente — contrato vencido hace ${Math.abs(dias_restantes)} día(s)`
                : `Alerta urgente — ${dias_restantes} día(s) para el vencimiento`;
        } else if (motivo === 'fix_expirados_sin_firma') {
            texto = `Contrato expirado hace ${dias_vencido} día(s) sin firma del empleado`;
        } else if (motivo === 'fix_proximos_umbral_director') {
            texto = `Dentro del umbral de alerta — ${dias_restantes} día(s) restantes`;
        } else if (nro != null) {
            texto = `Escalamiento #${nro} — empleado sin firma`;
        } else {
            texto = Object.entries(detalle).map(([k, v]) => `${k}: ${v}`).join(' · ');
        }
        return <span>{texto}</span>;
    }

    if (tipo === 'DECISION_DIRECTOR') {
        const ACCIONES = { PRORROGA: 'Prórroga', TERMINACION: 'Terminación' };
        const accion = ACCIONES[detalle.accion] || detalle.accion;
        return <span>Decisión: <strong>{accion}</strong></span>;
    }

    if (tipo === 'FIRMADO' && detalle.tipo === 'NO_PRORROGA_SECUENCIAL') {
        return <span>Carta de no prórroga firmada (flujo secuencial)</span>;
    }

    return (
        <>
            {Object.entries(detalle).map(([k, v]) => (
                <span key={k} style={{ marginRight: 10 }}>
                    <strong>{k}:</strong> {String(v)}
                </span>
            ))}
        </>
    );
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

const ContratoDetalle = ({ contratoId, onClose, onProrrogar, onTerminar, onCondicionesGH, onNotificarEmpleado, onActualizado }) => {
    const [contrato, setContrato]               = useState(null);
    const [loading, setLoading]                 = useState(true);
    const [modalDecision, setModalDecision]     = useState(false);
    const [modalCondGH, setModalCondGH]         = useState(false);
    const [notificando, setNotificando]         = useState(false);
    const [editContacto, setEditContacto]       = useState(false);
    const [editEmail, setEditEmail]             = useState('');
    const [editCelular, setEditCelular]         = useState('');
    const [guardandoContacto, setGuardandoContacto] = useState(false);
    const [reenviando, setReenviando]           = useState(false);

    const _user    = JSON.parse(localStorage.getItem('user') || '{}');
    const permisos = _user.permisos_rol || [];
    const esSU     = _user.is_superuser;
    const esGH          = esSU || permisos.includes('can_set_condiciones_contratos');
    const esDir         = esSU || permisos.includes('can_decide_contratos');
    const puedeReenviar = esSU || permisos.includes('can_view_contratos');

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

    const handleDecision = async (tipo) => {
        let ok = false;
        if (tipo === 'prorrogar') ok = await onProrrogar(contratoId);
        else ok = await onTerminar(contratoId);
        if (ok) { setModalDecision(false); onActualizado(); }
    };

    const handleCondicionesGH = async (datos) => {
        const ok = await onCondicionesGH(contratoId, datos);
        if (ok) { setModalCondGH(false); onActualizado(); }
    };

    const handleNotificarEmpleado = async () => {
        setNotificando(true);
        const ok = await onNotificarEmpleado(contratoId);
        setNotificando(false);
        if (ok) onActualizado();
    };

    const abrirEditContacto = () => {
        setEditEmail(contrato?.email || '');
        setEditCelular(contrato?.celular || '');
        setEditContacto(true);
    };

    const handleGuardarContacto = async () => {
        setGuardandoContacto(true);
        try {
            const res = await api.patch(`contratos/${contratoId}/contacto/`, { email: editEmail, celular: editCelular });
            setContrato(prev => ({ ...prev, email: res.data.email, celular: res.data.celular }));
            setEditContacto(false);
        } catch (e) {
            const msg = e.response?.data?.error || 'No se pudo guardar el contacto.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } finally {
            setGuardandoContacto(false);
        }
    };

    const handleReenviarNotificacion = async () => {
        const { isConfirmed } = await Swal.fire({
            icon: 'question',
            title: '¿Reenviar notificación?',
            html: `Se enviará nuevamente el correo${contrato?.celular ? ' y WhatsApp' : ''} con el link de firma a <strong>${contrato?.nombre_completo}</strong>.<br><br><small id="swal-reenvio-ctr" style="color:#94a3b8">Podrás confirmar en <strong id="swal-reenvio-sec">10</strong> segundo(s)</small>`,
            showCancelButton: true,
            confirmButtonText: 'Reenviar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0ea5e9',
            didOpen: () => {
                const btn = Swal.getConfirmButton();
                btn.disabled = true;
                let secs = 10;
                const interval = setInterval(() => {
                    secs--;
                    const secEl = document.getElementById('swal-reenvio-sec');
                    const ctrEl = document.getElementById('swal-reenvio-ctr');
                    if (secs <= 0) {
                        clearInterval(interval);
                        btn.disabled = false;
                        if (ctrEl) ctrEl.style.display = 'none';
                    } else {
                        if (secEl) secEl.textContent = secs;
                    }
                }, 1000);
            },
        });
        if (!isConfirmed) return;

        setReenviando(true);
        try {
            await api.post(`contratos/${contratoId}/reenviar-notificacion/`);
            Swal.fire({ icon: 'success', title: 'Notificación reenviada', text: 'El empleado recibirá el link de firma nuevamente.', timer: 2500, showConfirmButton: false });
        } catch (e) {
            const msg = e.response?.data?.error || 'No se pudo reenviar la notificación.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } finally {
            setReenviando(false);
        }
    };

    // Fallback: el task puede fallar un día — cubrimos el umbral de la sede directamente
    const _hoy = new Date(); _hoy.setHours(0, 0, 0, 0);
    const _fechaFin = contrato?.fecha_finalizacion ? new Date(contrato.fecha_finalizacion + 'T00:00:00') : null;
    const _diasRestantes = _fechaFin !== null ? Math.ceil((_fechaFin - _hoy) / 86400000) : null;
    const _enUmbral = _diasRestantes !== null && contrato?.dias_alerta_director != null
        && _diasRestantes <= contrato.dias_alerta_director;

    // Director decide: flujo normal (PENDIENTE_DECISION_DIRECTOR) o dentro del umbral sin firma del empleado
    const puedeDecidir = esDir &&
        (contrato?.estado === 'PENDIENTE_DECISION_DIRECTOR' ||
         (contrato?.estado === 'PENDIENTE_FIRMA_NO_PRORROGA' && _enUmbral)) &&
        contrato?.tipo_carta === 'NO_PRORROGA';
    // GH define condiciones: estado PENDIENTE_CONDICIONES_GH
    const puedeCondGH = esGH && contrato?.estado === 'PENDIENTE_CONDICIONES_GH';
    // Notificar al empleado: TERMINACION → director, PRORROGA → GH
    const puedeNotificarEmpleado = contrato?.estado === 'PENDIENTE_NOTIFICACION_EMPLEADO' && (
        contrato?.tipo_carta === 'TERMINACION' ? esDir : esGH
    );

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
                            <EstadoBadge estado={
                                (contrato.estado === 'PENDIENTE_FIRMA_NO_PRORROGA' && _enUmbral)
                                    ? 'PENDIENTE_DECISION_DIRECTOR'
                                    : contrato.estado
                            } />
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
                                {editContacto ? (
                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8, padding: '6px 0' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FiMail size={11} /> Email
                                            </label>
                                            <input
                                                type="email"
                                                value={editEmail}
                                                onChange={e => setEditEmail(e.target.value)}
                                                className="ctr-input"
                                                style={{ fontSize: 12.5 }}
                                                placeholder="correo@ejemplo.com"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FiPhone size={11} /> Celular
                                            </label>
                                            <input
                                                type="tel"
                                                value={editCelular}
                                                onChange={e => setEditCelular(e.target.value)}
                                                className="ctr-input"
                                                style={{ fontSize: 12.5 }}
                                                placeholder="3001234567"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                            <button
                                                className="vyd-btn-sm"
                                                onClick={handleGuardarContacto}
                                                disabled={guardandoContacto}
                                                style={{ fontSize: 12, padding: '5px 12px', gap: 5 }}
                                            >
                                                <FiCheck size={12} />
                                                {guardandoContacto ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <button
                                                className="vyd-btn-sm ghost"
                                                onClick={() => setEditContacto(false)}
                                                disabled={guardandoContacto}
                                                style={{ fontSize: 12, padding: '5px 12px' }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="ctr-info-row" style={{ gridColumn: '1 / -1' }}>
                                            <span className="ctr-info-label"><FiMail size={11} /> Email</span>
                                            <span className="ctr-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {contrato.email || <span style={{ color: 'var(--fg4)' }}>—</span>}
                                                <button
                                                    onClick={abrirEditContacto}
                                                    title="Editar contacto"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--fg4)', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <FiEdit2 size={11} />
                                                </button>
                                            </span>
                                        </div>
                                        <div className="ctr-info-row" style={{ gridColumn: '1 / -1' }}>
                                            <span className="ctr-info-label"><FiPhone size={11} /> Celular</span>
                                            <span className="ctr-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {contrato.celular || <span style={{ color: 'var(--fg4)' }}>—</span>}
                                                <button
                                                    onClick={abrirEditContacto}
                                                    title="Editar contacto"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--fg4)', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <FiEdit2 size={11} />
                                                </button>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Reenviar notificación — disponible para can_view_contratos cuando el proceso no está cerrado */}
                        {puedeReenviar && !['FIRMADO', 'CANCELADO'].includes(contrato.estado) && (
                            <div style={{ padding: '0 0 6px' }}>
                                <button
                                    className="vyd-btn-sm ghost"
                                    onClick={handleReenviarNotificacion}
                                    disabled={reenviando}
                                    style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: 12.5, padding: '7px 12px' }}
                                >
                                    <FiSend size={13} />
                                    {reenviando ? 'Reenviando...' : 'Reenviar notificación al empleado'}
                                </button>
                            </div>
                        )}

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

                        {/* Acción director: tomar decisión */}
                        {puedeDecidir && (
                            <div className="ctr-actions-footer" style={{ marginBottom: 8 }}>
                                {contrato.estado === 'PENDIENTE_FIRMA_NO_PRORROGA' && (
                                    <div style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                        background: 'rgba(245,158,11,.09)', border: '1px solid rgba(245,158,11,.35)',
                                        borderRadius: 10, padding: '11px 14px', marginBottom: 10,
                                    }}>
                                        <FiAlertCircle size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                                        <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>
                                            <strong>El empleado no ha firmado la carta de no prórroga.</strong>
                                            {' '}El contrato ha vencido o fue escalado. Puedes tomar la decisión igualmente;
                                            el empleado deberá firmar primero la carta de no prórroga antes de firmar la carta resultante.
                                        </div>
                                    </div>
                                )}
                                <button className="vyd-btn-sm" onClick={() => setModalDecision(true)} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                                    Tomar decisión
                                </button>
                            </div>
                        )}

                        {/* Aviso de firma secuencial pendiente */}
                        {contrato.no_prorroga_firmada === false && (
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                background: 'rgba(245,158,11,.09)', border: '1px solid rgba(245,158,11,.35)',
                                borderRadius: 10, padding: '11px 14px', marginBottom: 10,
                            }}>
                                <FiAlertCircle size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                                <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>
                                    <strong>Carta de no prórroga pendiente de firma.</strong>
                                    {' '}El empleado todavía no ha firmado la carta de no prórroga original.
                                    Cuando el director notifique, el empleado deberá firmarla primero antes de firmar
                                    la carta de {contrato.tipo_carta === 'PRORROGA' ? 'prórroga' : 'terminación'}.
                                </div>
                            </div>
                        )}

                        {/* Acción GH: definir condiciones */}
                        {puedeCondGH && (
                            <div className="ctr-actions-footer" style={{ marginBottom: 8 }}>
                                <div style={{ background: 'rgba(14,165,233,.08)', border: '1px solid rgba(14,165,233,.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, fontSize: 12.5, color: '#0ea5e9', lineHeight: 1.5 }}>
                                    El director decidió <strong>{contrato.tipo_carta === 'PRORROGA' ? 'prorrogar' : 'terminar'}</strong> este contrato.
                                    Define las condiciones para que el director pueda notificar al empleado.
                                </div>
                                <button
                                    className="vyd-btn-sm"
                                    onClick={() => setModalCondGH(true)}
                                    style={{ width: '100%', justifyContent: 'center', padding: '10px', background: contrato.tipo_carta === 'PRORROGA' ? '#6366f1' : '#ef4444' }}
                                >
                                    Definir condiciones
                                </button>
                            </div>
                        )}

                        {/* Condiciones GH ya definidas (visible para director en estado PENDIENTE_NOTIFICACION_EMPLEADO) */}
                        {contrato?.estado === 'PENDIENTE_NOTIFICACION_EMPLEADO' && (
                            <div className="ctr-section">
                                <div className="ctr-section-title" style={{ color: '#a855f7' }}>
                                    <FiCheckCircle size={13} /> Condiciones definidas por GH
                                </div>
                                <div className="ctr-info-grid">
                                    {contrato.tipo_carta === 'PRORROGA' && contrato.duracion_prorroga && (
                                        <>
                                            <div className="ctr-info-row">
                                                <span className="ctr-info-label">Duración prórroga</span>
                                                <span className="ctr-info-value">{contrato.duracion_prorroga.replace('_', ' ')}</span>
                                            </div>
                                            <div className="ctr-info-row">
                                                <span className="ctr-info-label">Sueldo</span>
                                                <span className="ctr-info-value">
                                                    {contrato.mantener_condiciones
                                                        ? 'Se mantiene'
                                                        : contrato.nuevo_sueldo ? `$${Number(contrato.nuevo_sueldo).toLocaleString('es-CO')}` : '—'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                    {contrato.tipo_carta === 'TERMINACION' && (
                                        <div className="ctr-info-row">
                                            <span className="ctr-info-label">Documentos</span>
                                            <span className="ctr-info-value" style={{ color: '#22c55e' }}>
                                                {(contrato.documentos_adicionales || []).filter(d => !d.es_carta_firmada).length} adjunto(s)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Acción director: notificar al empleado */}
                        {puedeNotificarEmpleado && (
                            <div className="ctr-actions-footer" style={{ marginBottom: 8 }}>
                                <div style={{ background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, fontSize: 12.5, color: '#a855f7', lineHeight: 1.5 }}>
                                    {contrato.tipo_carta === 'PRORROGA'
                                        ? 'Las condiciones de prórroga están definidas. Notifica al empleado para que firme la carta.'
                                        : 'Gestión Humana ya definió las condiciones. Notifica al empleado para que firme la carta.'}
                                </div>
                                <button
                                    className="vyd-btn-sm"
                                    onClick={handleNotificarEmpleado}
                                    disabled={notificando}
                                    style={{ width: '100%', justifyContent: 'center', padding: '10px', background: '#a855f7', gap: 8 }}
                                >
                                    <FiBell size={14} />
                                    {notificando ? 'Notificando...' : 'Notificar al empleado'}
                                </button>
                            </div>
                        )}

                        {/* Documentos — organizados por proceso */}
                        {(() => {
                            // Documentos del proceso actual: director-uploaded (es_carta_firmada=false)
                            const docsActuales = (contrato.documentos_adicionales || []).filter(d => !d.es_carta_firmada);
                            // Documentos de ciclos previos dentro de este contrato: cartas auto-preservadas
                            const docsCiclosPrevios = (contrato.documentos_adicionales || []).filter(d => d.es_carta_firmada);
                            const firmaSecuencial = contrato.no_prorroga_firmada === false;
                            const hayActual = contrato.pdf_carta_url || contrato.pdf_firmado_url || docsActuales.length > 0 || firmaSecuencial;
                            const hayPrevios = docsCiclosPrevios.length > 0;
                            const hayHistoricos = contrato.documentos_historicos?.length > 0;
                            if (!hayActual && !hayPrevios && !hayHistoricos) return null;

                            const DocLink = ({ href, icon, iconColor, label, tag, tagColor }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                    className="ctr-doc-item" style={{ textDecoration: 'none' }}>
                                    {icon}
                                    <span style={{ flex: 1, fontSize: 12, color: 'var(--fg2)' }}>
                                        {label}
                                        {tag && <span style={{ marginLeft: 6, fontSize: 10.5, color: tagColor, fontWeight: 600 }}>{tag}</span>}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: iconColor, fontWeight: 600 }}>
                                        <FiExternalLink size={11} /> Ver PDF
                                    </span>
                                </a>
                            );

                            const SectionLabel = ({ children }) => (
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '.06em', color: 'var(--fg4)', padding: '6px 0 4px',
                                    borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                                    {children}
                                </div>
                            );

                            return (
                                <div className="ctr-section">
                                    <div className="ctr-section-title"><FiDownload size={13} /> Documentos</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                                        {/* ── Proceso actual ── */}
                                        {hayActual && (
                                            <>
                                                <SectionLabel>
                                                    Proceso actual — {TIPO_CARTA_LABEL[contrato.tipo_carta] || contrato.tipo_carta}
                                                    <span style={{ fontWeight: 400, marginLeft: 6 }}>· vence {fmtFecha(contrato.fecha_finalizacion)}</span>
                                                </SectionLabel>

                                                {/* Carta del proceso actual (prórroga/terminación) — se genera al notificar al empleado */}
                                                {contrato.pdf_carta_url && (
                                                    <DocLink
                                                        href={contrato.pdf_carta_url}
                                                        icon={<FiClock size={14} style={{ color: '#f59e0b' }} />}
                                                        iconColor="#f59e0b"
                                                        label={`Carta ${TIPO_CARTA_LABEL[contrato.tipo_carta] || contrato.tipo_carta}`}
                                                        tag="pendiente firma"
                                                        tagColor="#f59e0b"
                                                    />
                                                )}
                                                {contrato.pdf_firmado_url && (
                                                    <DocLink
                                                        href={contrato.pdf_firmado_url}
                                                        icon={<FiCheckCircle size={14} style={{ color: '#16a34a' }} />}
                                                        iconColor="#16a34a"
                                                        label={`Carta ${TIPO_CARTA_LABEL[contrato.tipo_carta] || contrato.tipo_carta} firmada`}
                                                    />
                                                )}
                                                {docsActuales.map(doc => doc.url ? (
                                                    <DocLink key={doc.id}
                                                        href={doc.url}
                                                        icon={<FiFileText size={13} style={{ color: 'var(--accent)' }} />}
                                                        iconColor="var(--accent)"
                                                        label={doc.nombre_archivo}
                                                    />
                                                ) : (
                                                    <div key={doc.id} className="ctr-doc-item">
                                                        <FiFileText size={13} style={{ color: 'var(--fg3)' }} />
                                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--fg2)' }}>{doc.nombre_archivo}</span>
                                                    </div>
                                                ))}

                                                {/* Carta NO_PRORROGA — siempre al final porque es el paso previo (proceso más antiguo) */}
                                                {firmaSecuencial && contrato.pdf_no_prorroga_url && (
                                                    <DocLink
                                                        href={contrato.pdf_no_prorroga_url}
                                                        icon={<FiClock size={14} style={{ color: '#f59e0b' }} />}
                                                        iconColor="#f59e0b"
                                                        label="Carta No prórroga"
                                                        tag="pendiente firma empleado"
                                                        tagColor="#f59e0b"
                                                    />
                                                )}
                                                {firmaSecuencial && !contrato.pdf_no_prorroga_url && (
                                                    <div className="ctr-doc-item" style={{ opacity: 0.65 }}>
                                                        <FiClock size={14} style={{ color: '#f59e0b' }} />
                                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--fg2)' }}>
                                                            Carta No prórroga
                                                            <span style={{ marginLeft: 6, fontSize: 10.5, color: '#f59e0b', fontWeight: 600 }}>pendiente firma empleado</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* ── Ciclos previos (mismo contrato) ── */}
                                        {hayPrevios && (
                                            <>
                                                <SectionLabel>Ciclos previos — mismo contrato</SectionLabel>
                                                {docsCiclosPrevios.map(doc => doc.url ? (
                                                    <DocLink key={doc.id}
                                                        href={doc.url}
                                                        icon={<FiCheckCircle size={13} style={{ color: 'var(--fg4)' }} />}
                                                        iconColor="var(--fg4)"
                                                        label={doc.nombre_archivo}
                                                    />
                                                ) : (
                                                    <div key={doc.id} className="ctr-doc-item" style={{ opacity: 0.7 }}>
                                                        <FiFileText size={13} style={{ color: 'var(--fg3)' }} />
                                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--fg3)' }}>{doc.nombre_archivo}</span>
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {/* ── Contratos anteriores (otro ciclo contractual completo) ── */}
                                        {hayHistoricos && (
                                            <>
                                                <SectionLabel>Contratos anteriores</SectionLabel>
                                                {contrato.documentos_historicos.map(doc => (
                                                    <DocLink key={doc.id}
                                                        href={doc.url}
                                                        icon={doc.con_firma
                                                            ? <FiCheckCircle size={14} style={{ color: 'var(--fg4)' }} />
                                                            : <FiFileText size={14} style={{ color: 'var(--fg4)' }} />}
                                                        iconColor="var(--fg4)"
                                                        label={`Carta ${doc.tipo_carta_label}`}
                                                        tag={`· vence ${fmtFecha(doc.fecha_finalizacion)}`}
                                                        tagColor="var(--fg4)"
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Eventos / trazabilidad */}
                        {contrato.eventos?.length > 0 && (
                            <div className="ctr-section">
                                <div className="ctr-section-title"><FiClock size={13} /> Historial</div>
                                <div className="ctr-timeline">
                                    {contrato.eventos.filter(ev => ev.tipo_evento !== 'ENVIADO_WA').map((ev, idx, arr) => {
                                        const meta = EVENTO_META[ev.tipo_evento] || { icon: <FiClock size={13} />, color: '#64748b', label: ev.tipo_evento };
                                        const isLast = idx === arr.length - 1;
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
                                                            {renderDetalle(ev.tipo_evento, ev.detalle)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* Modal decisión director */}
            {modalDecision && (
                <ModalDecision
                    contrato={contrato}
                    onClose={() => setModalDecision(false)}
                    onConfirmar={handleDecision}
                />
            )}

            {/* Modal condiciones GH */}
            {modalCondGH && (
                <ModalCondicionesGH
                    contrato={contrato}
                    onClose={() => setModalCondGH(false)}
                    onConfirmar={handleCondicionesGH}
                />
            )}
        </>
    );
};

export default ContratoDetalle;
