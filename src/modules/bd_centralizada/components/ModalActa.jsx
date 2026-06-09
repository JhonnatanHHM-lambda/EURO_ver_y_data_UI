import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FiFileText, FiX, FiTrash2, FiDownload, FiCheck } from 'react-icons/fi';

const fmt = (d) => d ? new Date(d).toLocaleString('es-CO',
    { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

const ModalActa = ({ carga, nombre, setNombre, cargo, setCargo,
                     guardando, sigRef, yaFirmada, firmaImagen,
                     cerrarModal, limpiarFirma, firmarYDescargar, soloDescargar }) => {
    if (!carga) return null;

    return (
        <div className="acta-overlay" onClick={cerrarModal}>
            <div className="acta-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="acta-modal-head">
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <FiFileText size={18} />
                        <span>Acta de Carga — <b>{carga.origen_datos}</b></span>
                    </div>
                    <button className="acta-modal-close" onClick={cerrarModal}><FiX size={16} /></button>
                </div>

                <div className="acta-modal-body">
                    {/* Resumen de la carga */}
                    <div className="acta-info-grid">
                        {[
                            ['Archivo', carga.nombre_archivo],
                            ['Hoja',    carga.hoja || '—'],
                            ['Origen',  carga.origen_datos],
                            ['Sede',    carga.sede_nombre || 'Sin sede'],
                            ['Cargado', fmt(carga.creado)],
                            ['Cargado por', carga.cargado_por_nombre || '—'],
                        ].map(([k,v]) => (
                            <div key={k} className="acta-info-item">
                                <span className="acta-info-lbl">{k}</span>
                                <span className="acta-info-val">{v}</span>
                            </div>
                        ))}
                    </div>

                    {/* KPIs */}
                    <div className="acta-kpis">
                        {[
                            { label:'Total', val: carga.total_registros, color:'#6366f1' },
                            { label:'Exitosos', val: carga.exitosos, color:'#22c55e' },
                            { label:'Con error', val: carga.fallidos, color: carga.fallidos > 0 ? '#ef4444' : '#94a3b8' },
                        ].map(k => (
                            <div key={k.label} className="acta-kpi">
                                <span className="acta-kpi-num" style={{ color: k.color }}>{k.val}</span>
                                <span className="acta-kpi-lbl">{k.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="acta-divider" />

                    {/* Si ya está firmada, mostrar info */}
                    {yaFirmada && (
                        <div className="acta-ya-firmada">
                            <FiCheck size={14} color="#22c55e" />
                            <span>
                                Firmada por <b>{carga.firma_gh_nombre}</b>
                                {carga.firma_gh_cargo && ` · ${carga.firma_gh_cargo}`}
                                {carga.firma_gh_fecha && ` · ${fmt(carga.firma_gh_fecha)}`}
                            </span>
                        </div>
                    )}

                    {/* Datos del firmante */}
                    <div className="acta-section-title">
                        {yaFirmada ? 'Actualizar firmante' : 'Datos del firmante (Gestión Humana)'}
                    </div>
                    <div className="acta-firmante-grid">
                        <div>
                            <label className="acta-field-lbl">Nombre completo *</label>
                            <input
                                className="acta-input"
                                placeholder="Ej: Carolina Hernández"
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="acta-field-lbl">Cargo</label>
                            <input
                                className="acta-input"
                                placeholder="Ej: Coordinadora GH"
                                value={cargo}
                                onChange={e => setCargo(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Canvas de firma — solo editable si NO está firmada */}
                    <div className="acta-section-title">
                        Firma digital{yaFirmada ? ' — solo lectura' : ' — dibuja tu firma en el recuadro'}
                    </div>

                    {yaFirmada ? (
                        /* Modo solo lectura: imagen de la firma guardada */
                        <div className="acta-canvas-wrap acta-canvas-readonly">
                            {firmaImagen ? (
                                <img
                                    src={firmaImagen}
                                    alt="Firma guardada"
                                    style={{ maxHeight: 120, maxWidth: '100%',
                                             display: 'block', margin: '8px auto' }}
                                />
                            ) : (
                                <div style={{ padding: '24px 0', textAlign: 'center',
                                              color: 'var(--fg4)', fontSize: 12 }}>
                                    Firma guardada · no disponible para vista previa
                                </div>
                            )}
                            <div className="acta-readonly-badge">
                                <FiCheck size={11} /> Firma registrada — no editable
                            </div>
                        </div>
                    ) : (
                        /* Modo edición */
                        <div className="acta-canvas-wrap">
                            <SignatureCanvas
                                ref={sigRef}
                                penColor="#1e293b"
                                canvasProps={{ className: 'acta-canvas' }}
                            />
                            <button className="acta-limpiar" onClick={limpiarFirma} title="Limpiar firma">
                                <FiTrash2 size={13} /> Limpiar
                            </button>
                        </div>
                    )}

                    {/* Nota Lambda */}
                    <div className="acta-nota-lambda">
                        La firma de <b>Lambda Analytics SAS</b> se incluye automáticamente
                        como certificadora técnica del proceso de homologación.
                    </div>
                </div>

                {/* Footer con acciones */}
                <div className="acta-modal-footer">
                    <div style={{ display:'flex', gap:8 }}>
                        {yaFirmada ? (
                            /* Ya firmada → solo descarga */
                            <>
                                <button className="vyd-btn-sm"
                                    onClick={() => soloDescargar('pdf')}
                                    disabled={guardando}
                                    style={{ gap:7, display:'flex', alignItems:'center' }}>
                                    <FiDownload size={13} />
                                    {guardando ? 'Generando...' : 'Descargar PDF'}
                                </button>
                                <button className="vyd-btn-sm"
                                    onClick={() => soloDescargar('docx')}
                                    disabled={guardando}
                                    style={{ background:'var(--surface2)', color:'var(--fg1)',
                                             border:'1px solid var(--border2)', gap:7,
                                             display:'flex', alignItems:'center' }}>
                                    <FiDownload size={13} /> Word
                                </button>
                            </>
                        ) : (
                            /* No firmada → firmar + descargar */
                            <>
                                <button className="vyd-btn-sm"
                                    onClick={() => firmarYDescargar('pdf')}
                                    disabled={guardando}
                                    style={{ gap:7, display:'flex', alignItems:'center' }}>
                                    <FiDownload size={13} />
                                    {guardando ? 'Generando...' : 'Firmar y descargar PDF'}
                                </button>
                                <button className="vyd-btn-sm"
                                    onClick={() => firmarYDescargar('docx')}
                                    disabled={guardando}
                                    style={{ background:'var(--surface2)', color:'var(--fg1)',
                                             border:'1px solid var(--border2)', gap:7,
                                             display:'flex', alignItems:'center' }}>
                                    <FiDownload size={13} /> Word
                                </button>
                            </>
                        )}
                    </div>

                    <button className="vyd-btn-sm ghost" onClick={cerrarModal}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export default ModalActa;
