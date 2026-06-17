import { useState, useRef } from 'react';
import { FiUpload, FiFile, FiTrash2 } from 'react-icons/fi';
import Swal from 'sweetalert2';
import Modal from '../../core/Modal/components/Modal';

const DURACIONES = [
    { value: '3_MESES',  label: '3 meses' },
    { value: '6_MESES',  label: '6 meses' },
    { value: '12_MESES', label: '12 meses' },
];

const ModalCondicionesGH = ({ contrato, onClose, onConfirmar }) => {
    const esPrrroga = contrato.tipo_carta === 'PRORROGA';

    // Prórroga
    const [duracion, setDuracion]            = useState('3_MESES');
    const [mantenerCond, setMantenerCond]    = useState(true);
    const [nuevoSueldo, setNuevoSueldo]      = useState('');

    // Terminación
    const [archivos, setArchivos]            = useState([]);
    const fileRef = useRef(null);

    const [enviando, setEnviando]            = useState(false);

    const agregarArchivos = (files) => {
        const nuevos = Array.from(files).filter(f => !archivos.find(a => a.name === f.name));
        setArchivos(prev => [...prev, ...nuevos]);
    };
    const quitarArchivo = (name) => setArchivos(prev => prev.filter(a => a.name !== name));
    const handleDrop = (e) => { e.preventDefault(); agregarArchivos(e.dataTransfer.files); };

    const handleConfirmar = async () => {
        if (!esPrrroga && archivos.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Documentos requeridos', text: 'Debes adjuntar al menos un documento para la terminación.' });
            return;
        }

        const { isConfirmed } = await Swal.fire({
            icon: 'question',
            title: esPrrroga ? '¿Confirmar condiciones de prórroga?' : '¿Confirmar condiciones de terminación?',
            html: esPrrroga
                ? `Se notificará al director que las condiciones de <strong>${DURACIONES.find(d => d.value === duracion)?.label}</strong> están listas para <strong>${contrato.nombre_completo}</strong>.`
                : `Se notificará al director que los documentos de terminación para <strong>${contrato.nombre_completo}</strong> están listos.`,
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: esPrrroga ? '#6366f1' : '#ef4444',
        });
        if (!isConfirmed) return;

        setEnviando(true);
        try {
            if (esPrrroga) {
                await onConfirmar({
                    duracion_prorroga: duracion,
                    mantener_condiciones: mantenerCond,
                    ...(nuevoSueldo && !mantenerCond ? { nuevo_sueldo: parseFloat(nuevoSueldo) } : {}),
                });
            } else {
                const fd = new FormData();
                archivos.forEach(f => fd.append('documentos', f));
                await onConfirmar(fd);
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title={esPrrroga ? 'Definir condiciones de prórroga' : 'Definir condiciones de terminación'} size="md">
            <p style={{ fontSize: 12, color: 'var(--fg3)', margin: '-8px 0 18px' }}>
                {contrato.nombre_completo} · {contrato.tipo_documento} {contrato.documento_id}
            </p>

            {esPrrroga ? (
                <div className="ctr-decision-form">
                    <div className="vyd-form-group">
                        <label>Duración de la prórroga</label>
                        <div className="ctr-radio-group">
                            {DURACIONES.map(d => (
                                <label key={d.value} className={`ctr-radio-opt${duracion === d.value ? ' selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="duracion"
                                        value={d.value}
                                        checked={duracion === d.value}
                                        onChange={() => setDuracion(d.value)}
                                    />
                                    {d.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="vyd-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <input
                            type="checkbox"
                            id="mantener-gh"
                            checked={mantenerCond}
                            onChange={e => setMantenerCond(e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <label htmlFor="mantener-gh" style={{ cursor: 'pointer', userSelect: 'none', fontSize: 13, color: 'var(--fg2)', textTransform: 'none', letterSpacing: 0 }}>
                            Mantener condiciones salariales actuales
                        </label>
                    </div>

                    {!mantenerCond && (
                        <div className="vyd-form-group">
                            <label>Nuevo sueldo (COP)</label>
                            <input
                                type="number"
                                placeholder="Ej: 1300000"
                                value={nuevoSueldo}
                                onChange={e => setNuevoSueldo(e.target.value)}
                                min="0"
                                step="50000"
                                className="ctr-input"
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="ctr-decision-form">
                    <p style={{ fontSize: 12.5, color: 'var(--fg3)', margin: '0 0 14px', lineHeight: 1.5 }}>
                        Adjunta los documentos de soporte para la terminación. El director recibirá aviso cuando estén listos.
                    </p>

                    <div className="vyd-form-group">
                        <label>Documentos de soporte <span style={{ color: '#ef4444' }}>*</span></label>
                        <div
                            className="ctr-dropzone"
                            onClick={() => fileRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                        >
                            <FiUpload size={20} style={{ color: 'var(--fg4)', marginBottom: 6 }} />
                            <span style={{ fontSize: 13, color: 'var(--fg3)' }}>
                                Arrastra archivos aquí o <strong style={{ color: 'var(--accent)' }}>haz clic para seleccionar</strong>
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--fg4)', marginTop: 4 }}>PDF, DOCX, JPG, PNG — máx. 10 MB c/u</span>
                            <input
                                ref={fileRef}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                style={{ display: 'none' }}
                                onChange={e => agregarArchivos(e.target.files)}
                            />
                        </div>

                        {archivos.length > 0 && (
                            <div className="ctr-files-list">
                                {archivos.map(f => (
                                    <div key={f.name} className="ctr-file-item">
                                        <FiFile size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                        <span style={{ fontSize: 11, color: 'var(--fg4)', flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                                        <button
                                            className="ctr-file-remove"
                                            onClick={e => { e.stopPropagation(); quitarArchivo(f.name); }}
                                        >
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="vyd-modal-actions">
                <button className="vyd-btn-sm ghost" onClick={onClose} disabled={enviando}>Cancelar</button>
                <button
                    className="vyd-btn-sm"
                    onClick={handleConfirmar}
                    disabled={enviando || (!esPrrroga && archivos.length === 0)}
                    style={esPrrroga ? { background: '#6366f1' } : { background: archivos.length > 0 ? '#ef4444' : undefined, opacity: archivos.length === 0 ? 0.5 : 1 }}
                >
                    {enviando ? 'Guardando...' : esPrrroga ? 'Confirmar condiciones' : 'Confirmar documentos'}
                </button>
            </div>
        </Modal>
    );
};

export default ModalCondicionesGH;
