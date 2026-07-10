import { useState } from 'react';
import { FiX, FiPlay, FiAlertCircle } from 'react-icons/fi';

const HOY = new Date().toISOString().split('T')[0];
const DEFAULT_DESDE = '2026-05-01';

const ModalEjecutar = ({ onEjecutar, onCerrar, ejecutando }) => {
    const [fechaDesde, setFechaDesde] = useState(DEFAULT_DESDE);
    const [fechaHasta, setFechaHasta] = useState(HOY);
    const [error, setError]           = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fechaDesde || !fechaHasta) {
            setError('Ambas fechas son obligatorias.');
            return;
        }
        if (fechaDesde >= fechaHasta) {
            setError('La fecha "Desde" debe ser anterior a la fecha "Hasta".');
            return;
        }
        setError('');
        try {
            await onEjecutar(fechaDesde, fechaHasta);
            onCerrar();
        } catch (err) {
            setError(
                err?.response?.data?.error ||
                'Error al iniciar la consolidación. Intenta de nuevo.'
            );
        }
    };

    return (
        <div className="vyd-drawer-overlay" onClick={onCerrar}>
            <div
                className="vyd-drawer"
                style={{ maxWidth: 460 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="vyd-drawer-head">
                    <div>
                        <div className="vyd-drawer-title">Nueva Consolidación</div>
                        <div className="vyd-drawer-sub">
                            Selecciona el rango de fechas a conciliar
                        </div>
                    </div>
                    <button className="vyd-btn-icon" onClick={onCerrar} title="Cerrar">
                        <FiX size={18} />
                    </button>
                </div>

                {/* Aviso */}
                <div style={{
                    background: 'rgba(245,158,11,.08)',
                    border: '1px solid rgba(245,158,11,.25)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    margin: '16px 0',
                    fontSize: 12,
                    color: '#92400e',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                }}>
                    <FiAlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                    Este proceso puede tardar entre 1 y 3 minutos mientras se autentica
                    en RADIAN y descarga los documentos.
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit}>
                    <div className="vyd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="vyd-form-group">
                            <label>Fecha desde</label>
                            <input
                                type="date"
                                value={fechaDesde}
                                max={fechaHasta}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                required
                            />
                        </div>
                        <div className="vyd-form-group">
                            <label>Fecha hasta</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                min={fechaDesde}
                                max={HOY}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="vyd-oc-error" style={{ marginTop: 8 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button
                            type="button"
                            className="vyd-btn-sm ghost"
                            onClick={onCerrar}
                            disabled={ejecutando}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="vyd-btn-sm"
                            disabled={ejecutando}
                        >
                            <FiPlay size={13} />
                            {ejecutando ? 'Iniciando...' : 'Ejecutar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalEjecutar;
