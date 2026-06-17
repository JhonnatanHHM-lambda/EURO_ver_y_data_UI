import { useState } from 'react';
import { FiRefreshCw, FiXCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import Modal from '../../core/Modal/components/Modal';

const ModalDecision = ({ contrato, onClose, onConfirmar }) => {
    const [enviando, setEnviando] = useState(false);

    const handleDecidir = async (tipo) => {
        const esPrrroga = tipo === 'prorrogar';
        const { isConfirmed } = await Swal.fire({
            icon: 'question',
            title: esPrrroga ? '¿Confirmar decisión de prórroga?' : '¿Confirmar decisión de terminación?',
            html: esPrrroga
                ? `Se notificará a <strong>Gestión Humana</strong> para que defina las condiciones de la prórroga de <strong>${contrato.nombre_completo}</strong>.`
                : `Se notificará a <strong>Gestión Humana</strong> para que gestione la terminación de <strong>${contrato.nombre_completo}</strong>.`,
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: esPrrroga ? '#6366f1' : '#ef4444',
        });
        if (!isConfirmed) return;

        setEnviando(true);
        try {
            await onConfirmar(tipo);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Decisión del director" size="sm">
            <p style={{ fontSize: 12, color: 'var(--fg3)', margin: '-8px 0 22px' }}>
                {contrato.nombre_completo} · {contrato.tipo_documento} {contrato.documento_id}
            </p>

            <p style={{ fontSize: 13, color: 'var(--fg2)', marginBottom: 20, lineHeight: 1.5 }}>
                Selecciona la acción para este contrato. Gestión Humana recibirá una notificación para
                definir los detalles y subir los documentos correspondientes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                    className="vyd-btn-sm"
                    onClick={() => handleDecidir('prorrogar')}
                    disabled={enviando}
                    style={{ justifyContent: 'center', padding: '12px', gap: 8, fontSize: 14, background: '#6366f1' }}
                >
                    <FiRefreshCw size={15} />
                    Prorrogar contrato
                </button>
                <button
                    className="vyd-btn-sm"
                    onClick={() => handleDecidir('terminar')}
                    disabled={enviando}
                    style={{ justifyContent: 'center', padding: '12px', gap: 8, fontSize: 14, background: '#ef4444' }}
                >
                    <FiXCircle size={15} />
                    Terminar contrato
                </button>
            </div>

            <div className="vyd-modal-actions" style={{ marginTop: 24 }}>
                <button className="vyd-btn-sm ghost" onClick={onClose} disabled={enviando}>Cancelar</button>
            </div>
        </Modal>
    );
};

export default ModalDecision;
