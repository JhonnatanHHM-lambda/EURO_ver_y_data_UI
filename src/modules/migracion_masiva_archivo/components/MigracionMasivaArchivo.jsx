import { useEffect, useMemo, useRef, useState } from 'react';
import {
    FiCheck, FiDownload, FiInfo, FiPlay, FiRotateCcw, FiSquare, FiUpload,
} from 'react-icons/fi';
import useMigracionMasivaArchivo from '../hooks/useMigracionMasivaArchivo';
import Modal from '../../core/Modal/components/Modal';
import '../utils/MigracionMasivaArchivo.scss';

const ESTADOS_FINALIZADOS = ['FINALIZADO', 'FINALIZADO_CON_ERRORES'];

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

const faseDesdeEstado = (estado = '') => {
    if (estado === 'CARGADO_SAIA' || estado === 'PROCESADO') return ['OK', 'OK', 'OK', 'OK', 'OK', 'Cargado'];
    if (estado === 'ERROR_SAIA') return ['OK', 'OK', 'OK', 'OK', 'ERROR', 'Error SAIA'];
    if (estado === 'ERROR') return ['OK', 'ERROR', '-', '-', '-', 'Error'];
    if (estado === 'REQUIERE_REVISION') return ['OK', 'OK', 'REVISION', '-', '-', 'Revisión'];
    if (estado === 'RELACIONADO') return ['OK', 'OK', 'OK', 'EN_COLA', 'EN_COLA', 'En cola'];
    if (estado === 'VALIDADO') return ['OK', 'OK', 'EN_COLA', 'EN_COLA', 'EN_COLA', 'Validado'];
    if (estado === 'METADATA_EXTRAIDA') return ['OK', 'OK', 'EN_COLA', '-', '-', 'Metadata'];
    if (estado === 'OCR_PROCESADO') return ['OK', 'OK', '-', '-', '-', 'OCR'];
    if (estado === 'LEIDO') return ['OK', 'EN_COLA', '-', '-', '-', 'Leído'];
    if (estado === 'VALIDANDO') return ['OK', 'EN_PROCESO', '-', '-', '-', 'En proceso'];
    return ['PENDIENTE', '-', '-', '-', '-', 'Pendiente'];
};

const FaseBadge = ({ value, fecha }) => {
    if (!value || value === '-') return <span className="mma-phase muted">—</span>;
    const label = value === 'EN_COLA' ? 'En cola' : value === 'EN_PROCESO' ? 'En proceso' : value;
    return (
        <span className={`mma-phase ${value.toLowerCase().replaceAll('_', '-')}`}>
            {label}
            {fecha && value === 'OK' && <small>{fmtFecha(fecha)}</small>}
        </span>
    );
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

    const {
        cargas,
        cargaActual,
        procesando,
        config,
        crearCarga,
        procesarCarga,
        reintentarFallidos,
        pararCarga,
        marcarRevisado,
        marcarOk,
        descargarReporte,
        guardarConfig,
    } = useMigracionMasivaArchivo();

    useEffect(() => {
        if (config?.correo_destino && !correoModificado) {
            setCorreoDestino(config.correo_destino);
        }
    }, [config, correoModificado]);

    const carga = cargaActual || cargas[0] || null;
    const documentos = carga?.archivos || [];
    const logs = carga?.logs || [];

    const seleccionResumen = useMemo(() => {
        if (!archivos.length) return '';
        const primeraCarpeta = archivos[0]?.webkitRelativePath?.split('/')?.[0];
        return primeraCarpeta || `${archivos.length} archivo(s) seleccionado(s)`;
    }, [archivos]);

    const totales = useMemo(() => {
        const total = carga?.total_archivos ?? documentos.length ?? archivos.length;
        const cargados = carga?.exitosos ?? documentos.filter(d => ['CARGADO_SAIA', 'PROCESADO'].includes(d.estado_proceso)).length;
        const errores = carga?.fallidos ?? documentos.filter(d => ['ERROR', 'ERROR_SAIA'].includes(d.estado_proceso)).length;
        const revision = carga?.pendientes_revision ?? documentos.filter(d => d.estado_proceso === 'REQUIERE_REVISION').length;
        return { total, cargados, errores, revision };
    }, [archivos.length, carga, documentos]);

    const progreso = useMemo(() => {
        const total = Math.max(totales.total, 1);
        const base = Math.round(((carga?.procesados || 0) / total) * 100);
        const finalizado = ESTADOS_FINALIZADOS.includes(carga?.estado_proceso);
        const f1 = totales.total > 0 ? 100 : 0;
        const f2 = Math.max(base, documentos.length ? 100 : 0);
        const f3 = finalizado ? 100 : base;
        const f4 = finalizado ? 100 : base;
        const f5 = finalizado ? 100 : Math.min(base, 60);
        return [f1, f2, f3, f4, f5];
    }, [carga, documentos.length, totales.total]);

    const estadoUi = carga?.estado_proceso || (archivos.length ? 'PENDIENTE' : 'Inactivo');
    const estaActivo = ['PENDIENTE', 'EN_PROCESO'].includes(carga?.estado_proceso) || procesando;

    const handleSeleccionArchivos = (event) => {
        const seleccionados = Array.from(event.target.files || []);
        setArchivos(seleccionados);
    };

    const handleIniciar = async () => {
        if (!nombre.trim() || !archivos.length) return;
        const nuevaCarga = await crearCarga({
            nombre,
            descripcion: correoDestino ? `Correo destino: ${correoDestino}` : '',
            archivos,
        });
        if (!nuevaCarga) return;
        await procesarCarga(nuevaCarga.id, {
            cargar_saia: true,
            dry_run: false,
            headful: false,
            enviar_correo: !!correoDestino,
            destinatario: correoDestino,
        });
    };

    const handleGuardarCorreo = async () => {
        setGuardandoCorreo(true);
        const res = await guardarConfig(correoDestino);
        setGuardandoCorreo(false);
        if (res) setCorreoModificado(false);
    };

    const documentosPendientesRevision = documentos.filter(d => d.estado_proceso === 'REQUIERE_REVISION');
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

                <div className="mma-toolbar-spacer" />

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
                {[
                    'F1 · Inventario',
                    'F2 · OCR / Metadata',
                    'F3 · Relaciones',
                    'F4 · Validación',
                    'F5 · Carga SAIA',
                ].map((fase, index) => (
                    <div key={fase} className="mma-progress">
                        <div>{fase}</div>
                        <span><i style={{ width: `${progreso[index]}%` }} /></span>
                        <small>{progreso[index]}%</small>
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
                    {carga && (
                        <button className="mma-download-tab" onClick={() => descargarReporte(carga.id)}>
                            <FiDownload size={13} /> Reporte
                        </button>
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
                                            <button className="mma-btn primary" style={{ height: 26, padding: '0 8px', fontSize: 11, marginLeft: 6 }} onClick={() => marcarRevisado(carga.id, doc.id)}>
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
                                    const [f1, f2, f3, f4, saia, estado] = faseDesdeEstado(doc.estado_proceso);
                                    return (
                                        <tr key={doc.id} onClick={() => documentos.length && setDetalleDoc(doc)} style={{ cursor: documentos.length ? 'pointer' : 'default' }}>
                                            <td>{doc.nombre_original}</td>
                                            <td><FaseBadge value={f1} /></td>
                                            <td><FaseBadge value={f2} /></td>
                                            <td><FaseBadge value={f3} /></td>
                                            <td><FaseBadge value={f4} /></td>
                                            <td><FaseBadge value={saia} fecha={doc.modificado || doc.creado} /></td>
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
                        {['REQUIERE_REVISION', 'ERROR_SAIA'].includes(detalleDoc.estado_proceso) && carga && (
                            <button
                                className="mma-btn primary"
                                onClick={() => { marcarOk(carga.id, detalleDoc.id); setDetalleDoc(null); }}
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
