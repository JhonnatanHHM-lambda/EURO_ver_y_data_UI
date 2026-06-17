import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import Swal from 'sweetalert2';

const PAGE_SIZE = 20;

export const ESTADOS = [
    'PENDIENTE_FIRMA_NO_PRORROGA',
    'PENDIENTE_DECISION_DIRECTOR',
    'PENDIENTE_CONDICIONES_GH',
    'PENDIENTE_NOTIFICACION_EMPLEADO',
    'PENDIENTE_FIRMA_PRORROGA',
    'PENDIENTE_FIRMA_TERMINACION',
    'FIRMADO',
    'SIN_CANAL_CONTACTO',
    'ERROR_NOTIFICACION',
];

export const ESTADOS_LABEL = {
    PENDIENTE_FIRMA_NO_PRORROGA:      'Pendiente firma',
    PENDIENTE_DECISION_DIRECTOR:      'Pendiente director',
    PENDIENTE_CONDICIONES_GH:         'Pendiente GH',
    PENDIENTE_NOTIFICACION_EMPLEADO:  'Listo para notificar',
    PENDIENTE_FIRMA_PRORROGA:         'Pend. firma prórroga',
    PENDIENTE_FIRMA_TERMINACION:      'Pend. firma terminación',
    FIRMADO:                          'Firmado',
    SIN_CANAL_CONTACTO:               'Sin canal de contacto',
    ERROR_NOTIFICACION:               'Error de notificación',
};

export const ESTADO_COLORS = {
    PENDIENTE_FIRMA_NO_PRORROGA:      { bg: 'rgba(245,158,11,.12)',  color: '#b45309', dot: '#f59e0b' },
    PENDIENTE_DECISION_DIRECTOR:      { bg: 'rgba(99,102,241,.12)',  color: '#4338ca', dot: '#6366f1' },
    PENDIENTE_CONDICIONES_GH:         { bg: 'rgba(14,165,233,.12)',  color: '#0369a1', dot: '#0ea5e9' },
    PENDIENTE_NOTIFICACION_EMPLEADO:  { bg: 'rgba(168,85,247,.12)',  color: '#7e22ce', dot: '#a855f7' },
    PENDIENTE_FIRMA_PRORROGA:         { bg: 'rgba(139,92,246,.12)',  color: '#7c3aed', dot: '#8b5cf6' },
    PENDIENTE_FIRMA_TERMINACION:      { bg: 'rgba(239,68,68,.12)',   color: '#b91c1c', dot: '#ef4444' },
    FIRMADO:                          { bg: 'rgba(34,197,94,.12)',   color: '#16a34a', dot: '#22c55e' },
    SIN_CANAL_CONTACTO:               { bg: 'rgba(100,116,139,.15)', color: '#64748b', dot: '#94a3b8' },
    ERROR_NOTIFICACION:               { bg: 'rgba(239,68,68,.12)',   color: '#b91c1c', dot: '#ef4444' },
};

export const TIPO_CARTA_LABEL = {
    NO_PRORROGA:  'No prórroga',
    PRORROGA:     'Prórroga',
    TERMINACION:  'Terminación',
};

const useContratos = () => {
    const [contratos,      setContratos]      = useState([]);
    const [total,          setTotal]          = useState(0);
    const [resumen,        setResumen]        = useState(null);
    const [loading,        setLoading]        = useState(false);
    const [loadingResumen, setLoadingResumen] = useState(false);
    const [page,           setPage]           = useState(1);
    const [filtros,        setFiltros]        = useState({ search: '', estado: '' });
    const [filtrosTemp,    setFiltrosTemp]    = useState({ search: '', estado: '' });

    const cargarContratos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ activos: 'true', page });
            if (filtros.search) params.set('search', filtros.search);
            if (filtros.estado) params.set('estado', filtros.estado);
            const res = await api.get(`contratos/?${params}`);
            setContratos(res.data.results ?? res.data);
            setTotal(res.data.count ?? (Array.isArray(res.data) ? res.data.length : 0));
        } catch (e) {
            console.error('Error cargando contratos:', e);
        } finally {
            setLoading(false);
        }
    }, [page, filtros]);

    const cargarResumen = useCallback(async () => {
        setLoadingResumen(true);
        try {
            const res = await api.get('contratos/resumen/');
            setResumen(res.data);
        } catch (e) {
            console.error('Error cargando resumen:', e);
        } finally {
            setLoadingResumen(false);
        }
    }, []);

    // Recarga la lista cuando cambia página o filtros
    useEffect(() => { cargarContratos(); }, [cargarContratos]);
    // Resumen solo al montar
    useEffect(() => { cargarResumen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const aplicarFiltros = () => { setFiltros({ ...filtrosTemp }); setPage(1); };
    const limpiarFiltros = () => {
        const l = { search: '', estado: '' };
        setFiltros(l); setFiltrosTemp(l); setPage(1);
    };
    const hayFiltrosActivos = !!(filtros.search || filtros.estado);

    const prorrogar = useCallback(async (pk) => {
        try {
            await api.post(`contratos/${pk}/prorrogar/`);
            cargarContratos(); cargarResumen();
            return true;
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.error || 'No se pudo prorrogar el contrato.' });
            return false;
        }
    }, [cargarContratos, cargarResumen]);

    const terminar = useCallback(async (pk) => {
        try {
            await api.post(`contratos/${pk}/terminar/`);
            cargarContratos(); cargarResumen();
            return true;
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.error || 'No se pudo procesar la terminación.' });
            return false;
        }
    }, [cargarContratos, cargarResumen]);

    const condicionesGH = useCallback(async (pk, datos) => {
        try {
            if (datos instanceof FormData) {
                await api.post(`contratos/${pk}/condiciones/`, datos, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post(`contratos/${pk}/condiciones/`, datos);
            }
            cargarContratos(); cargarResumen();
            return true;
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.error || 'No se pudieron guardar las condiciones.' });
            return false;
        }
    }, [cargarContratos, cargarResumen]);

    const notificarEmpleado = useCallback(async (pk) => {
        try {
            await api.post(`contratos/${pk}/notificar-empleado/`);
            cargarContratos(); cargarResumen();
            return true;
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.error || 'No se pudo notificar al empleado.' });
            return false;
        }
    }, [cargarContratos, cargarResumen]);

    return {
        contratos, resumen, loading, loadingResumen,
        page, setPage, total, totalPages, PAGE_SIZE,
        filtros, filtrosTemp, setFiltrosTemp,
        aplicarFiltros, limpiarFiltros, hayFiltrosActivos,
        ESTADOS, ESTADOS_LABEL, ESTADO_COLORS, TIPO_CARTA_LABEL,
        prorrogar, terminar, condicionesGH, notificarEmpleado,
        recargar: () => { cargarContratos(); cargarResumen(); },
    };
};

export default useContratos;
