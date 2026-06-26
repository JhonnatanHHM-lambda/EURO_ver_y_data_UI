import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FiCheckCircle, FiAlertTriangle, FiRotateCcw, FiFileText, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import '../utils/FirmaDigital.scss';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const fmtFecha = (f) =>
    f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

// ── Canvas de firma ───────────────────────────────────────────────────────────
const SignatureCanvas = ({ canvasRef, onChanged }) => {
    const drawing = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const sync = () => {
            const { width, height } = canvas.getBoundingClientRect();
            if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) {
                canvas.width  = Math.round(width);
                canvas.height = Math.round(height);
            }
        };
        sync();
        const ro = new ResizeObserver(sync);
        ro.observe(canvas);
        return () => ro.disconnect();
    }, [canvasRef]);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches?.[0];
        const cx = touch ? touch.clientX : e.clientX;
        const cy = touch ? touch.clientY : e.clientY;
        return { x: cx - rect.left, y: cy - rect.top };
    };

    const startDraw = (e) => {
        e.preventDefault();
        drawing.current = true;
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e, canvasRef.current);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!drawing.current) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e, canvasRef.current);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e293b';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        onChanged(true);
    };

    const stopDraw = () => { drawing.current = false; };

    return (
        <canvas
            ref={canvasRef}
            className="firma-canvas"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
        />
    );
};

// ── Página principal ──────────────────────────────────────────────────────────
const FirmaDigital = () => {
    const { token } = useParams();
    const canvasNoProrrogaRef = useRef(null);
    const canvasPrincipalRef  = useRef(null);

    // estado general de la página
    const [estado, setEstado]               = useState('cargando');
    const [datos, setDatos]                 = useState(null);
    const [errorMsg, setErrorMsg]           = useState('');

    // paso: 0 = firma NO_PRORROGA previa (solo si firma_previa_requerida)
    //        1 = verifica datos
    //        2 = firma documento principal
    const [paso, setPaso]                   = useState(1);

    // control de firmas
    const [tieneFirmaNoPr, setTieneFirmaNoPr]         = useState(false);
    const [tieneFirmaPrincipal, setTieneFirmaPrincipal] = useState(false);
    const [firmandoNoPr, setFirmandoNoPr]             = useState(false);
    const [firmandoPrincipal, setFirmandoPrincipal]   = useState(false);
    const [alertaBloqueo, setAlertaBloqueo]           = useState(false);

    useEffect(() => {
        const validar = async () => {
            try {
                const res = await axios.get(`${API_BASE}contratos/firma/${token}/`);
                setDatos(res.data);
                // Si necesita firma previa, comenzar en paso 0
                if (res.data.firma_previa_requerida) {
                    setPaso(0);
                }
                setEstado('listo');
            } catch (e) {
                const httpStatus = e.response?.status;
                if (httpStatus === 410 || e.response?.data?.expirado) {
                    setEstado('expirado');
                } else if (httpStatus === 404) {
                    setErrorMsg('El enlace de firma no es válido.');
                    setEstado('error');
                } else if (e.response?.data?.ya_firmado) {
                    setEstado('firmado');
                } else {
                    setErrorMsg(e.response?.data?.error || 'No se pudo cargar el documento. Verifica el enlace.');
                    setEstado('error');
                }
            }
        };
        validar();
    }, [token]);

    const limpiarCanvas = (ref, setter) => {
        const canvas = ref.current;
        if (!canvas) return;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        setter(false);
    };

    // Confirmar firma de la NO_PRORROGA previa
    const confirmarFirmaNoPr = async () => {
        if (!tieneFirmaNoPr) return;
        setFirmandoNoPr(true);
        try {
            const firma_data = canvasNoProrrogaRef.current.toDataURL('image/png');
            await axios.post(`${API_BASE}contratos/firma/${token}/confirmar-no-prorroga/`, { firma_data });
            // Refrescar datos para quitar firma_previa_requerida
            const res = await axios.get(`${API_BASE}contratos/firma/${token}/`);
            setDatos(res.data);
            setAlertaBloqueo(false);
            setPaso(1);
        } catch (e) {
            setErrorMsg(e.response?.data?.error || 'Error al procesar la firma. Intenta de nuevo.');
        } finally {
            setFirmandoNoPr(false);
        }
    };

    // Confirmar firma del documento principal (Prórroga / Terminación)
    const confirmarFirmaPrincipal = async () => {
        if (!tieneFirmaPrincipal) return;
        setFirmandoPrincipal(true);
        try {
            const firma_data = canvasPrincipalRef.current.toDataURL('image/png');
            await axios.post(`${API_BASE}contratos/firma/${token}/confirmar/`, { firma_data });
            setEstado('firmado');
        } catch (e) {
            if (e.response?.data?.firma_previa_requerida) {
                // El backend bloqueó porque la NO_PRORROGA no fue firmada:
                // mostrar alerta de bloqueo y regresar al paso 0
                setAlertaBloqueo(true);
                limpiarCanvas(canvasPrincipalRef, setTieneFirmaPrincipal);
                setPaso(0);
            } else {
                setErrorMsg(e.response?.data?.error || 'Error al procesar la firma. Intenta de nuevo.');
                setEstado('listo');
            }
        } finally {
            setFirmandoPrincipal(false);
        }
    };

    // ── Pantallas de estado ───────────────────────────────────────────────────
    if (estado === 'cargando') return (
        <div className="firma-page">
            <div className="firma-card">
                <div className="firma-spinner" />
                <p style={{ color: '#64748b', marginTop: 16 }}>Verificando enlace de firma...</p>
            </div>
        </div>
    );

    if (estado === 'firmado') return (
        <div className="firma-page">
            <div className="firma-card">
                <div className="firma-status-icon ok"><FiCheckCircle size={48} /></div>
                <h2 className="firma-status-title">Documento firmado</h2>
                <p className="firma-status-sub">Tu firma ha sido registrada exitosamente. Recibirás el documento firmado por correo electrónico.</p>
            </div>
        </div>
    );

    if (estado === 'expirado') return (
        <div className="firma-page">
            <div className="firma-card">
                <div className="firma-status-icon warn"><FiAlertTriangle size={48} /></div>
                <h2 className="firma-status-title">Enlace expirado</h2>
                <p className="firma-status-sub">El enlace de firma ha vencido. Comunícate con Gestión Humana para recibir un nuevo enlace.</p>
            </div>
        </div>
    );

    if (estado === 'error') return (
        <div className="firma-page">
            <div className="firma-card">
                <div className="firma-status-icon error"><FiAlertTriangle size={48} /></div>
                <h2 className="firma-status-title">Enlace no válido</h2>
                <p className="firma-status-sub">{errorMsg}</p>
            </div>
        </div>
    );

    // ── Estado "listo" ────────────────────────────────────────────────────────
    const TIPO_CARTA_LABEL = { NO_PRORROGA: 'No prórroga', PRORROGA: 'Prórroga', TERMINACION: 'Terminación' };
    const secuencial = datos?.firma_previa_requerida;

    // Construir URLs del proxy usando API_BASE (mismo esquema HTTPS que el frontend),
    // en lugar de usar la URL del backend que puede ser HTTP cuando Django no está
    // configurado con SECURE_PROXY_SSL_HEADER. Null si el backend indica que no hay PDF.
    const pdfCartaIframeUrl      = datos?.pdf_carta_url      ? `${API_BASE}contratos/firma/${token}/pdf/`             : null;
    const pdfNoProrrogaIframeUrl = datos?.pdf_no_prorroga_url ? `${API_BASE}contratos/firma/${token}/pdf-no-prorroga/` : null;
    const totalPasos = secuencial ? 3 : 2;

    // Etiquetas de los pasos en el indicador visual
    const pasoLabel = secuencial
        ? ['Firma no prórroga', 'Verifica tus datos', 'Firma el documento']
        : ['Verifica tus datos', 'Firma el documento'];

    // Índice real del paso para el indicador (en secuencial: paso 0,1,2; sin secuencial: paso 1,2)
    const pasoIdx = secuencial ? paso : paso - 1;

    return (
        <div className="firma-page">
            {/* Header */}
            <div className="firma-header">
                <div className="firma-logo">
                    <span className="firma-logo-text">Euro Supermercados</span>
                </div>
                <p className="firma-header-sub">Gestión Humana · Firma digital de documentos</p>
            </div>

            <div className="firma-card wide">
                {/* Indicador de pasos */}
                <div className="firma-steps">
                    {pasoLabel.map((label, idx) => (
                        <span key={idx} style={{ display: 'contents' }}>
                            <div className={`firma-step ${pasoIdx >= idx ? 'done' : ''}`}>
                                <div className="firma-step-num">{idx + 1}</div>
                                <span>{label}</span>
                            </div>
                            {idx < totalPasos - 1 && <div className="firma-step-line" />}
                        </span>
                    ))}
                </div>

                {/* ── Paso 0: Firma NO_PRORROGA previa ─────────────────────── */}
                {paso === 0 && (
                    <div className="firma-paso">
                        {/* Alerta de bloqueo — visible solo si el backend rechazó la firma principal */}
                        {alertaBloqueo && (
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: 12,
                                background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)',
                                borderRadius: 10, padding: '14px 16px', marginBottom: 20,
                            }}>
                                <FiAlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#b91c1c', marginBottom: 4 }}>
                                        No puedes firmar el documento principal todavía
                                    </div>
                                    <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5 }}>
                                        Primero debes firmar la <strong>carta de no prórroga</strong> que aparece a continuación.
                                        Solo después podrás firmar el documento de prórroga o terminación.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
                            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                        }}>
                            <FiAlertCircle size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>
                                    Paso previo requerido
                                </div>
                                <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>
                                    El director ha decidido prorrogar tu contrato, pero primero necesitas firmar
                                    la <strong>carta de no prórroga</strong> que ya fue enviada anteriormente.
                                    Léela y fírmala abajo para continuar.
                                </div>
                            </div>
                        </div>

                        <h2 className="firma-paso-title">Firma tu carta de no prórroga</h2>
                        <p className="firma-paso-sub">
                            Lee el documento y dibuja tu firma en el recuadro de abajo.
                        </p>

                        {pdfNoProrrogaIframeUrl && (
                            <div className="firma-pdf-embed-wrap">
                                <div className="firma-pdf-embed-label">Carta de no prórroga</div>
                                <iframe
                                    src={pdfNoProrrogaIframeUrl}
                                    title="Carta de no prórroga"
                                    className="firma-pdf-iframe"
                                />
                                <a href={pdfNoProrrogaIframeUrl} target="_blank" rel="noopener noreferrer"
                                   className="firma-pdf-nueva-tab">
                                    Abrir en nueva pestaña →
                                </a>
                            </div>
                        )}

                        <div className="firma-canvas-wrap">
                            <div className="firma-canvas-label">Área de firma — Carta de no prórroga</div>
                            <SignatureCanvas canvasRef={canvasNoProrrogaRef} onChanged={setTieneFirmaNoPr} />
                            <button className="firma-btn-limpiar"
                                onClick={() => limpiarCanvas(canvasNoProrrogaRef, setTieneFirmaNoPr)}
                                title="Limpiar firma">
                                <FiRotateCcw size={14} /> Limpiar
                            </button>
                        </div>

                        {!tieneFirmaNoPr && (
                            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                                Dibuja tu firma en el recuadro para continuar
                            </p>
                        )}

                        {errorMsg && (
                            <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 8 }}>{errorMsg}</p>
                        )}

                        <button
                            className="firma-btn-primary"
                            onClick={confirmarFirmaNoPr}
                            disabled={!tieneFirmaNoPr || firmandoNoPr}
                            style={{ marginTop: 16 }}
                        >
                            {firmandoNoPr ? 'Procesando...' : 'Firmar carta de no prórroga y continuar →'}
                        </button>
                    </div>
                )}

                {/* ── Paso 1: Verificar datos ───────────────────────────────── */}
                {paso === 1 && (
                    <div className="firma-paso">
                        <h2 className="firma-paso-title">Verifica tu información</h2>
                        <p className="firma-paso-sub">
                            {secuencial
                                ? 'Has firmado la carta de no prórroga. Ahora verifica tus datos antes de firmar el documento de prórroga.'
                                : 'Has recibido este enlace porque tu contrato con Euro Supermercados requiere tu firma. Verifica que los datos sean correctos antes de continuar.'
                            }
                        </p>

                        {secuencial && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
                                borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                            }}>
                                <FiCheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                                <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                                    Carta de no prórroga firmada correctamente
                                </span>
                            </div>
                        )}

                        <div className="firma-info-box">
                            <div className="firma-info-row">
                                <span className="firma-info-label">Nombre</span>
                                <span className="firma-info-value"><strong>{datos?.nombre_completo}</strong></span>
                            </div>
                            <div className="firma-info-row">
                                <span className="firma-info-label">Documento</span>
                                <span className="firma-info-value">{datos?.tipo_documento} {datos?.documento_id}</span>
                            </div>
                            <div className="firma-info-row">
                                <span className="firma-info-label">Cargo</span>
                                <span className="firma-info-value">{datos?.cargo}</span>
                            </div>
                            <div className="firma-info-row">
                                <span className="firma-info-label">Tipo de carta</span>
                                <span className="firma-info-value">{TIPO_CARTA_LABEL[datos?.tipo_carta] || datos?.tipo_carta}</span>
                            </div>
                            <div className="firma-info-row">
                                <span className="firma-info-label">Fecha fin contrato</span>
                                <span className="firma-info-value">{fmtFecha(datos?.fecha_finalizacion)}</span>
                            </div>
                        </div>

                        {(pdfCartaIframeUrl || datos?.documentos_adicionales?.length > 0) && (
                            <div className="firma-pdf-preview">
                                <p className="firma-pdf-label">Documentos adjuntos:</p>
                                <div className="firma-docs-list">
                                    {pdfCartaIframeUrl && (
                                        <a href={pdfCartaIframeUrl} target="_blank" rel="noopener noreferrer"
                                            className="firma-doc-item">
                                            <FiCheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                                            <span style={{ flex: 1 }}>Carta a firmar</span>
                                            <span className="firma-doc-ver"><FiExternalLink size={11} /> Ver PDF</span>
                                        </a>
                                    )}
                                    {datos?.documentos_adicionales?.map((doc, idx) => (
                                        <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer"
                                            className="firma-doc-item">
                                            <FiFileText size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
                                            <span style={{ flex: 1 }}>{doc.nombre}</span>
                                            <span className="firma-doc-ver"><FiExternalLink size={11} /> Ver</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="firma-legal">
                            <strong>Importante:</strong> Al continuar y firmar este documento, confirmas haber leído y comprendido
                            el contenido de la carta y que los datos mostrados son correctos. Tu firma digital tiene plena
                            validez legal.
                        </div>

                        <button className="firma-btn-primary" onClick={() => setPaso(2)}>
                            He verificado mis datos · Continuar a firmar
                        </button>
                    </div>
                )}

                {/* ── Paso 2: Firma documento principal ────────────────────── */}
                {paso === 2 && (
                    <div className="firma-paso">
                        <h2 className="firma-paso-title">Firma el documento</h2>
                        <p className="firma-paso-sub">
                            Lee el documento y luego dibuja tu firma en el recuadro de abajo.
                        </p>

                        {pdfCartaIframeUrl && (
                            <div className="firma-pdf-embed-wrap">
                                <div className="firma-pdf-embed-label">Documento a firmar</div>
                                <iframe
                                    src={pdfCartaIframeUrl}
                                    title="Documento a firmar"
                                    className="firma-pdf-iframe"
                                />
                                <a href={pdfCartaIframeUrl} target="_blank" rel="noopener noreferrer"
                                   className="firma-pdf-nueva-tab">
                                    Abrir en nueva pestaña →
                                </a>
                            </div>
                        )}

                        <div className="firma-canvas-wrap">
                            <div className="firma-canvas-label">Área de firma</div>
                            <SignatureCanvas canvasRef={canvasPrincipalRef} onChanged={setTieneFirmaPrincipal} />
                            <button className="firma-btn-limpiar"
                                onClick={() => limpiarCanvas(canvasPrincipalRef, setTieneFirmaPrincipal)}
                                title="Limpiar firma">
                                <FiRotateCcw size={14} /> Limpiar
                            </button>
                        </div>

                        {!tieneFirmaPrincipal && (
                            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                                Dibuja tu firma en el recuadro para continuar
                            </p>
                        )}

                        <div className="firma-btn-group">
                            <button className="firma-btn-secondary" onClick={() => setPaso(1)}>
                                ← Volver
                            </button>
                            <button
                                className="firma-btn-primary"
                                onClick={confirmarFirmaPrincipal}
                                disabled={!tieneFirmaPrincipal || firmandoPrincipal}
                            >
                                {firmandoPrincipal ? 'Procesando...' : 'Confirmar y firmar documento'}
                            </button>
                        </div>

                        {errorMsg && (
                            <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 8 }}>{errorMsg}</p>
                        )}
                    </div>
                )}
            </div>

            <p className="firma-footer">
                Euro Supermercados · Gestión Humana · {new Date().getFullYear()}
                <br />
                <span style={{ fontSize: 10, color: '#cbd5e1' }}>Si tienes dudas, comunícate con tu responsable de Gestión Humana.</span>
            </p>
        </div>
    );
};

export default FirmaDigital;
