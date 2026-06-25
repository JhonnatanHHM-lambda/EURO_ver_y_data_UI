import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiPenTool, FiToggleLeft, FiToggleRight, FiDownload,
    FiUser, FiAlertTriangle, FiCheckCircle, FiRotateCcw,
    FiCalendar, FiClock, FiShield,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import swal, { isLight } from '../../../utils/swal';
import Modal from '../../core/Modal/components/Modal.jsx';
import DateRangePicker from '../../contrataciones/components/DateRangePicker.jsx';
import '../utils/FirmaGH.scss';

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
        const rect  = canvas.getBoundingClientRect();
        const touch = e.touches?.[0];
        return {
            x: (touch ? touch.clientX : e.clientX) - rect.left,
            y: (touch ? touch.clientY : e.clientY) - rect.top,
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        drawing.current = true;
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e, canvasRef.current);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    };
    const draw = (e) => {
        if (!drawing.current) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e, canvasRef.current);
        ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e293b';
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
        onChanged(true);
    };
    const stopDraw = () => { drawing.current = false; };

    return (
        <canvas
            ref={canvasRef}
            className="fgh-canvas"
            onMouseDown={startDraw} onMouseMove={draw}
            onMouseUp={stopDraw}   onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
    );
};

// ── Componente principal ──────────────────────────────────────────────────────
const FirmaGH = () => {
    const [estado, setEstado]               = useState(null);
    const [loading, setLoading]             = useState(true);

    // firma GH
    const [modoEdicion, setModoEdicion]     = useState(false);
    const [hasFirma, setHasFirma]           = useState(false);
    const [guardando, setGuardando]         = useState(false);
    const canvasGHRef                       = useRef(null);

    // modal provisional
    const [modalProv, setModalProv]         = useState(false);
    const [usuariosProv, setUsuariosProv]   = useState([]);
    const [userProvSel, setUserProvSel]     = useState(null);
    const [hasFirmaProv, setHasFirmaProv]   = useState(false);
    const [guardandoProv, setGuardandoProv] = useState(false);
    const canvasProvRef                     = useRef(null);

    // historial / reporte
    const [showPicker, setShowPicker]       = useState(false);
    const [filtroFecha, setFiltroFecha]     = useState(null);
    const [descargando, setDescargando]     = useState(false);
    const [registros, setRegistros]         = useState([]);
    const [loadingReg, setLoadingReg]       = useState(false);

    // ── Cargar estado ─────────────────────────────────────────────────────────
    const cargarEstado = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('contratos/firma-gh/');
            setEstado(res.data);
        } catch {
            swal({ icon: 'error', title: 'Error', text: 'No se pudo cargar el estado de la firma.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarEstado(); }, [cargarEstado]);

    // ── Cargar historial ──────────────────────────────────────────────────────
    const cargarRegistros = useCallback(async (filtro = null) => {
        setLoadingReg(true);
        try {
            const params = new URLSearchParams();
            if (filtro?.desde) params.set('fecha_desde', filtro.desde);
            if (filtro?.hasta) params.set('fecha_hasta', filtro.hasta);
            const qs = params.toString() ? `?${params}` : '';
            const res = await api.get(`contratos/firma-gh/registros/${qs}`);
            setRegistros(res.data.registros || []);
        } catch {
            swal({ icon: 'error', title: 'Error', text: 'No se pudo cargar el historial.' });
        } finally {
            setLoadingReg(false);
        }
    }, []);

    useEffect(() => { cargarRegistros(filtroFecha); }, [cargarRegistros, filtroFecha]);

    // ── Iniciar edición de firma (con countdown si ya tiene una) ─────────────
    const handleIniciarEdicion = async () => {
        if (estado?.firma_gh?.tiene_firma) {
            let timer = 10;
            const light = isLight();
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Implicaciones legales',
                background: light ? '#f7f5ef' : '#1e293b',
                color:      light ? '#1a1a1f'  : '#ffffff',
                html: `
                    <p style="margin-bottom:10px">Estás a punto de <strong>reemplazar tu firma digital</strong>.</p>
                    <p style="margin-bottom:14px;color:${light ? '#64748b' : '#94a3b8'};font-size:13px">
                        Todos los documentos futuros se generarán con la nueva firma.<br/>
                        Esta acción queda registrada en el sistema.
                    </p>
                    <div id="fgh-countdown" style="font-size:28px;font-weight:800;color:#dc2626;line-height:1">10</div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Sí, cambiar firma',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#64748b',
                didOpen: () => {
                    const btn = Swal.getConfirmButton();
                    if (btn) btn.disabled = true;
                    const iv = setInterval(() => {
                        timer--;
                        const el = document.getElementById('fgh-countdown');
                        if (el) el.textContent = timer;
                        if (timer <= 0) {
                            clearInterval(iv);
                            if (btn) btn.disabled = false;
                        }
                    }, 1000);
                },
            });
            if (!result.isConfirmed) return;
        }
        setModoEdicion(true);
        setHasFirma(false);
    };

    const limpiarCanvas = (ref) => {
        const canvas = ref.current;
        if (!canvas) return;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    const getFirmaBase64 = (ref) => ref.current?.toDataURL('image/png') ?? null;

    // ── Guardar firma GH ──────────────────────────────────────────────────────
    const handleGuardarFirma = async () => {
        if (!hasFirma) {
            swal({ icon: 'info', title: 'Sin firma', text: 'Dibuja tu firma antes de guardar.' });
            return;
        }
        setGuardando(true);
        try {
            await api.post('contratos/firma-gh/', { firma_imagen: getFirmaBase64(canvasGHRef) });
            await cargarEstado();
            setModoEdicion(false);
            swal({ icon: 'success', title: 'Firma guardada', text: 'Tu firma se ha registrado correctamente.' });
        } catch {
            swal({ icon: 'error', title: 'Error', text: 'No se pudo guardar la firma.' });
        } finally {
            setGuardando(false);
        }
    };

    // ── Toggle activa/desactiva ───────────────────────────────────────────────
    const handleToggle = async () => {
        const estaActiva = estado?.firma_gh?.habilitada;

        if (estaActiva) {
            if (!estado?.firma_provisional?.tiene_firma) {
                swal({
                    icon: 'warning',
                    title: 'Sin firma provisional',
                    html: `<p>Para desactivar tu firma primero debes designar un <strong>usuario provisional</strong> en el panel derecho.</p>`,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#0ea5e9',
                });
                return;
            }
            const result = await swal({
                icon: 'question',
                title: '¿Desactivar tu firma?',
                text: 'La firma provisional tomará tu lugar en los documentos mientras esté desactivada.',
                showCancelButton: true,
                confirmButtonText: 'Sí, desactivar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc2626',
            });
            if (!result.isConfirmed) return;
        }

        try {
            await api.post('contratos/firma-gh/toggle/', { habilitar: !estaActiva });
            await cargarEstado();
            swal({
                icon: 'success',
                title: estaActiva ? 'Firma desactivada' : 'Firma activada',
                text: estaActiva
                    ? 'La firma provisional está activa para los documentos.'
                    : 'Tu firma está activa. La firma provisional fue eliminada.',
            });
        } catch (err) {
            swal({ icon: 'error', title: 'Error', text: err?.response?.data?.error || 'No se pudo cambiar el estado.' });
        }
    };

    // ── Abrir modal provisional ───────────────────────────────────────────────
    const abrirModalProvisional = async () => {
        try {
            const res = await api.get('contratos/firma-gh/usuarios/');
            setUsuariosProv(res.data);
        } catch {
            swal({ icon: 'error', title: 'Error', text: 'No se pudo cargar la lista de usuarios.' });
            return;
        }
        setUserProvSel(null);
        setHasFirmaProv(false);
        setModalProv(true);
    };

    const cerrarModalProv = () => setModalProv(false);

    // ── Guardar provisional ───────────────────────────────────────────────────
    const handleGuardarProvisional = async () => {
        if (!userProvSel) {
            swal({ icon: 'info', title: 'Sin usuario', text: 'Selecciona un usuario provisional.' });
            return;
        }
        if (!hasFirmaProv) {
            swal({ icon: 'info', title: 'Sin firma', text: 'El usuario provisional debe dibujar su firma.' });
            return;
        }
        setGuardandoProv(true);
        try {
            await api.post('contratos/firma-gh/provisional/', {
                usuario_id:   userProvSel.id,
                firma_imagen: getFirmaBase64(canvasProvRef),
            });
            cerrarModalProv();
            await cargarEstado();
            swal({ icon: 'success', title: 'Firma provisional registrada', text: `${userProvSel.nombre_completo} queda como firmante provisional.` });
        } catch (err) {
            swal({ icon: 'error', title: 'Error', text: err?.response?.data?.error || 'No se pudo guardar la firma provisional.' });
        } finally {
            setGuardandoProv(false);
        }
    };

    // ── Eliminar provisional ──────────────────────────────────────────────────
    const handleEliminarProvisional = async () => {
        const result = await swal({
            icon: 'question',
            title: '¿Eliminar firma provisional?',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
        });
        if (!result.isConfirmed) return;
        try {
            await api.delete('contratos/firma-gh/provisional/');
            await cargarEstado();
        } catch {
            swal({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la firma provisional.' });
        }
    };

    // ── Descargar reporte Excel ───────────────────────────────────────────────
    const handleDescargar = async () => {
        if (!filtroFecha) {
            swal({ icon: 'info', title: 'Filtro requerido', text: 'Selecciona un rango de fechas antes de descargar.', confirmButtonColor: '#0ea5e9' });
            return;
        }
        setDescargando(true);
        try {
            const params = new URLSearchParams({ fecha_desde: filtroFecha.desde, fecha_hasta: filtroFecha.hasta });
            const res = await api.get(`contratos/firma-gh/registros/reporte/?${params}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a   = document.createElement('a');
            a.href = url;
            a.download = `registros_firma_${filtroFecha.desde}_a_${filtroFecha.hasta}.xlsx`;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); document.body.removeChild(a);
        } catch {
            swal({ icon: 'error', title: 'Error', text: 'No se pudo generar el reporte.' });
        } finally {
            setDescargando(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="vyd-main fade-in" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                <div className="spinner" />
            </div>
        );
    }

    const firmaGH   = estado?.firma_gh;
    const firmaProv = estado?.firma_provisional;
    const activa    = estado?.activa;

    return (
        <div className="vyd-main fade-in fgh-page">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiPenTool size={20} /> Firma Digital del Empleador</h1>
                    <p className="vyd-page-sub">Gestiona la firma que aparece en todos los documentos generados</p>
                </div>
                {activa
                    ? <span className="fgh-badge-activa"><FiCheckCircle size={12} /> Firma {activa === 'provisional' ? 'provisional ' : ''}activa</span>
                    : <span className="fgh-badge-sin"><FiAlertTriangle size={12} /> Sin firma activa</span>
                }
            </div>

            {/* ── Grid paneles ────────────────────────────────────────────── */}
            <div className="fgh-grid">

                {/* Firma GH */}
                <div className="vyd-panel fgh-panel">
                    <div className="fgh-panel-header">
                        <FiPenTool size={15} />
                        <span>Firma del GH</span>
                        {firmaGH?.habilitada && <span className="fgh-chip green">Activa</span>}
                        {firmaGH && !firmaGH.habilitada && <span className="fgh-chip gray">Desactivada</span>}
                    </div>

                    {!modoEdicion ? (
                        <>
                            {firmaGH?.tiene_firma ? (
                                <div className="fgh-user-card">
                                    <div className="fgh-user-avatar">
                                        {firmaGH.usuario.nombre_completo.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="fgh-user-info">
                                        <span className="fgh-user-name">{firmaGH.usuario.nombre_completo}</span>
                                        <span className="fgh-user-meta">C.C. {firmaGH.usuario.cedula}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="fgh-empty">No hay firma registrada aún.</p>
                            )}
                            <div className="fgh-actions">
                                <button className="vyd-btn-sm" onClick={handleIniciarEdicion}>
                                    <FiPenTool size={13} />
                                    {firmaGH?.tiene_firma ? 'Editar firma' : 'Registrar firma'}
                                </button>
                                {firmaGH?.tiene_firma && (
                                    <button
                                        className={`vyd-btn-sm ${firmaGH.habilitada ? 'danger' : ''}`}
                                        onClick={handleToggle}
                                    >
                                        {firmaGH.habilitada
                                            ? <><FiToggleRight size={14} /> Desactivar</>
                                            : <><FiToggleLeft  size={14} /> Activar</>
                                        }
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="fgh-edit-label">Dibuja tu firma en el recuadro:</p>
                            <SignatureCanvas canvasRef={canvasGHRef} onChanged={setHasFirma} />
                            <div className="fgh-actions">
                                <button className="vyd-btn-sm ghost" onClick={() => { limpiarCanvas(canvasGHRef); setHasFirma(false); }}>
                                    <FiRotateCcw size={13} /> Limpiar
                                </button>
                                <button className="vyd-btn-sm ghost" onClick={() => setModoEdicion(false)}>
                                    Cancelar
                                </button>
                                <button className="vyd-btn-sm" onClick={handleGuardarFirma} disabled={!hasFirma || guardando}>
                                    {guardando ? 'Guardando…' : 'Guardar firma'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Firma Provisional */}
                <div className="vyd-panel fgh-panel">
                    <div className="fgh-panel-header">
                        <FiShield size={15} />
                        <span>Firma Provisional</span>
                        {firmaProv && <span className="fgh-chip orange">Activa</span>}
                    </div>

                    {firmaProv ? (
                        <>
                            <div className="fgh-user-card">
                                <div className="fgh-user-avatar orange">
                                    {firmaProv.usuario.nombre_completo.charAt(0).toUpperCase()}
                                </div>
                                <div className="fgh-user-info">
                                    <span className="fgh-user-name">{firmaProv.usuario.nombre_completo}</span>
                                    <span className="fgh-user-meta">C.C. {firmaProv.usuario.cedula}</span>
                                    {firmaProv.autorizado_por && (
                                        <span className="fgh-user-meta">
                                            Autorizado por: {firmaProv.autorizado_por.nombre_completo}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="fgh-actions">
                                <button className="vyd-btn-sm ghost danger-ghost" onClick={handleEliminarProvisional}>
                                    Eliminar provisional
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="fgh-empty">
                                Sin firma provisional. Solo es necesaria si desactivas tu firma.
                            </p>
                            <div className="fgh-actions">
                                <button className="vyd-btn-sm ghost" onClick={abrirModalProvisional}>
                                    <FiUser size={13} /> Gestionar provisional
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Historial ────────────────────────────────────────────────── */}
            <div className="vyd-panel fgh-hist-panel">
                <div className="fgh-hist-header">
                    <div className="fgh-panel-header" style={{ marginBottom: 0 }}>
                        <FiClock size={15} />
                        <span>Historial de documentos generados</span>
                    </div>
                    <div className="fgh-hist-actions">
                        <div style={{ position: 'relative' }}>
                            <button
                                className={`vyd-btn-sm ghost${filtroFecha ? ' active' : ''}`}
                                onClick={() => setShowPicker(p => !p)}
                            >
                                <FiCalendar size={13} />
                                {filtroFecha ? `${filtroFecha.desde} → ${filtroFecha.hasta}` : 'Filtrar fechas'}
                            </button>
                            {showPicker && (
                                <DateRangePicker
                                    value={filtroFecha ? { desde: filtroFecha.desde, hasta: filtroFecha.hasta } : null}
                                    onChange={(desde, hasta) => { setFiltroFecha({ desde, hasta }); setShowPicker(false); }}
                                    onClear={() => { setFiltroFecha(null); setShowPicker(false); }}
                                />
                            )}
                        </div>
                        <button
                            className="vyd-btn-sm ghost"
                            onClick={handleDescargar}
                            disabled={descargando}
                            title={filtroFecha ? 'Descargar reporte Excel' : 'Aplica un filtro de fechas para descargar'}
                        >
                            <FiDownload size={13} />
                            {descargando ? 'Generando…' : 'Excel'}
                        </button>
                    </div>
                </div>

                {loadingReg ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}><div className="spinner" /></div>
                ) : registros.length === 0 ? (
                    <p className="fgh-empty" style={{ padding: '24px 0' }}>
                        {filtroFecha ? 'Sin registros en el rango seleccionado.' : 'Sin registros aún.'}
                    </p>
                ) : (
                    <div className="fgh-table-wrap">
                        <table className="fgh-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo carta</th>
                                    <th>Empleador</th>
                                    <th>Provisional</th>
                                    <th>Empleado</th>
                                    <th>Sede</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registros.map(r => (
                                    <tr key={r.id}>
                                        <td>{new Date(r.fecha_generacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td>
                                            <span className={`fgh-tipo ${r.tipo_carta.toLowerCase().replace(/\s+/g, '_')}`}>
                                                {r.tipo_carta}
                                            </span>
                                        </td>
                                        <td>
                                            <div>{r.empleador.nombre}</div>
                                            <div className="fgh-sub">C.C. {r.empleador.cedula}</div>
                                        </td>
                                        <td>
                                            {r.es_provisional
                                                ? <span className="fgh-chip orange" style={{ fontSize: 10 }}>Sí</span>
                                                : '—'
                                            }
                                        </td>
                                        <td>
                                            <div>{r.empleado.nombre}</div>
                                            <div className="fgh-sub">{r.empleado.cargo}</div>
                                        </td>
                                        <td>{r.empleado.sede || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal firma provisional ──────────────────────────────────── */}
            <Modal isOpen={modalProv} onClose={cerrarModalProv} title="Registrar firma provisional" size="md">
                <div className="vyd-form-group">
                    <label>Usuario provisional</label>
                    <select
                        value={userProvSel?.id || ''}
                        onChange={e => {
                            const u = usuariosProv.find(u => u.id === Number(e.target.value)) || null;
                            setUserProvSel(u);
                            setHasFirmaProv(false);
                            if (canvasProvRef.current) {
                                const ctx = canvasProvRef.current.getContext('2d');
                                ctx.clearRect(0, 0, canvasProvRef.current.width, canvasProvRef.current.height);
                            }
                        }}
                    >
                        <option value="">— Selecciona un usuario —</option>
                        {usuariosProv.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.nombre_completo} · C.C. {u.cedula}
                            </option>
                        ))}
                    </select>
                </div>

                {userProvSel && (
                    <div className="vyd-form-group" style={{ marginTop: 18 }}>
                        <label>Firma de {userProvSel.nombre_completo}</label>
                        <SignatureCanvas canvasRef={canvasProvRef} onChanged={setHasFirmaProv} />
                        <button
                            className="vyd-btn-sm ghost"
                            style={{ marginTop: 6, alignSelf: 'flex-start' }}
                            onClick={() => { limpiarCanvas(canvasProvRef); setHasFirmaProv(false); }}
                        >
                            <FiRotateCcw size={12} /> Limpiar
                        </button>
                    </div>
                )}

                <div className="vyd-modal-actions">
                    <button className="vyd-btn-sm ghost" onClick={cerrarModalProv}>Cancelar</button>
                    <button
                        className="vyd-btn-sm"
                        onClick={handleGuardarProvisional}
                        disabled={!userProvSel || !hasFirmaProv || guardandoProv}
                    >
                        {guardandoProv ? 'Guardando…' : 'Guardar provisional'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default FirmaGH;
