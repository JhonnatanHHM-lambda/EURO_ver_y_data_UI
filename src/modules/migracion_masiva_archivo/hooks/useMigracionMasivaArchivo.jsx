import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import swal from '../../../utils/swal';

const ESTADOS_ACTIVOS = new Set(['PENDIENTE', 'EN_PROCESO']);

const apiErrorMessage = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || 'Error inesperado.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    return Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' | ') || 'Error inesperado.';
};

const mostrarError = (titulo, error) => {
    swal({ title: titulo, icon: 'error', text: apiErrorMessage(error) });
};

const useMigracionMasivaArchivo = () => {
    const [cargas, setCargas] = useState([]);
    const [cargaActual, setCargaActual] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [config, setConfig] = useState({ correo_destino: '' });
    const pollingRef = useRef(null);

    const detenerPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const cargarCargas = useCallback(async () => {
        setCargando(true);
        try {
            const res = await api.get('migracion-masiva-archivo/cargas/');
            const lista = res.data.results ?? res.data;
            setCargas(lista);
            setCargaActual(prev => {
                if (!prev) return prev;
                const actualizada = lista.find(c => c.id === prev.id);
                return actualizada ? { ...prev, ...actualizada } : prev;
            });
        } catch (e) {
            console.error('Error cargando cargas:', e);
        } finally {
            setCargando(false);
        }
    }, []);

    const cargarDetalle = useCallback(async (id) => {
        const res = await api.get(`migracion-masiva-archivo/cargas/${id}/`);
        setCargaActual(res.data);
        setCargas(prev => prev.map(c => (c.id === id ? { ...c, ...res.data } : c)));
        return res.data;
    }, []);

    const cargarDetalleErrorDocumento = useCallback(async (docId, fase = '') => {
        const params = fase ? { fase } : undefined;
        const res = await api.get(`migracion-masiva/documentos/${docId}/detalle-error/`, { params });
        return res.data;
    }, []);

    const iniciarPolling = useCallback((id) => {
        detenerPolling();
        pollingRef.current = setInterval(async () => {
            try {
                const detalle = await cargarDetalle(id);
                if (!ESTADOS_ACTIVOS.has(detalle.estado_proceso)) {
                    detenerPolling();
                    setProcesando(false);
                }
            } catch {
                detenerPolling();
                setProcesando(false);
            }
        }, 4000);
    }, [cargarDetalle, detenerPolling]);

    const crearCarga = useCallback(async ({ nombre, descripcion, archivos, archivosSecundarios }) => {
        const formData = new FormData();
        formData.append('nombre', nombre);
        if (descripcion) formData.append('descripcion', descripcion);
        archivos.forEach((archivo) => {
            formData.append('archivos', archivo);
            formData.append('rutas', archivo.webkitRelativePath || archivo.name);
        });
        (archivosSecundarios || []).forEach((archivo) => {
            formData.append('archivos_secundarios', archivo);
            formData.append('rutas_secundarias', archivo.webkitRelativePath || archivo.name);
        });
        try {
            const res = await api.post('migracion-masiva-archivo/cargas/', formData, {
                // No fijar Content-Type manualmente: axios/el navegador deben generar
                // "multipart/form-data; boundary=..." solos a partir del FormData. Si se
                // fuerza el valor sin boundary (como estaba antes), Django no puede
                // parsear el body y request.FILES llega vacío.
                headers: { 'Content-Type': undefined },
            });
            setCargaActual(res.data);
            setCargas(prev => [res.data, ...prev]);
            return res.data;
        } catch (e) {
            mostrarError('No fue posible crear la carga', e);
            return null;
        }
    }, []);

    const procesarCarga = useCallback(async (id, opciones = {}) => {
        setProcesando(true);
        try {
            await api.post(`migracion-masiva-archivo/cargas/${id}/procesar/`, opciones);
            await cargarDetalle(id);
            iniciarPolling(id);
            return true;
        } catch (e) {
            setProcesando(false);
            mostrarError('No fue posible iniciar el procesamiento', e);
            return false;
        }
    }, [cargarDetalle, iniciarPolling]);

    const reintentarFallidos = useCallback((id) => (
        procesarCarga(id, { cargar_saia: true, dry_run: false, incluir_errores: true })
    ), [procesarCarga]);

    const pararCarga = useCallback(async (id) => {
        try {
            await api.post(`migracion-masiva-archivo/cargas/${id}/parar/`);
            await cargarDetalle(id);
            return true;
        } catch (e) {
            mostrarError('No fue posible detener el proceso', e);
            return false;
        }
    }, [cargarDetalle]);

    const marcarRevisado = useCallback(async (id, docId) => {
        try {
            const res = await api.post(`migracion-masiva-archivo/cargas/${id}/documentos/${docId}/revisado/`);
            await cargarDetalle(id);
            return res.data;
        } catch (e) {
            mostrarError('No fue posible marcar el documento como revisado', e);
            return null;
        }
    }, [cargarDetalle]);

    const marcarOk = useCallback(async (id, docId) => {
        try {
            const res = await api.post(`migracion-masiva-archivo/cargas/${id}/documentos/${docId}/marcar-ok/`);
            await cargarDetalle(id);
            if (res.data?.advertencia) {
                swal({ title: 'Advertencia', icon: 'warning', text: res.data.advertencia });
            }
            return res.data;
        } catch (e) {
            mostrarError('No fue posible marcar el documento como OK', e);
            return null;
        }
    }, [cargarDetalle]);

    const descargarReporte = useCallback(async (id) => {
        try {
            const res = await api.get(`migracion-masiva-archivo/cargas/${id}/descargar/`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `migracion_masiva_archivo_${id}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            mostrarError('No fue posible descargar el reporte', e);
        }
    }, []);

    const reenviarReporte = useCallback(async (id, destinatarios, conDetalle = false) => {
        try {
            const res = await api.post(`migracion-masiva-archivo/cargas/${id}/reenviar-reporte/`, {
                destinatarios,
                con_detalle: conDetalle,
            });
            swal({ title: 'Reporte reenviado', icon: 'success', text: `Enviado a: ${res.data.destinatarios.join(', ')}` });
            return res.data;
        } catch (e) {
            mostrarError('No fue posible reenviar el reporte', e);
            return null;
        }
    }, []);

    const cargarConfig = useCallback(async () => {
        try {
            const res = await api.get('migracion-masiva-archivo/config/');
            setConfig(res.data);
            return res.data;
        } catch (e) {
            console.error('Error cargando configuración:', e);
            return null;
        }
    }, []);

    const guardarConfig = useCallback(async (correoDestino) => {
        try {
            const res = await api.post('migracion-masiva-archivo/config/', { correo_destino: correoDestino });
            setConfig(res.data);
            return res.data;
        } catch (e) {
            mostrarError('No fue posible guardar el correo destino', e);
            return null;
        }
    }, []);

    useEffect(() => {
        cargarCargas();
        cargarConfig();
        return () => detenerPolling();
    }, []);

    return {
        cargas,
        cargaActual,
        cargando,
        procesando,
        config,
        cargarCargas,
        cargarDetalle,
        cargarDetalleErrorDocumento,
        crearCarga,
        procesarCarga,
        reintentarFallidos,
        pararCarga,
        marcarRevisado,
        marcarOk,
        descargarReporte,
        reenviarReporte,
        cargarConfig,
        guardarConfig,
    };
};

export default useMigracionMasivaArchivo;
