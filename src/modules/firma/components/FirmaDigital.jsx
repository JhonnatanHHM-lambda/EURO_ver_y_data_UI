import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FiCheckCircle, FiAlertTriangle, FiRotateCcw } from 'react-icons/fi';
import axios from 'axios';
import '../utils/FirmaDigital.scss';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/';

const fmtFecha = (f) =>
    f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

// ── Canvas de firma ───────────────────────────────────────────────────────────
const SignatureCanvas = ({ canvasRef, onChanged }) => {
    const drawing = useRef(false);

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
    const canvasRef  = useRef(null);

    const [estado, setEstado]         = useState('cargando'); // cargando | listo | firmando | firmado | error | expirado
    const [datos, setDatos]           = useState(null);
    const [errorMsg, setErrorMsg]     = useState('');
    const [tieneFirma, setTieneFirma] = useState(false);
    const [paso, setPaso]             = useState(1); // 1 = info, 2 = firma

    useEffect(() => {
        const validar = async () => {
            try {
                const res = await axios.get(`${API_BASE}contratos/firma/${token}/`);
                setDatos(res.data);
                setEstado('listo');
            } catch (e) {
                const status = e.response?.status;
                if (status === 410 || e.response?.data?.expirado) {
                    setEstado('expirado');
                } else if (status === 404) {
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

    const limpiarFirma = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setTieneFirma(false);
    };

    const confirmarFirma = async () => {
        if (!tieneFirma) return;
        setEstado('firmando');
        try {
            const firma_data = canvasRef.current.toDataURL('image/png');
            await axios.post(`${API_BASE}contratos/firma/${token}/confirmar/`, { firma_data });
            setEstado('firmado');
        } catch (e) {
            setErrorMsg(e.response?.data?.error || 'Error al procesar la firma. Intenta de nuevo.');
            setEstado('listo');
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

    // ── Estado "listo" o "firmando" ────────────────────────────────────────────
    const TIPO_CARTA_LABEL = { NO_PRORROGA: 'No prórroga', PRORROGA: 'Prórroga', TERMINACION: 'Terminación' };

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
                {/* Pasos */}
                <div className="firma-steps">
                    <div className={`firma-step ${paso >= 1 ? 'done' : ''}`}>
                        <div className="firma-step-num">1</div>
                        <span>Verifica tus datos</span>
                    </div>
                    <div className="firma-step-line" />
                    <div className={`firma-step ${paso >= 2 ? 'done' : ''}`}>
                        <div className="firma-step-num">2</div>
                        <span>Firma el documento</span>
                    </div>
                </div>

                {/* Paso 1 — Información */}
                {paso === 1 && (
                    <div className="firma-paso">
                        <h2 className="firma-paso-title">Verifica tu información</h2>
                        <p className="firma-paso-sub">
                            Has recibido este enlace porque tu contrato con Euro Supermercados requiere tu firma.
                            Verifica que los datos sean correctos antes de continuar.
                        </p>

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

                        {datos?.pdf_carta_url && (
                            <div className="firma-pdf-preview">
                                <p className="firma-pdf-label">Carta a firmar:</p>
                                <a
                                    href={datos.pdf_carta_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="firma-pdf-link"
                                >
                                    Ver documento en PDF →
                                </a>
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

                {/* Paso 2 — Firma */}
                {paso === 2 && (
                    <div className="firma-paso">
                        <h2 className="firma-paso-title">Firma el documento</h2>
                        <p className="firma-paso-sub">
                            Dibuja tu firma en el recuadro de abajo. Usa el mouse o tu dedo en dispositivos táctiles.
                        </p>

                        <div className="firma-canvas-wrap">
                            <div className="firma-canvas-label">Área de firma</div>
                            <SignatureCanvas canvasRef={canvasRef} onChanged={setTieneFirma} />
                            <button className="firma-btn-limpiar" onClick={limpiarFirma} title="Limpiar firma">
                                <FiRotateCcw size={14} /> Limpiar
                            </button>
                        </div>

                        {!tieneFirma && (
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
                                onClick={confirmarFirma}
                                disabled={!tieneFirma || estado === 'firmando'}
                            >
                                {estado === 'firmando' ? 'Procesando...' : 'Confirmar y firmar documento'}
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
