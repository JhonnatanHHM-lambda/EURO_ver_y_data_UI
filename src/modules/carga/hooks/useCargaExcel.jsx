import { useState, useEffect, useRef, useCallback } from 'react';
import swal, { swalColors } from '../../../utils/swal';
import api from '../../../services/api';

// Pasos: 0=Archivo 1=Mapeo 2=Sedes 3=Confirmar 4=Resultado
const PASOS = ['Archivo', 'Mapeo', 'Sedes', 'Confirmar'];

// Fallback estático — se reemplaza con los datos del API al montar
const ORIGENES_FALLBACK = [
    'COOPISER', 'EXELA', 'JG EFECTIVOS', 'EURO ANTIGUA',
    'TEMPORAL BARRANQUILLA', 'COMPLEMENTOS HUMANOS', 'TIEMPOS', 'TIME JOBS',
    'APRENDICES', 'ENTREVISTAS', 'EXTRAS', 'JIRO', 'PERSONAL RETIRADO',
    'INGRESOS', 'DOTACION', 'OTRO',
];

const useCargaExcel = () => {
    const [paso, setPaso]                 = useState(0);
    const [sedes, setSedes]               = useState([]);
    const [ORIGENES, setOrigenes]         = useState(ORIGENES_FALLBACK);
    const [origenDatos, setOrigenDatos]   = useState('');
    const [origenPersonalizado, setOrigenPersonalizado] = useState('');
    const [archivo, setArchivo]           = useState(null);
    const [sheetName, setSheetName]       = useState('');
    const [isDragging, setIsDragging]     = useState(false);
    const [preview, setPreview]           = useState(null);
    const [mapeo, setMapeo]               = useState({});
    const [cargando, setCargando]         = useState(false);
    const [resultado, setResultado]       = useState(null);
    // Resolución de sedes
    const [skipRows,             setSkipRows]             = useState(0);   // filas a saltear antes del header
    const [todasLasHojas,        setTodasLasHojas]        = useState(false); // cargar todas las hojas
    const [advertenciasMapeo,    setAdvertenciasMapeo]    = useState([]);
    const [duplicadosPendientes, setDuplicadosPendientes] = useState([]);
    const [modoDuplicados,       setModoDuplicados]       = useState('fusionar');
    const [sedeBulkSinSede,      setSedeBulkSinSede]      = useState('');
    const [paginaSinSede,        setPaginaSinSede]         = useState(1);   // paginación de la tabla sin-sede
    const [resolucionSedes, setResolucionSedes] = useState(null);
    const [mapeoSedes, setMapeoSedes]     = useState({});  // {valor_excel: sede_id}
    const [mapeoFilas, setMapeoFilas]     = useState({});  // {df_index: sede_id}
    const [sedeDefecto, setSedeDefecto]   = useState('');
    // Sedes nuevas a crear: { key: nombre } — key puede ser valor_excel o '__fila_N' o '__default'
    const [sedesNuevas, setSedesNuevas]   = useState({});
    const inputRef = useRef(null);

    useEffect(() => {
        api.get('sedes/').then(r => setSedes(r.data)).catch(() => {});
        api.get('origenes/')
            .then(r => {
                const nombres = r.data.map(o => o.nombre);
                if (nombres.length) setOrigenes(nombres);
            })
            .catch(() => {});
    }, []);

    const origenFinal = origenDatos === 'OTRO'
        ? origenPersonalizado.trim().toUpperCase()
        : origenDatos;

    // ── Paso 0: subir archivo ─────────────────────────────────────────────────
    const procesarArchivo = useCallback(async (file, hoja = null, skipRowsValue = 0) => {
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext)) {
            swal({ title: 'Formato no soportado', text: 'Solo .xlsx, .xls o .csv', icon: 'error' });
            return;
        }
        setArchivo(file);
        setSheetName(hoja || '');
        setCargando(true);
        const fd = new FormData();
        fd.append('archivo', file);
        if (hoja) fd.append('sheet_name', hoja);
        if (skipRowsValue > 0) fd.append('skip_rows', String(skipRowsValue));
        try {
            const r = await api.post('trazabilidad/preview/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setPreview(r.data);
            setMapeo(r.data.mapeo_sugerido);
            setSheetName(r.data.hoja_activa || '');
            setAdvertenciasMapeo(r.data.advertencias_mapeo || []);
            setPaginaSinSede(1);   // reiniciar paginación al cambiar hoja/archivo
            const nUp = file.name.toUpperCase();
            // Variantes de nombres de archivo que no coinciden exactamente con el origen
            const VARIANTES_ORIGEN = {
                'EURO VIEJITA': 'EURO ANTIGUA',
                'EURO VIEJA':   'EURO ANTIGUA',
                'SUSTITUCION':  'EURO ANTIGUA',
            };
            const varianteMatch = Object.entries(VARIANTES_ORIGEN).find(([k]) => nUp.includes(k));
            const od = varianteMatch
                ? varianteMatch[1]
                : ORIGENES.find(o => o !== 'OTRO' && nUp.includes(o));
            if (od) setOrigenDatos(od);
            setPaso(1);
        } catch (e) {
            swal({ title: 'Error', text: e.response?.data?.error || 'No se pudo procesar el archivo.', icon: 'error' });
            // No limpiar archivo — el usuario puede cambiar de hoja o reintentar
            // sin tener que volver a seleccionar el archivo
        } finally {
            setCargando(false);
        }
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) procesarArchivo(file, null, 0);  // al soltar un archivo nuevo siempre skip=0
    }, [procesarArchivo]);

    const onInputChange = (e) => { if (e.target.files[0]) procesarArchivo(e.target.files[0]); };

    const cambiarHoja = useCallback(async (nuevaHoja, skipRowsVal) => {
        if (!archivo) return;
        // Si no se pasa skipRowsVal explícitamente, leer del estado actual
        const sr = skipRowsVal !== undefined ? skipRowsVal : skipRows;
        await procesarArchivo(archivo, nuevaHoja || sheetName, sr);
    }, [archivo, sheetName, skipRows, procesarArchivo]);

    // ── Paso 1 → 2: resolver sedes ────────────────────────────────────────────
    const irAResolverSedes = async () => {
        if (!origenDatos) {
            await swal({
                icon: 'warning',
                title: 'Falta el origen de datos',
                text: 'Debes seleccionar el origen antes de continuar (COOPISER, EXELA, etc.).',
            });
            // Enfocar visualmente el selector de origen
            document.querySelector('.vyd-origen-select')?.focus();
            return;
        }

        // Advertir si hay columnas con datos sospechosos
        if (advertenciasMapeo.length > 0) {
            const c = swalColors();
            const lista = advertenciasMapeo.map(a => `
                <div style="margin-bottom:12px; padding:10px 12px; border-radius:8px;
                            background:${c.bgDanger}; border:1px solid ${c.bdDanger};">
                    <div style="font-weight:700; color:${c.danger}; margin-bottom:4px;">
                        Columna &ldquo;${a.columna_excel}&rdquo; → ${a.campo_display}
                    </div>
                    <div style="font-size:13px; color:${c.text}; margin-bottom:6px;">
                        ${a.descripcion}
                    </div>
                    <div style="font-size:11.5px; color:${c.muted};">
                        Valores encontrados:
                        <strong style="color:${c.warning}">${a.valores_muestra.join(', ')}</strong>
                        &nbsp;·&nbsp; Solo <strong>${a.tasa_validos}%</strong> parecen correctos.
                    </div>
                </div>
            `).join('');

            const res = await swal({
                icon: 'warning',
                title: 'Posible Excel mal formado',
                html: `
                    <p style="color:${c.text}; margin-bottom:14px; font-size:13.5px;">
                        Se detectaron <strong>${advertenciasMapeo.length}</strong> columna(s) cuyo contenido no coincide
                        con el campo al que fueron mapeadas. Continuar puede comprometer la calidad de los datos.
                    </p>
                    ${lista}
                    <p style="color:${c.muted}; font-size:12px; margin-top:12px;">
                        Puedes corregir el mapeo en la tabla de arriba antes de continuar.
                    </p>
                `,
                showCancelButton: true,
                confirmButtonText: 'Continuar de todas formas',
                cancelButtonText: 'Revisar el mapeo',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6366f1',
                width: 560,
            });
            if (!res.isConfirmed) return;
        }
        // Si no hay columna SEDE → mostrar selección simple
        if (!preview?.tiene_col_sede) {
            setResolucionSedes(null);
            setPaso(2);
            return;
        }
        // Extraer valores únicos de la columna SEDE del preview (solo de sedes_detectadas)
        const valoresExcel = (preview.sedes_detectadas || []).map(s => s.codigo);
        if (!valoresExcel.length) {
            setPaso(3); // sin sedes que resolver → saltar
            return;
        }
        setCargando(true);
        try {
            const r = await api.post('trazabilidad/resolver-sedes/', { valores: valoresExcel });
            setResolucionSedes(r.data);
            // Pre-llenar el mapeo con los ya resueltos
            const preMapeo = {};
            Object.entries(r.data.resueltos).forEach(([val, sede]) => {
                preMapeo[val] = sede.id;
            });
            setMapeoSedes(preMapeo);
            setPaso(2);
        } catch {
            swal({ title: 'Error', text: 'No se pudieron resolver las sedes.', icon: 'error' });
        } finally {
            setCargando(false);
        }
    };

    const OTRA_KEY     = '__OTRA__';
    const NO_SEDE_KEY  = '__NO_SEDE__';   // marca explícita "sin sede / no definida"

    const actualizarMapeoSede = (valor, sedeId) => {
        if (sedeId === OTRA_KEY) {
            setSedesNuevas(prev => ({ ...prev, [valor]: prev[valor] || '' }));
            setMapeoSedes(prev => ({ ...prev, [valor]: OTRA_KEY }));
        } else {
            setSedesNuevas(prev => { const n = { ...prev }; delete n[valor]; return n; });
            setMapeoSedes(prev => ({ ...prev, [valor]: sedeId }));
        }
    };

    const actualizarNombreNuevaSede = (key, nombre) => {
        setSedesNuevas(prev => ({ ...prev, [key]: nombre }));
    };

    const actualizarMapeoFila = (dfIndex, sedeId) => {
        const key = `__fila_${dfIndex}`;
        if (sedeId === OTRA_KEY) {
            setSedesNuevas(prev => ({ ...prev, [key]: prev[key] || '' }));
            setMapeoFilas(prev => ({ ...prev, [String(dfIndex)]: OTRA_KEY }));
        } else {
            setSedesNuevas(prev => { const n = { ...prev }; delete n[key]; return n; });
            setMapeoFilas(prev => ({ ...prev, [String(dfIndex)]: sedeId }));
        }
    };

    const actualizarSedeDefecto = (sedeId) => {
        if (sedeId === OTRA_KEY) {
            setSedesNuevas(prev => ({ ...prev, __default: prev.__default || '' }));
            setSedeDefecto(OTRA_KEY);
        } else {
            setSedesNuevas(prev => { const n = { ...prev }; delete n.__default; return n; });
            setSedeDefecto(sedeId);
        }
    };

    // Verificar si una selección es válida: tiene sede O es OTRA confirmada O es NO_SEDE
    const esSedeLista = (sedeId, key) => {
        if (!sedeId) return false;
        if (sedeId === NO_SEDE_KEY) return true;  // "No definida" siempre es válida
        if (sedeId === OTRA_KEY) {
            return !!(sedesNuevas[key]?.trim()) && !!(sedesNuevas[`${key}__ok`]);
        }
        return true;
    };

    // Asignación masiva al grupo Sin Sede: aplica sedeBulkSinSede a los sin asignar
    const aplicarSedeBulk = (registros) => {
        if (!sedeBulkSinSede) return;
        setMapeoFilas(prev => {
            const nuevo = { ...prev };
            registros.forEach(r => {
                const key = String(r.df_index);
                if (!prev[key]) {   // solo los que todavía no tienen asignación
                    nuevo[key] = sedeBulkSinSede;
                }
            });
            return nuevo;
        });
    };

    // Limpiar todas las asignaciones individuales de filas
    const limpiarMapeoFilas = () => {
        setMapeoFilas({});
        setSedeBulkSinSede('');
    };

    const sedesListas = () => {
        if (!preview?.tiene_col_sede) {
            return esSedeLista(sedeDefecto, '__default');
        }
        if (!resolucionSedes) return true;
        return (resolucionSedes.no_resueltos || []).every(val => {
            if (val === '') {
                const registros = preview?.sedes_detectadas?.find(s => s.codigo === '')?.registros || [];
                return registros.every(r => esSedeLista(mapeoFilas[String(r.df_index)], `__fila_${r.df_index}`));
            }
            return esSedeLista(mapeoSedes[val], val);
        });
    };

    // ── Paso 2 → 3: pre-escaneo de duplicados ────────────────────────────────
    const irAConfirmar = async () => {
        setCargando(true);
        setDuplicadosPendientes([]);
        setModoDuplicados('fusionar');
        try {
            const defectoResuelto = sedeDefecto !== OTRA_KEY ? sedeDefecto : '';
            const fallbackId = defectoResuelto
                || (resolucionSedes?.resueltos && Object.values(resolucionSedes.resueltos)[0]?.id)
                || Object.values(mapeoSedes).find(v => v && v !== OTRA_KEY)
                || '';

            const fd = new FormData();
            fd.append('archivo', archivo);
            fd.append('mapeo', JSON.stringify(mapeo));
            fd.append('mapeo_sedes', JSON.stringify(mapeoSedes));
            fd.append('mapeo_filas', JSON.stringify(mapeoFilas));
            fd.append('check_only', '1');
            if (sheetName) fd.append('sheet_name', sheetName);
            // No enviar __NO_SEDE__ como sede_id en check_only — el backend lo maneja
            const fallbackIdReal = fallbackId && fallbackId !== NO_SEDE_KEY ? fallbackId : '';
            if (fallbackIdReal) fd.append('sede_id', fallbackIdReal);
            fd.append('origen_datos', origenFinal || 'SCAN');

            const r = await api.post('trazabilidad/cargar/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setDuplicadosPendientes(r.data.duplicados || []);
        } catch {
            // Si falla el escaneo, continuar igual (no bloquear al usuario)
        } finally {
            setCargando(false);
        }
        setPaso(3);
    };

    // ── Paso 4: cargar ────────────────────────────────────────────────────────
    const ejecutarCarga = async () => {
        // Verificar que el archivo sigue disponible (puede haberse perdido por un error previo)
        if (!archivo || !(archivo instanceof File)) {
            swal({
                icon: 'warning',
                title: 'Archivo no disponible',
                text: 'El archivo ya no está disponible. Por favor vuelve al paso 1 y selecciónalo de nuevo.',
                confirmButtonText: 'Volver al inicio',
            }).then(() => reiniciar());
            return;
        }
        if (!origenFinal) {
            swal({ title: 'Falta el origen', icon: 'warning' });
            return;
        }
        if (origenDatos === 'OTRO') {
            const nombre = origenPersonalizado.trim();
            if (!nombre) {
                swal({ title: 'Escribe el nombre del origen', icon: 'warning' });
                return;
            }
            if (ORIGENES.filter(o => o !== 'OTRO').some(o => o === nombre.toUpperCase())) {
                swal({ title: 'Origen duplicado', text: `"${nombre}" ya existe como predefinido.`, icon: 'error' });
                return;
            }
        }
        setCargando(true);

        // ── Crear sedes nuevas (OTRA) antes de cargar ────────────────────────
        const mapeoNuevasCreadas = {};  // { key → nuevo_sede_id }
        const hayNuevas = Object.keys(sedesNuevas).length > 0;
        if (hayNuevas) {
            for (const [key, valor] of Object.entries(sedesNuevas)) {
                if (key.endsWith('__ok')) continue;
                if (!valor.trim()) continue;
                // Verificar si ya fue creada (el __ok tiene el ID real)
                const idYaCreado = sedesNuevas[`${key}__ok`];
                if (idYaCreado && idYaCreado !== 'true') {
                    mapeoNuevasCreadas[key] = idYaCreado;
                    continue;
                }
                // Crear ahora si aún no fue creada
                try {
                    const r = await api.post('sedes/', {
                        nombre: valor.trim(),
                        ciudad: 'Sin especificar',
                        codigo: `NUEVA-${Date.now().toString(36).toUpperCase()}`
                    });
                    mapeoNuevasCreadas[key] = r.data.id;
                } catch {
                    swal({ title: 'Error al crear sede', text: `No se pudo crear la sede "${valor}".`, icon: 'error' });
                    setCargando(false);
                    return;
                }
            }
        }

        // Resolver mapeoSedes y mapeoFilas — reemplazar OTRA_KEY por IDs reales
        const mapeoSedesFinal = { ...mapeoSedes };
        const mapeoFilasFinal  = { ...mapeoFilas };
        for (const [key, id] of Object.entries(mapeoSedesFinal)) {
            if (id === OTRA_KEY && mapeoNuevasCreadas[key]) mapeoSedesFinal[key] = mapeoNuevasCreadas[key];
        }
        for (const [idx, id] of Object.entries(mapeoFilasFinal)) {
            const key = `__fila_${idx}`;
            if (id === OTRA_KEY && mapeoNuevasCreadas[key]) mapeoFilasFinal[idx] = mapeoNuevasCreadas[key];
        }

        // Fallback sede_id
        const defectoResuelto = sedeDefecto === OTRA_KEY ? mapeoNuevasCreadas['__default'] : sedeDefecto;
        const fallbackSedeId = defectoResuelto
            || (resolucionSedes?.resueltos && Object.values(resolucionSedes.resueltos)[0]?.id)
            || Object.values(mapeoSedesFinal).find(v => v && v !== OTRA_KEY)
            || Object.values(mapeoFilasFinal).find(v => v && v !== OTRA_KEY)
            || '';

        if (!fallbackSedeId) {
            swal({ title: 'Falta sede', text: 'Debes asignar al menos una sede antes de cargar.', icon: 'warning' });
            setCargando(false);
            return;
        }
        const fd = new FormData();
        fd.append('archivo', archivo);
        // Si el fallback es el sentinel __NO_SEDE__, enviarlo igual — el backend lo maneja
        fd.append('sede_id', fallbackSedeId === NO_SEDE_KEY ? '__NO_SEDE__' : (fallbackSedeId || ''));
        fd.append('origen_datos', origenFinal);
        fd.append('mapeo', JSON.stringify(mapeo));
        fd.append('mapeo_sedes', JSON.stringify(mapeoSedesFinal));
        fd.append('modo_duplicados', duplicadosPendientes.length > 0 ? modoDuplicados : 'separado');
        if (todasLasHojas) fd.append('todas_las_hojas', '1');
        if (skipRows > 0)  fd.append('skip_rows', skipRows);
        if (Object.keys(mapeoFilasFinal).length) fd.append('mapeo_filas', JSON.stringify(mapeoFilasFinal));
        if (sheetName) fd.append('sheet_name', sheetName);
        try {
            const r = await api.post('trazabilidad/cargar/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResultado(r.data);
            setPaso(4);
        } catch (e) {
            swal({ title: 'Error', text: e.response?.data?.error || 'Error al guardar.', icon: 'error' });
        } finally {
            setCargando(false);
        }
    };

    const reiniciar = () => {
        setPaso(0); setOrigenDatos(''); setOrigenPersonalizado('');
        setArchivo(null); setSheetName(''); setPreview(null);
        setMapeo({}); setResultado(null); setAdvertenciasMapeo([]);
        setDuplicadosPendientes([]); setModoDuplicados('fusionar'); setSedeBulkSinSede(''); setPaginaSinSede(1);
        setSkipRows(0); setTodasLasHojas(false);
        setResolucionSedes(null); setMapeoSedes({}); setMapeoFilas({});
        setSedeDefecto(''); setSedesNuevas({});
    };

    const cambiarMapeo = (header, campo) => {
        setMapeo(prev => ({ ...prev, [header]: campo || null }));
        // Si el usuario corrigió el mapeo de una columna con advertencia, quitarla
        setAdvertenciasMapeo(prev => prev.filter(a => a.columna_excel !== header));
    };

    return {
        paso, PASOS, sedes, origenDatos, setOrigenDatos,
        origenPersonalizado, setOrigenPersonalizado, origenFinal, ORIGENES,
        sheetName, cambiarHoja,
        archivo, isDragging, setIsDragging, preview, mapeo, cargando, resultado,
        inputRef,
        advertenciasMapeo,
        duplicadosPendientes, modoDuplicados, setModoDuplicados,
        skipRows, setSkipRows, todasLasHojas, setTodasLasHojas,
        paginaSinSede, setPaginaSinSede,
        sedeBulkSinSede, setSedeBulkSinSede, aplicarSedeBulk, limpiarMapeoFilas,
        resolucionSedes, mapeoSedes, mapeoFilas, sedeDefecto,
        sedesNuevas, OTRA_KEY, NO_SEDE_KEY,
        actualizarMapeoSede, actualizarMapeoFila, actualizarSedeDefecto,
        actualizarNombreNuevaSede, sedesListas,
        onDrop, onInputChange, cambiarMapeo,
        irAResolverSedes, irAConfirmar, ejecutarCarga, reiniciar,
        irAPaso: setPaso,
        camposDisponibles: preview?.campos_disponibles || [],
    };
};

export default useCargaExcel;
