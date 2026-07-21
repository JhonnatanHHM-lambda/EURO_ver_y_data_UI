import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FiCheck, FiChevronRight, FiDownload, FiInfo, FiPlay, FiRotateCcw, FiSend, FiSquare, FiUpload,
} from 'react-icons/fi';
import useMigracionMasivaArchivo from '../hooks/useMigracionMasivaArchivo';
import Modal from '../../core/Modal/components/Modal';
import swal from '../../../utils/swal';
import '../utils/MigracionMasivaArchivo.scss';

// Estados que permiten reintentar/revisar un documento (mismo criterio que
// _ESTADOS_RETROCEDIBLES en el backend, migracion_masiva_archivo/views.py).
const ESTADOS_REVISABLES = ['REQUIERE_REVISION', 'ERROR_SAIA'];

const usuarioActual = () => JSON.parse(localStorage.getItem('user') || '{}');

const badgeClass = (estado = '') => `mma-pill ${estado.toLowerCase().replaceAll('_', '-')}`;

const fmtFecha = (value) => (
    value ? new Date(value).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }) : '—'
);

// Solo contempla los estados reales de DocumentoDigitalizado.estado_proceso
// (migracion_masiva_archivo/models.py: ESTADOS_DOCUMENTO) — nada de estados
// inventados que el backend nunca produce.
const faseDesdeEstado = (estado = '') => {
    if (estado === 'CARGADO_SAIA') return ['OK', 'OK', 'OK', 'OK', 'OK', 'Cargado'];
    if (estado === 'ERROR_SAIA') return ['OK', 'OK', 'OK', 'OK', 'ERROR', 'Error SAIA'];
    if (estado === 'REQUIERE_REVISION') return ['OK', 'OK', 'REVISION', '-', '-', 'Revisión'];
    if (estado === 'RELACIONADO') return ['OK', 'OK', 'OK', 'EN_COLA', 'EN_COLA', 'En cola'];
    if (estado === 'VALIDADO') return ['OK', 'OK', 'EN_COLA', 'EN_COLA', 'EN_COLA', 'Validado'];
    if (estado === 'METADATA_EXTRAIDA') return ['OK', 'OK', 'EN_COLA', '-', '-', 'Metadata'];
    if (estado === 'OCR_PROCESADO') return ['OK', 'OK', '-', '-', '-', 'OCR'];
    if (estado === 'LEIDO') return ['OK', 'EN_COLA', '-', '-', '-', 'Leído'];
    return ['PENDIENTE', '-', '-', '-', '-', 'Pendiente'];
};

const FASES_DEF = [
    { label: 'F1 · Inventario' },
    { label: 'F2 · OCR / Metadata', inicio: 'fase2_inicio', fin: 'fase2_fin' },
    { label: 'F3 · Relaciones',     inicio: 'fase3_inicio', fin: 'fase3_fin' },
    { label: 'F4 · Validación',     inicio: 'fase4_inicio', fin: 'fase4_fin' },
    { label: 'F5 · Carga SAIA',     inicio: 'fase5_inicio', fin: 'fase5_fin', omitida: 'fase5_omitida' },
];

const PHASE_COLUMNS = [
    { key: 'f1', fallbackIndex: 0 },
    { key: 'f2', fallbackIndex: 1 },
    { key: 'f3', fallbackIndex: 2 },
    { key: 'f4', fallbackIndex: 3 },
    { key: 'saia', fallbackIndex: 4 },
];

const ETIQUETA_FASE = {
    completado: 'Completado',
    en_proceso: 'En proceso',
    pendiente: 'Pendiente',
    omitida: 'No ejecutada (solo extracción)',
    error: 'Error',
};

// Deriva el estado real de cada fase a partir de los eventos que
// tasks.py registra en LogProcesoDocumental (fase2_inicio/fin, fase3_inicio/fin...),
// en vez de aproximarlo con el ratio de "procesados/total": la API no expone una
// "fase actual" explícita, así que los logs son la única fuente de verdad real.
const calcularFases = (logs, hayCarga) => {
    const eventos = new Set((logs || []).map(l => l.evento));
    const huboError = eventos.has('flujo_error') || eventos.has('saia_error') || eventos.has('saia_login_error');

    return FASES_DEF.map((fase, index) => {
        if (index === 0) {
            return { ...fase, estado: hayCarga ? 'completado' : 'pendiente', pct: hayCarga ? 100 : 0 };
        }
        if (fase.fin && eventos.has(fase.fin)) return { ...fase, estado: 'completado', pct: 100 };
        if (fase.omitida && eventos.has(fase.omitida)) return { ...fase, estado: 'omitida', pct: 0 };
        if (fase.inicio && eventos.has(fase.inicio)) {
            return huboError
                ? { ...fase, estado: 'error', pct: 100 }
                : { ...fase, estado: 'en_proceso', pct: 50 };
        }
        return { ...fase, estado: 'pendiente', pct: 0 };
    });
};

const FaseBadge = ({ value, fecha, detail, onClick }) => {
    if (!value || value === '-') return <span className="mma-phase muted">—</span>;
    const label = value === 'EN_COLA' ? 'En cola' : value === 'EN_PROCESO' ? 'En proceso' : value;
    const clickable = typeof onClick === 'function';
    return (
        <span
            className={`mma-phase ${value.toLowerCase().replaceAll('_', '-')} ${clickable ? 'clickable' : ''}`}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            title={detail?.tooltip || detail?.mensaje_usuario || ''}
            onClick={onClick}
            onKeyDown={clickable ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick(event);
                }
            } : undefined}
        >
            {label}
            {fecha && value === 'OK' && <small>{fmtFecha(fecha)}</small>}
        </span>
    );
};

const faseValor = (estadoBackend, fallback) => {
    if (!estadoBackend) return fallback;
    if (estadoBackend === 'ok') return 'OK';
    if (estadoBackend === 'error') return 'ERROR';
    if (estadoBackend === 'pendiente') return 'EN_COLA';
    if (estadoBackend === 'na') return '-';
    return fallback;
};

const resolverIndiceFaseActiva = (carga, fases) => {
    if (!carga || !['PENDIENTE', 'EN_PROCESO'].includes(carga.estado_proceso)) return -1;
    const faseActual = String(carga.fase_actual || '').toLowerCase();
    if (faseActual.includes('fase_1') || faseActual.includes('fase1') || faseActual.includes('inventario')) return 0;
    if (faseActual.includes('fase_2') || faseActual.includes('fase2') || faseActual.includes('metadata') || faseActual.includes('ocr')) return 1;
    if (faseActual.includes('fase_3') || faseActual.includes('fase3') || faseActual.includes('relacion')) return 2;
    if (faseActual.includes('fase_4') || faseActual.includes('fase4') || faseActual.includes('validacion')) return 3;
    if (faseActual.includes('fase_5') || faseActual.includes('fase5') || faseActual.includes('saia')) return 4;
    const enProceso = fases.findIndex(fase => fase.estado === 'en_proceso');
    if (enProceso >= 0) return enProceso;
    return fases.findIndex(fase => fase.estado === 'pendiente');
};

const valorCampo = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const intentoExitoso = (doc) => (doc?.resultado?.intentos_saia || []).find(i => i.exitoso);

const MigracionMasivaArchivo = () => {
    const fileInputRef = useRef(null);
    const [nombre, setNombre] = useState('PEL 2024');
    const [correoDestino, setCorreoDestino] = useState('');
    const [correoModificado, setCorreoModificado] = useState(false);
    const [guardandoCorreo, setGuardandoCorreo] = useState(false);
    const [archivos, setArchivos] = useState([]);
    const [tab, setTab] = useState('documentos');
    const [detalleDoc, setDetalleDoc] = useState(null);
    const [detalleFase, setDetalleFase] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [preflight, setPreflight] = useState(null);
    const [estadoOperacion, setEstadoOperacion] = useState(null);
    const [dryRun, setDryRun] = useState(true);
    const [headful, setHeadful] = useState(false);
    const [tamanoSublote, setTamanoSublote] = useState(10);
    const [pausaEntre, setPausaEntre] = useState(3);
    const [auditoria, setAuditoria] = useState(null);
    const [auditFilters, setAuditFilters] = useState({ lote_id: '', documento_id: '', fase: '', evento: '', nivel: '', desde: '', hasta: '' });
    const [historialGlobal, setHistorialGlobal] = useState(null);
    const [manualesGlobal, setManualesGlobal] = useState(null);
    const [qaDocumentoId, setQaDocumentoId] = useState('');
    const [qaRouteCode, setQaRouteCode] = useState('');
    const [qaResultado, setQaResultado] = useState(null);
    const [qaLoading, setQaLoading] = useState(false);

    const {
        cargas,
        cargaActual,
        procesando,
        config,
        crearCarga,
        previewCarga,
        cargarDetalleErrorDocumento,
        preflightOperacion,
        cargarEstadoOperacion,
        cargarAuditoria,
        qaSaia,
        ejecutarLimpieza,
        cargarHistorialGlobal,
        cargarManualesGlobal,
        marcarRevisadoGlobal,
        marcarOkGlobal,
        reintentarFallidosGlobal,
        procesarCarga,
        reintentarFallidos,
        pararCarga,
        marcarRevisado,
        marcarOk,
        descargarReporte,
        reenviarReporte,
        guardarConfig,
    } = useMigracionMasivaArchivo();

    // El backend exige can_upload_migracion_masiva_archivo_saia además de
    // can_manage_migracion_masiva_archivo para: procesar con cargar_saia=true,
    // marcar-revisado y marcar-ok (ambas reencolan una carga real a SAIA — ver
    // migracion_masiva_archivo/views.py). Sin este chequeo, un usuario sin ese
    // permiso vería un 403 garantizado en cada clic.
    const { puedeCargarSaia } = useMemo(() => {
        const user = usuarioActual();
        const permisos = user.permisos_rol || [];
        return { puedeCargarSaia: !!user.is_superuser || permisos.includes('can_upload_migracion_masiva_archivo_saia') };
    }, []);
    const [cargarSaia, setCargarSaia] = useState(puedeCargarSaia);

    useEffect(() => {
        if (config?.correo_destino && !correoModificado) {
            setCorreoDestino(config.correo_destino);
        }
    }, [config, correoModificado]);

    const carga = cargaActual || cargas[0] || null;
    const documentos = carga?.archivos || [];
    const logs = carga?.logs || [];
    const previewOperativo = preview?.preview_operativo || null;

    const seleccionResumen = useMemo(() => {
        if (!archivos.length) return '';
        const primeraCarpeta = archivos[0]?.webkitRelativePath?.split('/')?.[0];
        return primeraCarpeta || `${archivos.length} archivo(s) seleccionado(s)`;
    }, [archivos]);

    const totales = useMemo(() => {
        const total = carga?.total_archivos ?? documentos.length ?? archivos.length;
        const cargados = carga?.exitosos ?? documentos.filter(d => d.estado_proceso === 'CARGADO_SAIA').length;
        const errores = carga?.fallidos ?? documentos.filter(d => d.estado_proceso === 'ERROR_SAIA').length;
        const revision = carga?.pendientes_revision ?? documentos.filter(d => d.estado_proceso === 'REQUIERE_REVISION').length;
        return { total, cargados, errores, revision };
    }, [archivos.length, carga, documentos]);

    const fases = useMemo(() => calcularFases(logs, !!carga), [logs, carga]);
    const faseActivaIndex = useMemo(() => resolverIndiceFaseActiva(carga, fases), [carga, fases]);

    const estadoUi = carga?.estado_proceso || (archivos.length ? 'PENDIENTE' : 'Inactivo');
    const estaActivo = ['PENDIENTE', 'EN_PROCESO'].includes(carga?.estado_proceso) || procesando;

    const abrirDetalleFase = async (doc, phaseKey, event) => {
        event?.stopPropagation();
        if (!doc?.id || String(doc.id).startsWith('local-')) return;
        const fallbackPhase = doc.fases_detalle?.[phaseKey] || null;
        setDetalleFase({ doc, phaseKey, phase: fallbackPhase, loading: true });
        try {
            const data = await cargarDetalleErrorDocumento(doc.id, phaseKey);
            const diagnostico = data?.diagnostico || {};
            const phase = diagnostico.fases_detalle?.[phaseKey] || fallbackPhase;
            setDetalleFase({
                doc: data?.documento || doc,
                phaseKey,
                phase,
                diagnostico,
                loading: false,
            });
        } catch (error) {
            setDetalleFase({
                doc,
                phaseKey,
                phase: fallbackPhase,
                error: 'No fue posible consultar el detalle enriquecido del error.',
                loading: false,
            });
        }
    };

    const handleSeleccionArchivos = async (event) => {
        const seleccionados = Array.from(event.target.files || []);
        setArchivos(seleccionados);
        setPreview(null);
        setPreflight(null);
        if (!seleccionados.length) return;
        setPreviewLoading(true);
        try {
            const data = await previewCarga({ archivos: seleccionados });
            setPreview(data);
        } catch (error) {
            swal({ title: 'No fue posible generar el preview', icon: 'error', text: error?.response?.data?.error || 'Revisa los archivos seleccionados.' });
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleIniciar = async () => {
        if (!nombre.trim() || !archivos.length) return;
        const opciones = {
            cargar_saia: cargarSaia,
            dry_run: dryRun,
            headful,
            tamano_sublote: Number(tamanoSublote) || 10,
            pausa_entre: Number(pausaEntre) || 0,
            enviar_correo: !!correoDestino,
            destinatario: correoDestino,
        };
        try {
            const pf = await preflightOperacion(opciones);
            setPreflight(pf);
        } catch (error) {
            const pf = error?.response?.data?.preflight || error?.response?.data;
            setPreflight(pf || null);
            swal({ title: 'Preflight fallido', icon: 'error', text: pf?.errores?.map(item => `${item.titulo || item.clave}: ${item.mensaje || 'No disponible'}`).join(' | ') || 'No se pudo validar la operación.' });
            return;
        }
        const nuevaCarga = await crearCarga({ nombre, archivos });
        if (!nuevaCarga) return;
        await procesarCarga(nuevaCarga.id, opciones);
    };

    const refrescarEstadoOperacion = useCallback(async () => {
        try {
            const data = await cargarEstadoOperacion();
            setEstadoOperacion(data);
        } catch {
            setEstadoOperacion(null);
        }
    }, [cargarEstadoOperacion]);

    useEffect(() => {
        refrescarEstadoOperacion();
        const id = setInterval(refrescarEstadoOperacion, 8000);
        return () => clearInterval(id);
    }, [refrescarEstadoOperacion]);

    const handlePreflightManual = async () => {
        try {
            const pf = await preflightOperacion({ enviar_correo: !!correoDestino, destinatario: correoDestino });
            setPreflight(pf);
            swal({ title: 'Preflight OK', icon: 'success', text: 'SAIA, Chromium y MinIO respondieron correctamente.' });
        } catch (error) {
            const pf = error?.response?.data?.preflight || error?.response?.data;
            setPreflight(pf || null);
            swal({ title: 'Preflight fallido', icon: 'error', text: pf?.errores?.map(item => `${item.titulo || item.clave}: ${item.mensaje || 'No disponible'}`).join(' | ') || 'No se pudo validar la operación.' });
        }
    };

    const handleLimpiezaDryRun = async () => {
        try {
            const data = await ejecutarLimpieza({ tipo: 'all', dry_run: true });
            swal({ title: 'Dry-run de limpieza', icon: 'info', text: JSON.stringify(data.resultados) });
        } catch (error) {
            swal({ title: 'No fue posible probar limpieza', icon: 'error', text: error?.response?.data?.error || 'Revisa la configuración de MinIO.' });
        }
    };

    const handleDryRunDoc = async () => {
        if (!detalleFase?.doc?.id) return;
        try {
            const data = await qaSaia({ accion: 'dry_run_documento', documento_id: detalleFase.doc.id, headful });
            swal({ title: 'Dry-run encolado', icon: 'success', text: `Task: ${data.task_id}` });
        } catch (error) {
            swal({ title: 'No fue posible encolar dry-run', icon: 'error', text: error?.response?.data?.error || 'Documento no elegible para prueba SAIA.' });
        }
    };

    const cargarAuditoriaVista = useCallback(async () => {
        const data = await cargarAuditoria(Object.fromEntries(
            Object.entries(auditFilters).filter(([, value]) => value !== ''),
        ));
        setAuditoria(data);
    }, [auditFilters, cargarAuditoria]);

    const cargarHistorialVista = useCallback(async () => {
        const data = await cargarHistorialGlobal({ page_size: 100 });
        setHistorialGlobal(data);
    }, [cargarHistorialGlobal]);

    const cargarManualesVista = useCallback(async () => {
        const data = await cargarManualesGlobal({ page_size: 100 });
        setManualesGlobal(data);
    }, [cargarManualesGlobal]);

    useEffect(() => {
        if (tab === 'auditoria') cargarAuditoriaVista().catch(() => setAuditoria(null));
        if (tab === 'historial-global') cargarHistorialVista().catch(() => setHistorialGlobal(null));
        if (tab === 'manuales-global') cargarManualesVista().catch(() => setManualesGlobal(null));
    }, [tab, cargarAuditoriaVista, cargarHistorialVista, cargarManualesVista]);

    const exportarAuditoria = () => {
        if (!auditoria) return;
        const blob = new Blob([JSON.stringify(auditoria, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `auditoria_migracion_saia_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleManualGlobal = async (docId, accion) => {
        try {
            if (accion === 'ok') await marcarOkGlobal(docId);
            else await marcarRevisadoGlobal(docId);
            await cargarManualesVista();
            swal({ title: 'Documento actualizado', icon: 'success' });
        } catch (error) {
            swal({ title: 'No fue posible actualizar el documento', icon: 'error', text: error?.response?.data?.error || 'Revisa permisos o estado del documento.' });
        }
    };

    const handleReintentarGlobal = async () => {
        try {
            const data = await reintentarFallidosGlobal({ dry_run: true });
            swal({ title: 'Reintento global dry-run', icon: 'info', text: JSON.stringify(data.totales || data) });
            await cargarManualesVista();
        } catch (error) {
            swal({ title: 'No fue posible reintentar fallidos', icon: 'error', text: error?.response?.data?.error || 'Revisa el estado de los documentos.' });
        }
    };

    const ejecutarQa = async (accion) => {
        setQaLoading(true);
        setQaResultado(null);
        try {
            const payload = {
                accion,
                documento_id: qaDocumentoId || undefined,
                route_code: qaRouteCode || undefined,
                headful,
                destinatario: correoDestino,
            };
            if (accion === 'diagnostico_profundo') {
                payload.confirmar_carga = false;
                payload.adjuntar_en_dry_run = false;
            }
            const data = await qaSaia(payload);
            setQaResultado(data);
        } catch (error) {
            setQaResultado(error?.response?.data || { error: error?.message || 'Error QA' });
        } finally {
            setQaLoading(false);
        }
    };

    const handleGuardarCorreo = async () => {
        setGuardandoCorreo(true);
        const res = await guardarConfig(correoDestino);
        setGuardandoCorreo(false);
        if (res) setCorreoModificado(false);
    };

    const handleReenviarReporte = async () => {
        if (!carga) return;
        const { value: destino } = await swal({
            title: 'Reenviar reporte',
            input: 'email',
            inputLabel: 'Correo destinatario',
            inputValue: correoDestino,
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
        });
        if (!destino) return;
        await reenviarReporte(carga.id, [destino]);
    };

    // Mismo criterio que _ESTADOS_RETROCEDIBLES en el backend: un documento en
    // ERROR_SAIA también se revisa/reintenta manualmente, no solo REQUIERE_REVISION.
    const documentosPendientesRevision = documentos.filter(d => ESTADOS_REVISABLES.includes(d.estado_proceso));
    const documentosCargados = documentos.filter(d => d.estado_proceso === 'CARGADO_SAIA');

    return (
        <div className="vyd-main fade-in mma-desktop">
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title">
                        <FiUpload size={20} /> Migración Masiva de Archivo
                    </h1>
                    <p className="vyd-page-sub">
                        Inventario, validación y carga controlada de archivos
                    </p>
                </div>
            </div>

            <div className="mma-toolbar">
                <label>Carpeta</label>
                <button className="mma-btn light" onClick={() => fileInputRef.current?.click()}>
                    Explorar
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    webkitdirectory=""
                    directory=""
                    className="mma-hidden-file"
                    onChange={handleSeleccionArchivos}
                />

                <label>Nombre lote:</label>
                <input className="mma-lote" value={nombre} onChange={e => setNombre(e.target.value)} />

                <label>Correo destino:</label>
                <input
                    className="mma-correo"
                    value={correoDestino}
                    onChange={e => { setCorreoDestino(e.target.value); setCorreoModificado(true); }}
                />
                {correoModificado && (
                    <button className="mma-btn light" onClick={handleGuardarCorreo} disabled={guardandoCorreo}>
                        {guardandoCorreo ? 'Guardando…' : 'Guardar'}
                    </button>
                )}

                <label
                    className="mma-checkbox"
                    title={puedeCargarSaia ? 'Cargar los documentos validados a SAIA' : 'Tu rol no tiene permiso para cargar a SAIA — solo se ejecutarán las fases de extracción/validación'}
                >
                    <input
                        type="checkbox"
                        checked={cargarSaia}
                        disabled={!puedeCargarSaia}
                        onChange={e => setCargarSaia(e.target.checked)}
                    />
                    Cargar a SAIA
                </label>
                <label className="mma-checkbox" title="Ejecuta navegacion hasta antes de confirmar carga real">
                    <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
                    Dry-run
                </label>
                <label className="mma-checkbox" title="Mostrar navegador solo para QA">
                    <input type="checkbox" checked={headful} onChange={e => setHeadful(e.target.checked)} />
                    Headful QA
                </label>
                <input className="mma-mini-input" type="number" min="1" max="100" value={tamanoSublote} onChange={e => setTamanoSublote(e.target.value)} title="Tamano de sublote" />
                <input className="mma-mini-input" type="number" min="0" max="60" value={pausaEntre} onChange={e => setPausaEntre(e.target.value)} title="Pausa entre documentos" />

                <div className="mma-toolbar-spacer" />

                <button className="mma-btn light" onClick={handlePreflightManual} disabled={procesando}>
                    <FiInfo size={14} /> Preflight
                </button>
                <button className="mma-btn primary" onClick={handleIniciar} disabled={estaActivo}>
                    <FiPlay size={14} /> INICIAR
                </button>
                <button className="mma-btn danger" onClick={() => pararCarga(carga.id)} disabled={!estaActivo || !carga}>
                    <FiSquare size={12} /> PARAR
                </button>
            </div>

            <div className="mma-from">
                Envía desde: <span>{correoDestino || '—'}</span>
                {seleccionResumen && <strong> · {seleccionResumen}</strong>}
            </div>

            {(previewLoading || previewOperativo || preflight || estadoOperacion) && (
                <div className="mma-operacion-grid">
                    <div className="mma-op-panel">
                        <div className="mma-op-head">
                            <strong>Preview operativo</strong>
                            {previewLoading && <span>Analizando...</span>}
                        </div>
                        {previewOperativo ? (
                            <>
                                <div className="mma-op-metrics">
                                    <span>PDF <b>{previewOperativo.totales?.pdf ?? 0}</b></span>
                                    <span>No PDF <b>{previewOperativo.totales?.no_pdf ?? 0}</b></span>
                                    <span>Rutas OK <b>{previewOperativo.totales?.rutas_reconocidas ?? 0}</b></span>
                                    <span>Sin ruta <b>{previewOperativo.totales?.rutas_no_reconocidas ?? 0}</b></span>
                                    <span>Duplicados <b>{previewOperativo.totales?.duplicados_probables ?? 0}</b></span>
                                    <span>Bloqueos F1 <b>{previewOperativo.totales?.bloqueos_fase1 ?? 0}</b></span>
                                </div>
                                {(previewOperativo.bloqueos_fase1 || []).slice(0, 4).map((item, index) => (
                                    <p key={`${item.ruta_archivo}-${index}`} className="mma-op-warning">{item.codigo}: {item.nombre_archivo} - {item.mensaje}</p>
                                ))}
                                {(previewOperativo.lotes_reutilizables || []).length > 0 && (
                                    <p className="mma-op-info">Lotes reutilizables: {previewOperativo.lotes_reutilizables.map(l => `#${l.lote_id}`).join(', ')}</p>
                                )}
                            </>
                        ) : (
                            <p>Selecciona una carpeta para validar PDFs, omitidos, rutas y duplicados antes de crear el lote.</p>
                        )}
                    </div>
                    <div className="mma-op-panel">
                        <div className="mma-op-head">
                            <strong>Estado operativo</strong>
                            <button className="mma-link-btn" onClick={refrescarEstadoOperacion}>Actualizar</button>
                        </div>
                        <p>Proceso activo: <b>{estadoOperacion?.proceso_activo ? 'Si' : 'No'}</b></p>
                        <p>Lote activo: <b>{estadoOperacion?.lote_activo?.nombre || 'Ninguno'}</b></p>
                        <p>Fase actual: <b>{estadoOperacion?.fase_actual || 'Sin fase activa'}</b></p>
                        {estadoOperacion?.ultimo_error && (
                            <p className="mma-op-warning">{estadoOperacion.ultimo_error.evento}: {estadoOperacion.ultimo_error.mensaje}</p>
                        )}
                        <div className="mma-op-actions">
                            <button className="mma-btn light" onClick={handleLimpiezaDryRun}>Dry-run limpieza</button>
                        </div>
                    </div>
                    {preflight && (
                        <div className="mma-op-panel">
                            <div className="mma-op-head">
                                <strong>Preflight</strong>
                                <span className={preflight.ok ? 'mma-op-ok' : 'mma-op-error'}>{preflight.ok ? 'OK' : 'Fallido'}</span>
                            </div>
                            {(preflight.checks || []).map(item => (
                                <p key={item.clave} className={item.ok ? 'mma-op-info' : 'mma-op-warning'}>
                                    {item.titulo || item.clave}: {item.ok ? 'OK' : item.mensaje}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="mma-cards">
                <div className="mma-card">
                    <span>TOTAL DOCUMENTOS</span>
                    <strong>{totales.total}</strong>
                    <small>en el lote</small>
                </div>
                <div className="mma-card ok">
                    <span>CARGADOS SAIA</span>
                    <strong>{totales.cargados}</strong>
                    <small>exitosos</small>
                </div>
                <div className="mma-card warn">
                    <span>REVISIÓN MANUAL</span>
                    <strong>{totales.revision}</strong>
                    <small>requieren atención</small>
                </div>
                <div className="mma-card err">
                    <span>ERRORES SAIA</span>
                    <strong>{totales.errores}</strong>
                    <small>fallidos</small>
                    {!estaActivo && totales.errores > 0 && carga && (
                        <button className="mma-btn light" style={{ marginTop: 8, height: 24, padding: '0 8px', fontSize: 11 }} onClick={() => reintentarFallidos(carga.id)}>
                            <FiRotateCcw size={11} /> Reintentar fallidos
                        </button>
                    )}
                </div>
                <div className="mma-card status">
                    <span><i className={estaActivo ? 'active' : ''} /> {estadoUi?.replaceAll('_', ' ')}</span>
                    <small>{carga?.nombre || '—'}</small>
                    <small>{carga ? fmtFecha(carga.creado) : '—'}</small>
                </div>
            </div>

            <div className="mma-phases">
                {fases.map((fase, index) => (
                    <div key={fase.label} className={`mma-progress ${fase.estado} ${faseActivaIndex === index ? 'actual' : ''}`}>
                        <div>
                            {faseActivaIndex === index && <FiChevronRight className="mma-progress-arrow" size={16} />}
                            {fase.label}
                        </div>
                        <span><i style={{ width: `${fase.pct}%` }} /></span>
                        <small>{ETIQUETA_FASE[fase.estado]}</small>
                    </div>
                ))}
            </div>

            <div className="mma-tabs-panel">
                <div className="mma-tabs">
                    <button className={tab === 'documentos' ? 'on' : ''} onClick={() => setTab('documentos')}>
                        Documentos <span>{documentos.length || archivos.length}</span>
                    </button>
                    <button className={tab === 'revision' ? 'on' : ''} onClick={() => setTab('revision')}>
                        Revisión Manual <span className="red">{totales.revision}</span>
                    </button>
                    <button className={tab === 'historial' ? 'on' : ''} onClick={() => setTab('historial')}>
                        Historial SAIA <span>{totales.cargados}</span>
                    </button>
                    <button className={tab === 'logs' ? 'on' : ''} onClick={() => setTab('logs')}>
                        Logs de ejecución
                    </button>
                    <button className={tab === 'auditoria' ? 'on' : ''} onClick={() => setTab('auditoria')}>
                        Auditoria global
                    </button>
                    <button className={tab === 'manuales-global' ? 'on' : ''} onClick={() => setTab('manuales-global')}>
                        Manuales global
                    </button>
                    <button className={tab === 'historial-global' ? 'on' : ''} onClick={() => setTab('historial-global')}>
                        Historial global
                    </button>
                    <button className={tab === 'qa-saia' ? 'on' : ''} onClick={() => setTab('qa-saia')}>
                        QA SAIA
                    </button>
                    {carga && (
                        <div className="mma-download-tab">
                            <button className="mma-tab-action" onClick={() => descargarReporte(carga.id)}>
                                <FiDownload size={13} /> Reporte
                            </button>
                            <button className="mma-tab-action" onClick={handleReenviarReporte}>
                                <FiSend size={13} /> Reenviar
                            </button>
                        </div>
                    )}
                </div>

                {tab === 'logs' && (
                    <div className="mma-log-box">
                        {logs.map(log => (
                            <div key={log.id} className={`mma-log ${log.nivel?.toLowerCase()}`}>
                                <span>{fmtFecha(log.creado)}</span>
                                <strong>{log.nivel}</strong>
                                <p>{log.mensaje}</p>
                            </div>
                        ))}
                        {!logs.length && <div className="mma-empty">Sin logs todavía.</div>}
                    </div>
                )}

                {tab === 'auditoria' && (
                    <div className="mma-global-panel">
                        <div className="mma-filter-grid">
                            {['lote_id', 'documento_id', 'fase', 'evento', 'nivel', 'desde', 'hasta'].map(key => (
                                <label key={key}>
                                    <span>{key}</span>
                                    <input
                                        value={auditFilters[key]}
                                        onChange={event => setAuditFilters(prev => ({ ...prev, [key]: event.target.value }))}
                                        placeholder={key === 'fase' ? 'f1/f2/f3/f4/saia' : ''}
                                    />
                                </label>
                            ))}
                            <button className="mma-btn primary" onClick={cargarAuditoriaVista}>Filtrar</button>
                            <button className="mma-btn light" onClick={exportarAuditoria} disabled={!auditoria}>Exportar JSON</button>
                        </div>
                        <div className="mma-table-wrap">
                            <table className="mma-doc-table">
                                <thead>
                                    <tr>
                                        <th>FECHA</th>
                                        <th>NIVEL</th>
                                        <th>FASE</th>
                                        <th>EVENTO</th>
                                        <th>LOTE / DOCUMENTO</th>
                                        <th>MENSAJE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(auditoria?.timeline || []).map(log => (
                                        <tr key={log.id}>
                                            <td>{fmtFecha(log.creado)}</td>
                                            <td><span className={badgeClass(log.nivel)}>{log.nivel}</span></td>
                                            <td>{log.fase || '-'}</td>
                                            <td>{log.evento}</td>
                                            <td>#{log.lote_id || '-'} / #{log.documento_id || '-'}</td>
                                            <td>
                                                {log.mensaje}
                                                {log.detalle && Object.keys(log.detalle).length > 0 && (
                                                    <details className="mma-inline-details">
                                                        <summary>Detalle</summary>
                                                        <pre>{JSON.stringify(log.detalle, null, 2)}</pre>
                                                    </details>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {!(auditoria?.timeline || []).length && (
                                        <tr><td colSpan={6} className="mma-empty">Sin registros de auditoria para los filtros actuales.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'manuales-global' && (
                    <div className="mma-global-panel">
                        <div className="mma-global-actions">
                            <button className="mma-btn light" onClick={cargarManualesVista}>Actualizar</button>
                            <button className="mma-btn primary" onClick={handleReintentarGlobal} disabled={!puedeCargarSaia}>
                                <FiRotateCcw size={13} /> Reintentar elegibles dry-run
                            </button>
                        </div>
                        <div className="mma-table-wrap">
                            <table className="mma-doc-table">
                                <thead>
                                    <tr>
                                        <th>DOCUMENTO</th>
                                        <th>ESTADO</th>
                                        <th>ERROR</th>
                                        <th>ACCION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(manualesGlobal?.results || []).map(doc => (
                                        <tr key={doc.id}>
                                            <td>{doc.nombre_archivo || doc.nombre_original}</td>
                                            <td><span className={badgeClass(doc.estado_proceso)}>{doc.estado_proceso}</span></td>
                                            <td>{doc.mensaje_error_usuario?.mensaje_usuario || doc.error || '-'}</td>
                                            <td>
                                                <button className="mma-btn light" onClick={() => setDetalleDoc(doc)}>
                                                    <FiInfo size={12} /> Detalle
                                                </button>
                                                <button className="mma-btn primary" onClick={() => handleManualGlobal(doc.id, 'revisado')} disabled={!puedeCargarSaia}>
                                                    Revisado
                                                </button>
                                                <button className="mma-btn primary" onClick={() => handleManualGlobal(doc.id, 'ok')} disabled={!puedeCargarSaia}>
                                                    Marcar OK
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!(manualesGlobal?.results || []).length && (
                                        <tr><td colSpan={4} className="mma-empty">Sin documentos globales pendientes de revision.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'historial-global' && (
                    <div className="mma-global-panel">
                        <div className="mma-global-actions">
                            <button className="mma-btn light" onClick={cargarHistorialVista}>Actualizar</button>
                        </div>
                        <div className="mma-table-wrap">
                            <table className="mma-doc-table">
                                <thead>
                                    <tr>
                                        <th>FECHA</th>
                                        <th>DOCUMENTO</th>
                                        <th>ID SAIA</th>
                                        <th>USUARIO</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(historialGlobal?.results || []).map((item, index) => (
                                        <tr key={`${item.documento_id}-${item.numero_intento}-${index}`}>
                                            <td>{fmtFecha(item.creado)}</td>
                                            <td>{item.documento_nombre}</td>
                                            <td>{item.id_documento_saia || '-'}</td>
                                            <td>{item.usuario_saia || '-'}</td>
                                            <td>{item.status_code || '-'}</td>
                                        </tr>
                                    ))}
                                    {!(historialGlobal?.results || []).length && (
                                        <tr><td colSpan={5} className="mma-empty">Sin historial SAIA global.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'qa-saia' && (
                    <div className="mma-global-panel">
                        <div className="mma-qa-grid">
                            <label>
                                <span>documento_id</span>
                                <input value={qaDocumentoId} onChange={event => setQaDocumentoId(event.target.value)} />
                            </label>
                            <label>
                                <span>route_code</span>
                                <input value={qaRouteCode} onChange={event => setQaRouteCode(event.target.value.toUpperCase())} placeholder="PEL, RFTE, SER..." />
                            </label>
                            <button className="mma-btn light" onClick={() => ejecutarQa('probar_login')} disabled={qaLoading}>Probar login/preflight</button>
                            <button className="mma-btn light" onClick={() => ejecutarQa('diagnosticar_ruta')} disabled={qaLoading}>Diagnosticar ruta</button>
                            <button className="mma-btn light" onClick={() => ejecutarQa('diagnostico_profundo')} disabled={qaLoading || !qaDocumentoId}>Navegacion dry-run</button>
                            <button className="mma-btn primary" onClick={() => ejecutarQa('dry_run_documento')} disabled={qaLoading || !qaDocumentoId}>Dry-run documento</button>
                            <button className="mma-btn light" onClick={() => ejecutarQa('probar_correo')} disabled={qaLoading || !correoDestino}>Probar correo</button>
                        </div>
                        {qaLoading && <div className="mma-empty">Ejecutando QA...</div>}
                        {qaResultado && (
                            <div className="mma-qa-result">
                                <pre>{JSON.stringify(qaResultado, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'revision' && (
                    <div className="mma-table-wrap">
                        <table className="mma-doc-table">
                            <thead>
                                <tr>
                                    <th>ARCHIVO</th>
                                    <th>ESTADO</th>
                                    <th>MOTIVO PARA EL ANALISTA</th>
                                    <th>ACCIÓN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documentosPendientesRevision.map(doc => (
                                    <tr key={doc.id}>
                                        <td>{doc.nombre_original}</td>
                                        <td><span className={badgeClass(doc.estado_proceso)}>{doc.estado_proceso.replaceAll('_', ' ')}</span></td>
                                        <td style={{ maxWidth: 320 }}>{doc.resultado?.mensaje_analista || doc.error || '—'}</td>
                                        <td>
                                            <button className="mma-btn light" style={{ height: 26, padding: '0 8px', fontSize: 11 }} onClick={() => setDetalleDoc(doc)}>
                                                <FiInfo size={11} /> Detalle
                                            </button>
                                            <button
                                                className="mma-btn primary"
                                                style={{ height: 26, padding: '0 8px', fontSize: 11, marginLeft: 6 }}
                                                onClick={() => marcarRevisado(carga.id, doc.id)}
                                                disabled={!puedeCargarSaia}
                                                title={puedeCargarSaia ? '' : 'Tu rol no tiene permiso para reencolar cargas a SAIA'}
                                            >
                                                <FiCheck size={11} /> Revisado
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!documentosPendientesRevision.length && (
                                    <tr>
                                        <td colSpan={4} className="mma-empty">Sin documentos pendientes de revisión.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'historial' && (
                    <div className="mma-table-wrap">
                        <table className="mma-doc-table">
                            <thead>
                                <tr>
                                    <th>FECHA</th>
                                    <th>ARCHIVO</th>
                                    <th>DOCUMENTO SAIA</th>
                                    <th>USUARIO SAIA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documentosCargados.map(doc => {
                                    const intento = intentoExitoso(doc);
                                    return (
                                        <tr key={doc.id}>
                                            <td>{fmtFecha(intento?.creado || doc.modificado)}</td>
                                            <td>{doc.nombre_original}</td>
                                            <td>{intento?.id_documento_saia || '—'}</td>
                                            <td>{intento?.usuario_saia || '—'}</td>
                                        </tr>
                                    );
                                })}
                                {!documentosCargados.length && (
                                    <tr>
                                        <td colSpan={4} className="mma-empty">Sin historial de cargas exitosas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'documentos' && (
                    <div className="mma-table-wrap">
                        <table className="mma-doc-table">
                            <thead>
                                <tr>
                                    <th>ARCHIVO</th>
                                    <th>F1 INV.</th>
                                    <th>F2 OCR</th>
                                    <th>F3 REL.</th>
                                    <th>F4 VAL.</th>
                                    <th>SAIA</th>
                                    <th>ESTADO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(documentos.length ? documentos : archivos.map((archivo, idx) => ({
                                    id: `local-${idx}`,
                                    nombre_original: archivo.name,
                                    estado_proceso: 'PENDIENTE',
                                    creado: null,
                                }))).map(doc => {
                                    const fallback = faseDesdeEstado(doc.estado_proceso);
                                    const valoresFase = PHASE_COLUMNS.reduce((acc, column) => ({
                                        ...acc,
                                        [column.key]: faseValor(doc.fases?.[column.key], fallback[column.fallbackIndex]),
                                    }), {});
                                    const estado = fallback[5];
                                    return (
                                        <tr key={doc.id} onClick={() => documentos.length && setDetalleDoc(doc)} style={{ cursor: documentos.length ? 'pointer' : 'default' }}>
                                            <td>{doc.nombre_original}</td>
                                            <td><FaseBadge value={valoresFase.f1} detail={doc.fases_detalle?.f1} onClick={(event) => abrirDetalleFase(doc, 'f1', event)} /></td>
                                            <td><FaseBadge value={valoresFase.f2} detail={doc.fases_detalle?.f2} onClick={(event) => abrirDetalleFase(doc, 'f2', event)} /></td>
                                            <td><FaseBadge value={valoresFase.f3} detail={doc.fases_detalle?.f3} onClick={(event) => abrirDetalleFase(doc, 'f3', event)} /></td>
                                            <td><FaseBadge value={valoresFase.f4} detail={doc.fases_detalle?.f4} onClick={(event) => abrirDetalleFase(doc, 'f4', event)} /></td>
                                            <td><FaseBadge value={valoresFase.saia} detail={doc.fases_detalle?.saia} fecha={doc.modificado || doc.creado} onClick={(event) => abrirDetalleFase(doc, 'saia', event)} /></td>
                                            <td><span className={badgeClass(doc.estado_proceso)}>{estado}</span></td>
                                        </tr>
                                    );
                                })}
                                {!documentos.length && !archivos.length && (
                                    <tr>
                                        <td colSpan={7} className="mma-empty">Selecciona una carpeta o carga archivos para iniciar.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={!!detalleFase}
                onClose={() => setDetalleFase(null)}
                title={`${detalleFase?.doc?.nombre_original || detalleFase?.doc?.nombre_archivo || 'Documento'} - ${detalleFase?.phase?.fase_corta || 'Fase'}`}
                size="md"
            >
                {detalleFase && (
                    <div className="mma-detail mma-phase-detail">
                        {detalleFase.loading && <p>Consultando detalle de la fase...</p>}
                        {detalleFase.error && <p className="mma-error-text">{detalleFase.error}</p>}
                        {detalleFase.phase && (
                            <>
                                <div className="mma-detail-head">
                                    <span className={`mma-phase ${String(detalleFase.phase.estado || '').replaceAll('_', '-')}`}>
                                        {detalleFase.phase.label || detalleFase.phase.estado}
                                    </span>
                                    {detalleFase.phase.severidad && <span className="mma-detail-severity">{detalleFase.phase.severidad}</span>}
                                    {detalleFase.phase.codigo_error_usuario && <code>{detalleFase.phase.codigo_error_usuario}</code>}
                                </div>
                                <p><strong>Fase:</strong> {detalleFase.phase.titulo || detalleFase.phase.fase_corta}</p>
                                {detalleFase.phase.mensaje_usuario && (
                                    <p><strong>Error detectado:</strong> {detalleFase.phase.mensaje_usuario}</p>
                                )}
                                {detalleFase.phase.accion_sugerida && (
                                    <p><strong>Acción sugerida:</strong> {detalleFase.phase.accion_sugerida}</p>
                                )}
                                {detalleFase.phase.error_tecnico && (
                                    <p><strong>Error técnico:</strong> {detalleFase.phase.error_tecnico}</p>
                                )}
                                {detalleFase.diagnostico?.ultimo_intento_saia && (
                                    <>
                                        <p><strong>Último intento SAIA</strong></p>
                                        <ul>
                                            <li>Estado: {detalleFase.diagnostico.ultimo_intento_saia.exitoso ? 'Exitoso' : 'Fallido'}</li>
                                            <li>Status: {valorCampo(detalleFase.diagnostico.ultimo_intento_saia.status_code)}</li>
                                            <li>Documento SAIA: {valorCampo(detalleFase.diagnostico.ultimo_intento_saia.id_documento_saia)}</li>
                                            <li>Mensaje: {valorCampo(detalleFase.diagnostico.ultimo_intento_saia.mensaje_error)}</li>
                                        </ul>
                                    </>
                                )}
                                <div className="mma-phase-actions">
                                    <button className="mma-btn light" onClick={handleDryRunDoc} disabled={!detalleFase?.doc?.id}>
                                        <FiPlay size={13} /> Dry-run SAIA
                                    </button>
                                </div>
                                {(detalleFase.diagnostico?.evidencias_saia || []).length > 0 && (
                                    <>
                                        <p><strong>Capturas SAIA</strong></p>
                                        <div className="mma-evidence-grid">
                                            {detalleFase.diagnostico.evidencias_saia.map((evidencia, index) => (
                                                <a key={`${evidencia.url}-${index}`} href={evidencia.url} target="_blank" rel="noreferrer" className="mma-evidence">
                                                    {String(evidencia.mime || '').startsWith('image/') ? (
                                                        <img src={evidencia.url} alt={evidencia.tipo || evidencia.nombre} />
                                                    ) : (
                                                        <span>{evidencia.nombre}</span>
                                                    )}
                                                    <small>{evidencia.tipo}</small>
                                                </a>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {(detalleFase.phase.logs || []).length > 0 && (
                                    <>
                                        <p><strong>Logs de la fase</strong></p>
                                        <div className="mma-phase-logs">
                                            {detalleFase.phase.logs.map((log, index) => (
                                                <div key={`${log.evento}-${index}`} className={`mma-log ${log.nivel?.toLowerCase()}`}>
                                                    <span>{fmtFecha(log.creado)}</span>
                                                    <strong>{log.evento}</strong>
                                                    <p>{log.mensaje}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {detalleFase.diagnostico?.contexto_tecnico && (
                                    <details className="mma-technical-context">
                                        <summary>Contexto técnico</summary>
                                        <dl>
                                            {Object.entries(detalleFase.diagnostico.contexto_tecnico)
                                                .filter(([, value]) => value !== '' && value !== null && value !== undefined)
                                                .map(([key, value]) => (
                                                    <div key={key}>
                                                        <dt>{key}</dt>
                                                        <dd>{valorCampo(value)}</dd>
                                                    </div>
                                                ))}
                                        </dl>
                                    </details>
                                )}
                            </>
                        )}
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!detalleDoc} onClose={() => setDetalleDoc(null)} title={detalleDoc?.nombre_original || 'Detalle'} size="md">
                {detalleDoc && (
                    <div className="mma-detail">
                        <p><strong>Estado:</strong> {detalleDoc.estado_proceso?.replaceAll('_', ' ')}</p>
                        {detalleDoc.resultado?.mensaje_analista && (
                            <p><strong>Mensaje para el analista:</strong> {detalleDoc.resultado.mensaje_analista}</p>
                        )}
                        {detalleDoc.resultado?.accion_sugerida && (
                            <p><strong>Acción sugerida:</strong> {detalleDoc.resultado.accion_sugerida}</p>
                        )}
                        {detalleDoc.error && (
                            <p><strong>Error técnico:</strong> {detalleDoc.error}</p>
                        )}
                        {detalleDoc.resultado?.metadata && Object.keys(detalleDoc.resultado.metadata).length > 0 && (
                            <>
                                <p><strong>Metadata extraída</strong></p>
                                <ul>
                                    {Object.entries(detalleDoc.resultado.metadata)
                                        .filter(([, value]) => value !== '' && value !== null)
                                        .map(([key, value]) => (
                                            <li key={key}>{key}: {String(value)}</li>
                                        ))}
                                </ul>
                            </>
                        )}
                        {(detalleDoc.resultado?.intentos_saia || []).length > 0 && (
                            <>
                                <p><strong>Intentos SAIA</strong></p>
                                <ul>
                                    {detalleDoc.resultado.intentos_saia.map(intento => (
                                        <li key={intento.numero_intento}>
                                            {fmtFecha(intento.creado)} — {intento.exitoso ? 'Exitoso' : 'Fallido'}
                                            {intento.mensaje_error && ` (${intento.mensaje_error})`}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {ESTADOS_REVISABLES.includes(detalleDoc.estado_proceso) && carga && (
                            <button
                                className="mma-btn primary"
                                onClick={() => { marcarOk(carga.id, detalleDoc.id); setDetalleDoc(null); }}
                                disabled={!puedeCargarSaia}
                                title={puedeCargarSaia ? '' : 'Tu rol no tiene permiso para reencolar cargas a SAIA'}
                            >
                                <FiCheck size={12} /> Marcar OK y reintentar
                            </button>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MigracionMasivaArchivo;
