import { useState, useEffect, useCallback } from 'react';
import swal from '../../../utils/swal';
import api from '../../../services/api';

const useBDCentralizada = () => {
    const [cargas, setCargas]       = useState([]);
    const [loading, setLoading]     = useState(true);
    const [expandida, setExpandida] = useState(null); // id de la carga expandida

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get('trazabilidad/historial/');
            setCargas(r.data);
        } catch (err) {
            if (err.response?.status !== 403) {
                swal({ title: 'Error', text: 'No se pudo cargar el historial.', icon: 'error' });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const toggleExpandida = (id) => setExpandida(prev => prev === id ? null : id);

    const revertir = async (carga) => {
        const r = await swal({
            icon: 'warning',
            title: 'Revertir carga',
            html: `Se eliminarán <strong>${carga.exitosos}</strong> registros cargados desde<br><strong>${carga.nombre_archivo}</strong>.<br><br>Esta acción no se puede deshacer.`,
            showCancelButton: true,
            confirmButtonText: 'Sí, revertir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });
        if (!r.isConfirmed) return;

        try {
            const res = await api.delete(`trazabilidad/historial/${carga.id}/revertir/`);
            swal({
                icon: 'success',
                title: 'Carga revertida',
                text: res.data.mensaje,
                timer: 3000, showConfirmButton: false,
            });
            cargar(); // recargar historial
        } catch (err) {
            swal({
                icon: 'error',
                title: 'Error al revertir',
                text: err.response?.data?.error || 'No se pudo revertir la carga.'
            });
        }
    };

    return { cargas, loading, expandida, toggleExpandida, revertir, cargar };
};

export default useBDCentralizada;
