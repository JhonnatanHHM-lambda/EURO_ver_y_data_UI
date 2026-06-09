import { useState, useEffect, useCallback } from 'react';
import swal from '../../../utils/swal';
import api from '../../../services/api';
import { useSede } from '../../../context/SedeContext';

const PAGE_SIZE = 20;

const ORIGENES = ['COOPISER','EXELA','JG EFECTIVOS','TEMPORAL BARRANQUILLA','EURO ANTIGUA','APRENDICES','ENTREVISTAS','EXTRAS','JIRO','COMPLEMENTOS HUMANOS','TIEMPOS','TIME JOBS','INGRESOS 2024','INGRESOS 2025'];
const ESTADOS  = ['REGISTRADO','HABILITADO','INHABILITADO','VERIFICACION_PARCIAL','REVISION_MANUAL_AUTORIZADA','REVISION_MANUAL_RECHAZADA'];
const PROCESOS = ['SELECCIONADO','EMPLEADO','APRENDIZ','PASANTE','RETIRADO','CANDIDATO','ENTREVISTADO'];

const useTrazabilidad = () => {
    const { sedeActiva } = useSede();

    const [empleados,    setEmpleados]    = useState([]);
    const [kpis,         setKpis]         = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [loadingKpis,  setLoadingKpis]  = useState(true);
    const [page,         setPage]         = useState(1);
    const [totalPages,   setTotalPages]   = useState(1);
    const [total,        setTotal]        = useState(0);

    const [filtros, setFiltros] = useState({
        search:       '',
        origen_datos: '',
        estado:       '',
        tipo_proceso: '',
    });
    const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

    const cargarEmpleados = useCallback(async (pageNum, filtrosActivos, sedeId) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pageNum, page_size: PAGE_SIZE });
            if (sedeId)                        params.set('sede',   sedeId);
            if (filtrosActivos.search)         params.set('search', filtrosActivos.search);
            if (filtrosActivos.origen_datos)   params.set('origen', filtrosActivos.origen_datos);
            if (filtrosActivos.estado)         params.set('estado', filtrosActivos.estado);
            if (filtrosActivos.tipo_proceso)   params.set('tipo_proceso', filtrosActivos.tipo_proceso);

            const r = await api.get(`trazabilidad/empleados/?${params}`);
            setEmpleados(r.data.results);
            setTotal(r.data.total);
            setTotalPages(r.data.total_pages);
        } catch (err) {
            if (err.response?.status !== 403) {
                swal({ title: 'Error', text: 'No se pudieron cargar los empleados.', icon: 'error' });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const cargarKpis = useCallback(async (sedeId) => {
        setLoadingKpis(true);
        try {
            const params = sedeId ? `?sede=${sedeId}` : '';
            const r = await api.get(`trazabilidad/kpis/${params}`);
            setKpis(r.data);
        } catch { /* silent */ } finally {
            setLoadingKpis(false);
        }
    }, []);

    // Recarga cuando cambia la sede activa
    useEffect(() => {
        setPage(1);
        cargarEmpleados(1, filtros, sedeActiva?.id);
        cargarKpis(sedeActiva?.id);
    }, [sedeActiva?.id]);

    const aplicarFiltros = () => {
        setFiltros({ ...filtrosTemp });
        setPage(1);
        cargarEmpleados(1, filtrosTemp, sedeActiva?.id);
    };

    const limpiarFiltros = () => {
        const vacios = { search: '', origen_datos: '', estado: '', tipo_proceso: '' };
        setFiltros(vacios);
        setFiltrosTemp(vacios);
        setPage(1);
        cargarEmpleados(1, vacios, sedeActiva?.id);
    };

    const irAPagina = (n) => {
        if (n < 1 || n > totalPages) return;
        setPage(n);
        cargarEmpleados(n, filtros, sedeActiva?.id);
    };

    const hayFiltrosActivos = Object.values(filtros).some(Boolean);

    return {
        empleados, kpis, loading, loadingKpis,
        page, totalPages, total, PAGE_SIZE,
        filtros, filtrosTemp, setFiltrosTemp,
        ORIGENES, ESTADOS, PROCESOS,
        aplicarFiltros, limpiarFiltros, irAPagina,
        hayFiltrosActivos, sedeActiva,
    };
};

export default useTrazabilidad;
