import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';

const useOptimizacionCorreos = () => {
    const [ejecuciones, setEjecuciones]         = useState([]);
    const [ejecucionActual, setEjecucionActual] = useState(null);
    const [resultados, setResultados]           = useState([]);
    const [filtroEstado, setFiltroEstado]       = useState('');
    const [cargando, setCargando]               = useState(false);
    const [ejecutando, setEjecutando]           = useState(false);
    const [totalResultados, setTotalResultados] = useState(0);
    const pollingInterval                       = useRef(null);

    const _detenerPolling = useCallback(() => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    }, []);

    const cargarEjecuciones = useCallback(async () => {
        setCargando(true);
        try {
            const res = await api.get('optimizacion-correos/ejecuciones/');
            const lista = res.data.results ?? res.data;
            setEjecuciones(lista);
            // Si la actual es la más reciente, sincronizarla
            if (ejecucionActual) {
                const actualizada = lista.find(e => e.id === ejecucionActual.id);
                if (actualizada) setEjecucionActual(actualizada);
            }
        } catch (e) {
            console.error('Error cargando ejecuciones:', e);
        } finally {
            setCargando(false);
        }
    }, [ejecucionActual]);

    const iniciarPolling = useCallback((ejecucionId) => {
        _detenerPolling();
        pollingInterval.current = setInterval(async () => {
            try {
                const res = await api.get(`optimizacion-correos/ejecuciones/${ejecucionId}/`);
                const ejec = res.data;
                setEjecucionActual(ejec);
                setEjecuciones(prev =>
                    prev.map(e => (e.id === ejecucionId ? ejec : e))
                );
                if (ejec.estado === 'COMPLETADA' || ejec.estado === 'ERROR') {
                    _detenerPolling();
                    setEjecutando(false);
                    if (ejec.estado === 'COMPLETADA') {
                        cargarResultados(ejecucionId, '');
                    }
                }
            } catch (e) {
                console.error('Error en polling:', e);
                _detenerPolling();
                setEjecutando(false);
            }
        }, 4000);
    }, [_detenerPolling]);

    const ejecutarConsolidacion = useCallback(async (fechaDesde, fechaHasta) => {
        setEjecutando(true);
        try {
            const res = await api.post('optimizacion-correos/ejecutar/', {
                fecha_desde: fechaDesde,
                fecha_hasta: fechaHasta,
            });
            const { ejecucion_id } = res.data;

            // Obtener el objeto completo y ponerlo en lista
            const detalle = await api.get(`optimizacion-correos/ejecuciones/${ejecucion_id}/`);
            setEjecucionActual(detalle.data);
            setEjecuciones(prev => [detalle.data, ...prev]);
            setResultados([]);

            iniciarPolling(ejecucion_id);
            return ejecucion_id;
        } catch (e) {
            console.error('Error ejecutando consolidación:', e);
            setEjecutando(false);
            throw e;
        }
    }, [iniciarPolling]);

    const cargarResultados = useCallback(async (ejecucionId, estado = '') => {
        setCargando(true);
        try {
            const params = estado ? `?estado=${estado}&page_size=200` : '?page_size=200';
            const res = await api.get(`optimizacion-correos/ejecuciones/${ejecucionId}/resultados/${params}`);
            setResultados(res.data.results ?? res.data);
            setTotalResultados(res.data.count ?? (res.data.results ?? res.data).length);
            setFiltroEstado(estado);
        } catch (e) {
            console.error('Error cargando resultados:', e);
        } finally {
            setCargando(false);
        }
    }, []);

    const seleccionarEjecucion = useCallback(async (ejecucion) => {
        setEjecucionActual(ejecucion);
        setResultados([]);
        setFiltroEstado('');
        if (ejecucion.estado === 'COMPLETADA') {
            await cargarResultados(ejecucion.id, '');
        }
        if (ejecucion.estado === 'PENDIENTE' || ejecucion.estado === 'EN_PROCESO') {
            setEjecutando(true);
            iniciarPolling(ejecucion.id);
        }
    }, [cargarResultados, iniciarPolling]);

    const exportarExcel = useCallback(async (ejecucionId) => {
        try {
            const res = await api.get(
                `optimizacion-correos/ejecuciones/${ejecucionId}/exportar/`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const ejecucion = ejecuciones.find(e => e.id === ejecucionId) || ejecucionActual;
            link.download = `conciliacion_${ejecucion?.fecha_desde || ''}_${ejecucion?.fecha_hasta || ''}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Error exportando Excel:', e);
            throw e;
        }
    }, [ejecuciones, ejecucionActual]);

    useEffect(() => {
        cargarEjecuciones();
        return () => _detenerPolling();
    }, []);

    return {
        ejecuciones,
        ejecucionActual,
        resultados,
        filtroEstado,
        cargando,
        ejecutando,
        totalResultados,
        cargarEjecuciones,
        ejecutarConsolidacion,
        cargarResultados,
        seleccionarEjecucion,
        exportarExcel,
    };
};

export default useOptimizacionCorreos;
