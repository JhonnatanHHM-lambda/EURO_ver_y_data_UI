import { useState, useRef } from 'react';
import { FiX, FiUpload, FiFile, FiTrash2 } from 'react-icons/fi';
import Swal from 'sweetalert2';

const DURACIONES = [
    { value: '3_MESES',  label: '3 meses' },
    { value: '6_MESES',  label: '6 meses' },
    { value: '12_MESES', label: '12 meses' },
];

const ModalDecision = ({ contrato, onClose, onConfirmar }) => {
    const [tipo, setTipo]                       = useState('prorrogar');
    const [duracion, setDuracion]               = useState('3_MESES');
    const [mantenerCondiciones, setMantenerCond] = useState(true);
    const [nuevoSueldo, setNuevoSueldo]         = useState('');
    const [archivos, setArchivos]               = useState([]);
    const [enviando, setEnviando]               = useState(false);
    const fileRef = useRef(null);

    const agregarArchivos = (files) => {
        const nuevos = Array.from(files).filter(f => !archivos.find(a => a.name === f.name));
        setArchivos(prev => [...prev, ...nuevos]);
    };

    const quitarArchivo = (name) => setArchivos(prev => prev.filter(a => a.name !== name));

    const handleDrop = (e) => {
        e.preventDefault();
        agregarArchivos(e.dataTransfer.files);
    };

    const handleConfirmar = async () => {
        if (tipo === 'terminar' && archivos.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Documentos requeridos', text: 'Debes adjuntar al menos un documento para la terminación.' });
            return;
        }

        const confirmado = await Swal.fire({
            icon: 'question',
            title: tipo === 'prorrogar' ? '¿Confirmar prórroga?' : '¿Confirmar terminación?',
            text: tipo === 'prorrogar'
                ? `Se enviará una carta de prórroga por ${DURACIONES.find(d => d.value === duracion)?.label} al empleado ${contrato.nombre_completo}.`
                : `Se enviará una carta de terminación al empleado ${contrato.nombre_completo}.`,
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: tipo === 'prorrogar' ? '#6366f1' : '#ef4444',
        });

        if (!confirmado.isConfirmed) return;

        setEnviando(true);
        try {
            if (tipo === 'prorrogar') {
                const datos = {
                    duracion,
                    mantener_condiciones: mantenerCondiciones,
                    ...(nuevoSueldo && !mantenerCondiciones ? { nuevo_sueldo: parseFloat(nuevoSueldo) } : {}),
                };
                await onConfirmar('prorrogar', datos);
            } else {
                const formData = new FormData();
                archivos.forEach(f => formData.append('documentos', f));
                await onConfirmar('terminar', formData);
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="vyd-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="vyd-modal ctr-modal-decision">
                {/* Header */}
                <div className="vyd-modal-header">
                    <div>
                        <h3 className="vyd-modal-title">Decisión del director</h3>
                        <p className="vyd-modal-sub">{contrato.nombre_completo} · {contrato.tipo_documento} {contrato.documento_id}</p>
                    </div>
                    <button className="vyd-modal-close" onClick={onClose} disabled={enviando}><FiX size={18} /></button>
                </div>

                <div className="vyd-modal-body">
                    {/* Selector tipo */}
                    <div className="ctr-decision-tabs">
                        <button
                            className={`ctr-decision-tab${tipo === 'prorrogar' ? ' active' : ''}`}
                            onClick={() => setTipo('prorrogar')}
                        >
                            Prorrogar contrato
                        </button>
                        <button
                            className={`ctr-decision-tab terminar${tipo === 'terminar' ? ' active' : ''}`}
                            onClick={() => setTipo('terminar')}
                        >
                            Terminar contrato
                        </button>
                    </div>

                    {/* Formulario prórroga */}
                    {tipo === 'prorrogar' && (
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
                                    id="mantener"
                                    checked={mantenerCondiciones}
                                    onChange={e => setMantenerCond(e.target.checked)}
                                    style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                                />
                                <label htmlFor="mantener" style={{ cursor: 'pointer', userSelect: 'none', fontSize: 13, color: 'var(--fg2)' }}>
                                    Mantener condiciones salariales actuales
                                </label>
                            </div>

                            {!mantenerCondiciones && (
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
                    )}

                    {/* Formulario terminación */}
                    {tipo === 'terminar' && (
                        <div className="ctr-decision-form">
                            <p style={{ fontSize: 12.5, color: 'var(--fg3)', margin: '0 0 14px', lineHeight: 1.5 }}>
                                La terminación requiere adjuntar los documentos de soporte. Se generará y enviará la carta al empleado.
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
                </div>

                {/* Footer */}
                <div className="vyd-modal-footer">
                    <button className="vyd-btn-sm ghost" onClick={onClose} disabled={enviando}>Cancelar</button>
                    <button
                        className="vyd-btn-sm"
                        onClick={handleConfirmar}
                        disabled={enviando || (tipo === 'terminar' && archivos.length === 0)}
                        style={tipo === 'terminar' ? { background: '#ef4444' } : {}}
                    >
                        {enviando ? 'Enviando...' : tipo === 'prorrogar' ? 'Confirmar prórroga' : 'Confirmar terminación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalDecision;
