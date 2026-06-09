import { useState, useRef, useCallback } from 'react';
import swal from '../../../utils/swal';
import api  from '../../../services/api';

const useActaCarga = (onActualizar) => {
    const [open,         setOpen]         = useState(false);
    const [carga,        setCarga]        = useState(null);
    const [nombre,       setNombre]       = useState('');
    const [cargo,        setCargo]        = useState('');
    const [guardando,    setGuardando]    = useState(false);
    const [firmaImagen,  setFirmaImagen]  = useState('');  // imagen cargada para mostrar
    const sigRef = useRef(null);

    const abrirModal = useCallback(async (cargaItem) => {
        setCarga(cargaItem);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setNombre(cargaItem.firma_gh_nombre || user.nombre_completo || '');
        setCargo(cargaItem.firma_gh_cargo   || user.rol || '');
        setOpen(true);

        // Si ya tiene firma, cargarla en el canvas después de que se monte
        if (cargaItem.firma_gh_nombre) {
            try {
                const r = await api.get(`trazabilidad/cargas/${cargaItem.id}/firma-imagen/`);
                const imagen = r.data.firma_gh_imagen;
                if (imagen) {
                    setFirmaImagen(imagen);  // modo solo lectura — mostrar como <img>
                }
            } catch { /* sin imagen guardada */ }
        }
    }, [sigRef]);

    const cerrarModal = () => {
        setOpen(false);
        setCarga(null);
        setFirmaImagen('');
    };

    const limpiarFirma = () => sigRef.current?.clear();

    const firmarYDescargar = async (formato) => {
        if (!nombre.trim()) {
            swal({ icon: 'warning', title: 'Nombre requerido',
                   text: 'Debes ingresar tu nombre antes de firmar.' });
            return;
        }
        if (!sigRef.current || sigRef.current.isEmpty()) {
            swal({ icon: 'warning', title: 'Firma requerida',
                   text: 'Dibuja tu firma en el recuadro antes de continuar.' });
            return;
        }

        setGuardando(true);
        try {
            // 1. Guardar firma en BD
            const imagenBase64 = sigRef.current.toDataURL('image/png');
            await api.post(`trazabilidad/cargas/${carga.id}/firmar/`, {
                nombre,
                cargo,
                imagen: imagenBase64,
            });

            // 2. Descargar el acta
            const resp = await api.get(
                `trazabilidad/cargas/${carga.id}/acta/${formato}/`,
                { responseType: 'blob' },
            );

            const url      = URL.createObjectURL(resp.data);
            const fileName = `Acta_Carga_${carga.origen_datos}_${carga.id}.${formato}`;
            const a        = document.createElement('a');
            a.href     = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            swal({ icon: 'success', title: 'Acta generada',
                   text: `El acta fue firmada y descargada correctamente.`,
                   timer: 2500, showConfirmButton: false });

            cerrarModal();
            // Refrescar la lista de cargas para reflejar el nuevo estado "firmada"
            if (onActualizar) onActualizar();
        } catch (err) {
            swal({ icon: 'error', title: 'Error',
                   text: err.response?.data?.error || 'No se pudo generar el acta.' });
        } finally {
            setGuardando(false);
        }
    };

    const soloDescargar = async (formato) => {
        if (!carga) return;
        try {
            const resp = await api.get(
                `trazabilidad/cargas/${carga.id}/acta/${formato}/`,
                { responseType: 'blob' },
            );
            const url      = URL.createObjectURL(resp.data);
            const fileName = `Acta_Carga_${carga.origen_datos}_${carga.id}.${formato}`;
            const a        = document.createElement('a');
            a.href     = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            swal({ icon: 'error', title: 'Error', text: 'No se pudo descargar el acta.' });
        }
    };

    const yaFirmada = carga?.firma_gh_nombre?.trim().length > 0;

    return {
        open, carga, nombre, setNombre, cargo, setCargo,
        guardando, sigRef, yaFirmada, firmaImagen,
        abrirModal, cerrarModal, limpiarFirma,
        firmarYDescargar, soloDescargar,
    };
};

export default useActaCarga;
