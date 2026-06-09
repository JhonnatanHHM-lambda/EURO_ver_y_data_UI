import { FiX } from 'react-icons/fi';
import '../utils/Modal.scss';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;
    return (
        <div className="vyd-modal-backdrop" onClick={onClose}>
            <div className={`vyd-modal-content vyd-modal-${size}`} onClick={(e) => e.stopPropagation()}>
                <div className="vyd-modal-header">
                    <h2>{title}</h2>
                    <button className="vyd-modal-close" onClick={onClose}><FiX size={20} /></button>
                </div>
                <div className="vyd-modal-body">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
