import { useState } from 'react';
import { FiUpload, FiCheckCircle, FiAlertCircle, FiArrowRight, FiRefreshCw,
         FiFile, FiAlertTriangle, FiMapPin, FiCheck, FiPlus, FiEdit3, FiDownload } from 'react-icons/fi';
import swal from '../../../utils/swal';
import api from '../../../services/api';
import useCargaExcel from '../hooks/useCargaExcel';
import Pandape from './Pandape';
import '../utils/CargaExcel.scss';

const CargaExcel = () => {
    const {
        paso, PASOS, sedes, origenDatos, setOrigenDatos,
        origenPersonalizado, setOrigenPersonalizado, origenFinal, ORIGENES,
        sheetName, cambiarHoja,
        archivo, isDragging, setIsDragging, preview, mapeo, cargando, resultado,
        inputRef, advertenciasMapeo,
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
        irAPaso, camposDisponibles,
    } = useCargaExcel();

    const [tabActivo, setTabActivo] = useState('excel');

    // Columnas con advertencia → para marcarlas en la tabla
    const columnasConAdvertencia = new Set(advertenciasMapeo.map(a => a.columna_excel));

    // ── Clasificación de errores para mostrarlos al usuario ───────────────────
    const TIPOS_ERROR = {
        sin_documento:      { label: 'Sin número de documento', color: '#f59e0b', desc: 'El registro no tiene cédula en el Excel. Verifica esas filas y corrígelas en el archivo original.' },
        sin_nombre:         { label: 'Sin nombre completo',     color: '#f59e0b', desc: 'El registro no tiene nombre ni apellido.' },
        duplicado:          { label: 'Registro duplicado',      color: '#6366f1', desc: 'Ya existe un registro igual en la base de datos. No se cargó de nuevo.' },
        referencia_invalida:{ label: 'Referencia inválida',     color: '#ef4444', desc: 'Un campo relacionado (sede, etc.) no fue encontrado.' },
        error_inesperado:   { label: 'Error en el registro',    color: '#ef4444', desc: 'Un valor en el Excel excede el límite del campo o tiene formato incorrecto (ej: dos teléfonos en una celda). Revisa esas filas.' },
    };

    const MAX_FILAS_MOSTRAR = 30; // filas por grupo antes de truncar

    const ErroresPanel = ({ errores, totalFallidos }) => {
        const total = totalFallidos ?? errores.length;
        const tieneHojas = errores.some(e => e.hoja);

        // Agrupar por hoja → tipo
        const porHoja = {};
        errores.forEach(e => {
            const hoja = e.hoja || '—';
            const tipo = e.tipo || 'error_inesperado';
            if (!porHoja[hoja]) porHoja[hoja] = {};
            if (!porHoja[hoja][tipo]) porHoja[hoja][tipo] = [];
            porHoja[hoja][tipo].push(e);
        });

        // Si no hay info de hojas, usar agrupación plana por tipo (modo anterior)
        const gruposPlanos = tieneHojas ? null : errores.reduce((acc, e) => {
            const tipo = e.tipo || 'error_inesperado';
            if (!acc[tipo]) acc[tipo] = [];
            acc[tipo].push(e);
            return acc;
        }, {});

        return (
            <div className="vyd-errores-panel">
                <div className="vyd-errores-titulo">
                    <FiAlertTriangle size={15} /> {total} registro{total !== 1 ? 's' : ''} no se pudieron cargar
                    {total > errores.length && (
                        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, opacity: .7 }}>
                            (mostrando los primeros {errores.length} de {total})
                        </span>
                    )}
                </div>

                {tieneHojas ? (
                    // ── Vista agrupada por hoja ────────────────────────────────
                    Object.entries(porHoja).map(([hoja, tiposEnHoja]) => {
                        const totalHoja = Object.values(tiposEnHoja).reduce((s, l) => s + l.length, 0);
                        return (
                            <div key={hoja} className="vyd-errores-grupo" style={{ marginBottom: 12 }}>
                                {/* Encabezado de hoja */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '5px 0 5px 10px',
                                    borderLeft: '3px solid rgba(99,102,241,.5)',
                                    marginBottom: 8,
                                }}>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
                                        Hoja: {hoja}
                                    </span>
                                    <span className="vyd-errores-count">{totalHoja} fila{totalHoja !== 1 ? 's' : ''}</span>
                                </div>

                                {/* Tipos dentro de esta hoja */}
                                {Object.entries(tiposEnHoja).map(([tipo, lista]) => {
                                    const info = TIPOS_ERROR[tipo] || TIPOS_ERROR.error_inesperado;
                                    const mostrar = lista.slice(0, MAX_FILAS_MOSTRAR);
                                    const resto   = lista.length - mostrar.length;
                                    return (
                                        <div key={tipo} style={{ marginBottom: 8, paddingLeft: 12 }}>
                                            <div className="vyd-errores-grupo-header" style={{ borderLeftColor: info.color }}>
                                                <span className="vyd-errores-tipo" style={{ color: info.color }}>{info.label}</span>
                                                <span className="vyd-errores-count">{lista.length} fila{lista.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="vyd-errores-desc" style={{ fontSize: 11 }}>{info.desc}</div>
                                            <div className="vyd-errores-filas">
                                                {mostrar.map((e, i) => (
                                                    <span key={i} className="vyd-errores-fila-badge">
                                                        Fila {e.fila_hoja ?? e.fila}
                                                    </span>
                                                ))}
                                                {resto > 0 && (
                                                    <span style={{ fontSize: 10, color: 'var(--fg4)', padding: '2px 6px' }}>
                                                        +{resto} más
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                ) : (
                    // ── Vista plana (hoja única) ───────────────────────────────
                    Object.entries(gruposPlanos).map(([tipo, lista]) => {
                        const info    = TIPOS_ERROR[tipo] || TIPOS_ERROR.error_inesperado;
                        const mostrar = lista.slice(0, MAX_FILAS_MOSTRAR);
                        const resto   = lista.length - mostrar.length;
                        return (
                            <div key={tipo} className="vyd-errores-grupo">
                                <div className="vyd-errores-grupo-header" style={{ borderLeftColor: info.color }}>
                                    <span className="vyd-errores-tipo" style={{ color: info.color }}>{info.label}</span>
                                    <span className="vyd-errores-count">{lista.length} fila{lista.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="vyd-errores-desc">{info.desc}</div>
                                <div className="vyd-errores-filas">
                                    {mostrar.map((e, i) => (
                                        <span key={i} className="vyd-errores-fila-badge">Fila {e.fila_hoja ?? e.fila}</span>
                                    ))}
                                    {resto > 0 && (
                                        <span style={{ fontSize: 10, color: 'var(--fg4)', padding: '2px 6px' }}>
                                            +{resto} más
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                <div className="vyd-errores-footer">
                    Los registros sin error sí fueron cargados correctamente. Puedes corregir el archivo Excel y volver a cargar solo las filas con problemas.
                </div>
            </div>
        );
    };

    // ── Permiso para crear sedes ──────────────────────────────────────────────
    const puedeCrearSedes = (() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u.is_superuser || (u.permisos_rol || []).includes('can_manage_sedes');
    })();

    // ── Utilidad: detectar sede similar por nombre ────────────────────────────
    const normSede = (s) => s.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    const sedeSimilarExistente = (nombre, disponibles) => {
        if (!nombre.trim()) return null;
        const n = normSede(nombre);
        return disponibles.find(s => {
            const e = normSede(s.nombre);
            if (e === n) return true;
            // palabras significativas del nuevo nombre que aparecen en existente
            const palabras = n.split(' ').filter(w => w.length > 3);
            return palabras.length > 0 && palabras.every(w => e.includes(w));
        });
    };

    // ── Helper: select de sede con opción "Otra" ──────────────────────────────
    const SedeSelect = ({ sedeIdActual, onChangeSede, sedesDisponibles, placeholder, inputKey }) => {
        const esOtra      = sedeIdActual === OTRA_KEY;
        const nombreNueva = sedesNuevas[inputKey] || '';
        const confirmada  = esOtra && sedesNuevas[`${inputKey}__ok`];
        const similar     = esOtra && !confirmada ? sedeSimilarExistente(nombreNueva, sedesDisponibles) : null;

        const confirmar = async () => {
            if (!nombreNueva.trim()) return;
            // Si hay sede similar, pedir confirmación con SweetAlert
            if (similar) {
                const r = await swal({
                    icon: 'warning',
                    title: 'Sede similar existente',
                    html: `Ya existe <strong>${similar.nombre}</strong> (${similar.ciudad}) que es muy similar.<br><br>¿Deseas crear de todas formas la sede <strong>"${nombreNueva}"</strong>?`,
                    showCancelButton: true,
                    confirmButtonText: 'Sí, crear igual',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#6366f1'
                });
                if (!r.isConfirmed) return;
            }
            // Crear la sede en la API inmediatamente
            try {
                const r = await api.post('sedes/', {
                    nombre: nombreNueva.trim(),
                    ciudad: 'Sin especificar',
                    codigo: `NUEVA-${Date.now().toString(36).toUpperCase()}`
                });
                actualizarNombreNuevaSede(`${inputKey}__ok`, String(r.data.id));
                onChangeSede(String(r.data.id));
                const rs = await api.get('sedes/');
                if (resolucionSedes) resolucionSedes.sedes_disponibles = rs.data;
            } catch (err) {
                const msg = err.response?.status === 403
                    ? 'No tienes permiso para crear sedes. Solicita el permiso "Gestionar sedes" a un administrador.'
                    : 'No se pudo crear la sede. Inténtalo de nuevo.';
                swal({
                    icon: 'error', title: 'Error al crear sede',
                    text: msg
                });
            }
        };

        const editar = () => {
            // Volver a modo edición — des-confirmar pero mantener el nombre escrito
            actualizarNombreNuevaSede(`${inputKey}__ok`, '');
            onChangeSede(OTRA_KEY);
        };

        // Estado confirmada: muestra chip verde con la sede creada
        if (confirmada && sedesNuevas[`${inputKey}__ok`] !== 'true') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 7, flex: 1,
                        padding: '7px 12px', borderRadius: 7,
                        background: 'rgba(34,197,94,.10)', border: '1.5px solid rgba(34,197,94,.40)',
                        color: '#16a34a', fontSize: 12.5, fontWeight: 600,
                    }}>
                        <FiCheck size={13} />
                        <span>Sede creada: <strong>{nombreNueva}</strong></span>
                        <em style={{ fontWeight: 400, color: 'var(--fg4)', fontSize: 11 }}>(ya disponible)</em>
                    </div>
                    <button type="button" onClick={editar}
                        style={{ fontSize: 11, color: 'var(--fg3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Cambiar
                    </button>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <select
                    className={`vyd-sr-fila-select${sedeIdActual && sedeIdActual !== OTRA_KEY ? ' assigned' : ''}`}
                    value={sedeIdActual || ''}
                    onChange={e => {
                        if (sedeIdActual === OTRA_KEY && e.target.value !== OTRA_KEY) {
                            actualizarNombreNuevaSede(inputKey, '');
                            actualizarNombreNuevaSede(`${inputKey}__ok`, '');
                        }
                        onChangeSede(e.target.value || '');
                    }}
                >
                    <option value="">{placeholder || 'Seleccionar sede...'}</option>
                    <option value={NO_SEDE_KEY}>— Sin sede / No definida (histórico) —</option>
                    {sedesDisponibles.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre} — {s.ciudad}</option>
                    ))}
                    {puedeCrearSedes && (
                        <option value={OTRA_KEY}>✏ Crear nueva sede...</option>
                    )}
                </select>

                {esOtra && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                placeholder="Nombre de la nueva sede..."
                                value={nombreNueva}
                                onChange={e => actualizarNombreNuevaSede(inputKey, e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && confirmar()}
                                style={{
                                    flex: 1, padding: '7px 10px', fontSize: 12, borderRadius: 7,
                                    background: 'var(--bg-input)',
                                    border: `1.5px solid ${similar ? '#f59e0b' : 'var(--accent)'}`,
                                    color: 'var(--fg1)', outline: 'none',
                                }}
                                maxLength={80} autoFocus
                            />
                            <button type="button" onClick={confirmar} disabled={!nombreNueva.trim()}
                                style={{
                                    padding: '7px 14px', borderRadius: 7, border: 'none',
                                    background: nombreNueva.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                                    color: nombreNueva.trim() ? '#fff' : 'var(--fg4)',
                                    fontSize: 12, fontWeight: 700,
                                    cursor: nombreNueva.trim() ? 'pointer' : 'not-allowed',
                                    flexShrink: 0,
                                }}>
                                Confirmar y crear
                            </button>
                        </div>
                        {/* Aviso de sede similar */}
                        {similar && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '6px 10px', borderRadius: 7, fontSize: 11.5,
                                background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.35)',
                                color: '#d97706',
                            }}>
                                <FiAlertTriangle size={12} />
                                Ya existe <strong style={{ margin: '0 3px' }}>{similar.nombre}</strong> ({similar.ciudad}).
                                ¿Seguro que quieres crear una sede diferente?
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="vyd-main fade-in">
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiUpload size={20} /> Carga de datos</h1>
                    <p className="vyd-page-sub">Importación y homologación de bases de datos</p>
                </div>
                <a
                    href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/'}trazabilidad/plantilla-carga/`}
                    download
                    className="vyd-btn-sm ghost"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                >
                    <FiDownload size={13} /> Descargar plantilla
                </a>
            </div>

            {/* Tabs */}
            <div className="vyd-tabs-bar">
                <button
                    className={`vyd-tab-btn${tabActivo === 'excel' ? ' active' : ''}`}
                    onClick={() => setTabActivo('excel')}
                >
                    Carga Excel
                </button>
                <button
                    className={`vyd-tab-btn${tabActivo === 'pandape' ? ' active' : ''}`}
                    onClick={() => setTabActivo('pandape')}
                >
                    Verificación PandaPé
                </button>
            </div>

            {tabActivo === 'pandape' && <Pandape />}

            {tabActivo === 'excel' && <>

            {/* Stepper */}
            {paso < 4 && (
                <div className="vyd-panel" style={{ padding: '16px 22px' }}>
                    <div className="vyd-steps">
                        {PASOS.map((label, i) => (
                            <>
                                <div key={label}
                                     className={`vyd-step${i === paso ? ' active' : ''}${i < paso ? ' done' : ''}`}
                                     onClick={() => i < paso && irAPaso(i)}
                                     style={{ cursor: i < paso ? 'pointer' : 'default' }}>
                                    <div className="vyd-step-dot">
                                        {i < paso ? <FiCheckCircle size={13} /> : i + 1}
                                    </div>
                                    <span className="vyd-step-label">{label}</span>
                                </div>
                                {i < PASOS.length - 1 && <div key={`l${i}`} className="vyd-step-line" />}
                            </>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Paso 0: Subir archivo ──────────────────────────────────────── */}
            {paso === 0 && (
                <div className="vyd-panel">
                    <div className="vyd-panel-head">
                        <div>
                            <div className="vyd-panel-title">Sube el archivo Excel</div>
                            <div className="vyd-panel-sub">La sede se detectará automáticamente desde el contenido del archivo</div>
                        </div>
                    </div>
                    <div
                        className={`vyd-dropzone${isDragging ? ' active' : ''}${cargando ? ' disabled' : ''}`}
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => !cargando && inputRef.current?.click()}
                    >
                        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
                               style={{ display: 'none' }} onChange={onInputChange} />
                        {cargando ? (
                            <><div className="spinner" style={{ margin: '0 auto 12px', width: 40, height: 40 }} />
                            <div className="vyd-dropzone-text">Analizando archivo...</div></>
                        ) : (
                            <><span className="vyd-dropzone-icon">📊</span>
                            <div className="vyd-dropzone-text">Arrastra tu Excel aquí o haz clic para seleccionar</div>
                            <div className="vyd-dropzone-hint">Formatos: .xlsx · .xls · .csv</div></>
                        )}
                    </div>
                </div>
            )}

            {/* ── Paso 1: Mapeo de columnas ──────────────────────────────────── */}
            {paso === 1 && preview && (
                <div className="vyd-panel vyd-table-panel">
                    <div className="vyd-table-head">
                        <div>
                            <div className="vyd-panel-title">Mapeo de columnas</div>
                            <div className="vyd-panel-sub">
                                <FiFile size={12} style={{ marginRight: 4 }} />
                                {archivo?.name} · {preview.total_filas} filas
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {/* Selector de hoja */}
                            {preview?.hojas?.length > 1 && (
                                <div className="vyd-form-group" style={{ marginBottom: 0, minWidth: 180 }}>
                                    <label style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>
                                        Hoja <span style={{ color: 'var(--accent)' }}>({preview.hojas.length})</span>
                                    </label>
                                    <select value={sheetName} onChange={e => cambiarHoja(e.target.value)}
                                            style={{ padding: '8px 10px', fontSize: 12 }}
                                            disabled={cargando || todasLasHojas}>
                                        {preview.hojas.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Cargar todas las hojas (útil para archivos con muchas hojas) */}
                            {preview?.hojas?.length > 1 && (
                                <div className="vyd-form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>Hojas</label>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                                        padding: '8px 10px', borderRadius: 7, fontSize: 12,
                                        background: todasLasHojas ? 'rgba(99,102,241,.12)' : 'var(--bg-hover)',
                                        border: `1px solid ${todasLasHojas ? 'var(--accent)' : 'var(--border2)'}`,
                                    }}>
                                        <input type="checkbox" checked={todasLasHojas}
                                               onChange={e => setTodasLasHojas(e.target.checked)}
                                               style={{ accentColor: 'var(--accent)' }} />
                                        Todas las hojas ({preview.hojas.length})
                                    </label>
                                </div>
                            )}

                            {/* Saltar filas iniciales (cuando el header no está en fila 1) */}
                            <div className="vyd-form-group" style={{ marginBottom: 0, minWidth: 140 }}>
                                <label style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>
                                    Saltar filas iniciales
                                    <span style={{ color: 'var(--fg4)', fontWeight: 400, marginLeft: 4 }}>(si el encabezado no está en fila 1)</span>
                                </label>
                                <input
                                    type="number" min={0} max={10} value={skipRows}
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setSkipRows(val);
                                        cambiarHoja(sheetName, val);  // pasa el nuevo valor directamente
                                    }}
                                    style={{ padding: '8px 10px', fontSize: 12, width: '100%' }}
                                />
                            </div>
                            {/* Origen */}
                            <div className="vyd-form-group" style={{ marginBottom: 0, minWidth: 200 }}>
                                <label style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>
                                    Origen de datos *
                                    {!origenDatos && (
                                        <span style={{ color: '#ef4444', marginLeft: 6, fontSize: 9 }}>requerido</span>
                                    )}
                                </label>
                                <select
                                    className="vyd-origen-select"
                                    value={origenDatos}
                                    onChange={e => setOrigenDatos(e.target.value)}
                                    style={{
                                        padding: '8px 10px', fontSize: 12,
                                        borderColor: !origenDatos ? 'rgba(239,68,68,.6)' : undefined,
                                        outline: !origenDatos ? '1px solid rgba(239,68,68,.3)' : undefined,
                                    }}>
                                    <option value="">Seleccionar origen...</option>
                                    {ORIGENES.filter(o => o !== 'OTRO').map(o => <option key={o} value={o}>{o}</option>)}
                                    <option value="OTRO">— Otro (escribir nombre) —</option>
                                </select>
                                {origenDatos === 'OTRO' && (
                                    <input type="text" placeholder="Nombre del origen..."
                                           value={origenPersonalizado}
                                           onChange={e => setOrigenPersonalizado(e.target.value)}
                                           style={{ marginTop: 6, padding: '7px 10px', fontSize: 12, width: '100%',
                                                    background: 'var(--bg-input)', border: '1px solid var(--border2)',
                                                    borderRadius: 8, color: 'var(--fg1)', outline: 'none' }}
                                           maxLength={60} autoFocus />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{ padding: '8px 20px 4px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg4)', marginBottom: 8 }}>
                            Vista previa — primeras 5 filas
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="vyd-tbl" style={{ fontSize: 11, minWidth: 'auto' }}>
                                <thead><tr>{preview.headers.slice(0, 6).map(h => <th key={h}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {preview.preview.map((row, i) => (
                                        <tr key={i}>{preview.headers.slice(0, 6).map(h => (
                                            <td key={h} style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {row[h] || '—'}
                                            </td>
                                        ))}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Banner de advertencias de calidad de datos */}
                    {advertenciasMapeo.length > 0 && (
                        <div style={{
                            margin: '12px 20px', padding: '12px 16px',
                            borderRadius: 10, background: 'rgba(239,68,68,.07)',
                            border: '1px solid rgba(239,68,68,.30)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <FiAlertTriangle size={15} color="#ef4444" />
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#ef4444' }}>
                                    Posible Excel mal formado — {advertenciasMapeo.length} columna(s) con datos inesperados
                                </span>
                            </div>
                            {advertenciasMapeo.map(a => (
                                <div key={a.columna_excel} style={{
                                    marginBottom: 8, padding: '8px 10px', borderRadius: 7,
                                    background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)',
                                }}>
                                    <span style={{ fontWeight: 700, color: '#fca5a5', fontSize: 12 }}>
                                        &ldquo;{a.columna_excel}&rdquo; → {a.campo_display}
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: 11.5, marginLeft: 8 }}>
                                        {a.descripcion}
                                    </span>
                                    <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                                        Valores encontrados:&nbsp;
                                        <strong style={{ color: '#fbbf24' }}>{a.valores_muestra.join(', ')}</strong>
                                        &nbsp;· Solo <strong>{a.tasa_validos}%</strong> parecen correctos.
                                    </div>
                                </div>
                            ))}
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                                Corrige el mapeo a continuación o ignora la columna afectada antes de continuar.
                            </div>
                        </div>
                    )}

                    {/* Mapeador */}
                    <div className="vyd-map-header">
                        <span>Columna del Excel</span><span></span><span>Campo destino</span><span>Estado</span>
                    </div>
                    <div className="vyd-map-body">
                        {preview.headers.map(header => {
                            const tieneAdv = columnasConAdvertencia.has(header);
                            return (
                            <div key={header} className="vyd-map-row" style={tieneAdv ? {
                                background: 'rgba(239,68,68,.05)',
                                borderLeft: '3px solid rgba(239,68,68,.55)',
                            } : {}}>
                                <div className="vyd-map-excel">
                                    <strong style={tieneAdv ? { color: '#fca5a5' } : {}}>{header}</strong>
                                    <small>{preview.preview[0]?.[header] || '—'}</small>
                                </div>
                                <div className="vyd-map-arrow">→</div>
                                <div>
                                    <select className="vyd-map-select" value={mapeo[header] || ''}
                                            onChange={e => cambiarMapeo(header, e.target.value)}
                                            style={tieneAdv ? { borderColor: 'rgba(239,68,68,.6)' } : {}}>
                                        <option value="">Ignorar columna</option>
                                        {camposDisponibles.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    {tieneAdv ? (
                                        <span className="vyd-map-badge" style={{
                                            background: 'rgba(239,68,68,.12)', color: '#ef4444',
                                            border: '1px solid rgba(239,68,68,.35)',
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                        }}>
                                            <FiAlertTriangle size={10} /> Datos dudosos
                                        </span>
                                    ) : mapeo[header] ? (
                                        <span className="vyd-map-badge mapped"><FiCheckCircle size={11} /> Mapeado</span>
                                    ) : (
                                        <span className="vyd-map-badge ignored">Ignorado</span>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>

                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                        <button className="vyd-btn-sm" onClick={irAResolverSedes} disabled={cargando}>
                            {cargando ? <><span className="vyd-btn-spinner" /> Procesando...</> : <>Continuar <FiArrowRight size={13} /></>}
                        </button>
                        <button className="vyd-btn-sm ghost" onClick={() => irAPaso(0)}>Volver</button>
                    </div>
                </div>
            )}

            {/* ── Paso 2: Resolver sedes ────────────────────────────────────── */}
            {paso === 2 && (
                <div className="vyd-panel">
                    <div className="vyd-panel-head">
                        <div>
                            <div className="vyd-panel-title"><FiMapPin size={14} style={{ marginRight: 6 }} />Asignación de sedes</div>
                            <div className="vyd-panel-sub">
                                {preview?.tiene_col_sede
                                    ? 'El sistema detectó las sedes del archivo. Confirma o corrige las que no se reconocieron.'
                                    : 'Este archivo no tiene columna de sede. Selecciona la sede para todos los registros.'}
                            </div>
                        </div>
                    </div>

                    {/* Sin columna SEDE → selección única */}
                    {!preview?.tiene_col_sede && (
                        <div style={{ padding: '4px 0 16px' }}>
                            <div className="vyd-form-group" style={{ maxWidth: 440 }}>
                                <label>Sede para todos los registros *</label>
                                <SedeSelect
                                    sedeIdActual={sedeDefecto}
                                    onChangeSede={actualizarSedeDefecto}
                                    sedesDisponibles={sedes}
                                    placeholder="Seleccionar sede..."
                                    inputKey="__default"
                                />
                            </div>
                        </div>
                    )}

                    {/* Con columna SEDE → tabla de resolución */}
                    {preview?.tiene_col_sede && resolucionSedes && (
                        <div className="vyd-sede-resolucion">
                            {/* Resueltos automáticamente */}
                            {Object.keys(resolucionSedes.resueltos).length > 0 && (
                                <div className="vyd-sr-grupo">
                                    <div className="vyd-sr-grupo-title ok">
                                        <FiCheck size={13} /> Reconocidas automáticamente ({Object.keys(resolucionSedes.resueltos).length})
                                    </div>
                                    {Object.entries(resolucionSedes.resueltos).map(([val, sede]) => (
                                        <div key={val} className="vyd-sr-row">
                                            <div className="vyd-sr-valor">{val}</div>
                                            <div className="vyd-sr-flecha">→</div>
                                            <div className="vyd-sr-sede ok">
                                                <FiCheck size={11} /> {sede.nombre} <span>{sede.ciudad}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* No resueltos → usuario asigna */}
                            {resolucionSedes.no_resueltos.length > 0 && (
                                <div className="vyd-sr-grupo">
                                    <div className="vyd-sr-grupo-title warning">
                                        <FiAlertTriangle size={13} /> Requieren asignación manual ({resolucionSedes.no_resueltos.length})
                                    </div>
                                    {resolucionSedes.no_resueltos.map(val => {
                                        const sinSede = val === '';
                                        const entradaSinSede = sinSede
                                            ? preview?.sedes_detectadas?.find(s => s.codigo === '')
                                            : null;
                                        const totalVacios = entradaSinSede?.total || '?';
                                        const registros   = entradaSinSede?.registros || [];

                                        return (
                                            <div key={val === '' ? '__vacio__' : val} className="vyd-sr-bloque">
                                                <div className="vyd-sr-row unresolved">
                                                    <div className="vyd-sr-valor warning">
                                                        {sinSede
                                                            ? <span style={{ fontStyle: 'italic', color: '#d97706' }}>
                                                                Sin sede ({totalVacios} registro{totalVacios !== 1 ? 's' : ''})
                                                              </span>
                                                            : val}
                                                    </div>
                                                    <div className="vyd-sr-flecha">→</div>
                                                    {!sinSede && (
                                                        <div className="vyd-sr-select">
                                                            <SedeSelect
                                                                sedeIdActual={mapeoSedes[val] || ''}
                                                                onChangeSede={id => actualizarMapeoSede(val, id)}
                                                                sedesDisponibles={resolucionSedes.sedes_disponibles}
                                                                placeholder="Seleccionar sede..."
                                                                inputKey={val}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tabla individual — un dropdown por registro */}
                                                {sinSede && registros.length > 0 && (
                                                    <div className="vyd-sr-registros">

                                                        {/* ── Panel de asignación masiva ───────────── */}
                                                        {(() => {
                                                            const pendientes = registros.filter(r => !mapeoFilas[String(r.df_index)]).length;
                                                            return (
                                                            <div className="vyd-bulk-panel">
                                                                <span className="vyd-bulk-label">Asignar masivamente</span>
                                                                <select
                                                                    className="vyd-bulk-select"
                                                                    value={sedeBulkSinSede}
                                                                    onChange={e => setSedeBulkSinSede(e.target.value)}
                                                                >
                                                                    <option value="">Seleccionar sede...</option>
                                                                    <option value={NO_SEDE_KEY}>— Sin sede / No definida (histórico) —</option>
                                                                    {(resolucionSedes?.sedes_disponibles || []).map(s => (
                                                                        <option key={s.id} value={s.id}>{s.nombre} — {s.ciudad}</option>
                                                                    ))}
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    className="vyd-btn-sm"
                                                                    disabled={!sedeBulkSinSede}
                                                                    onClick={() => aplicarSedeBulk(registros)}
                                                                    title="Aplica solo a filas que aún no tienen sede asignada"
                                                                >
                                                                    Aplicar a sin asignar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="vyd-btn-sm ghost"
                                                                    onClick={limpiarMapeoFilas}
                                                                    title="Borra todas las asignaciones individuales para empezar de cero"
                                                                    style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,.4)' }}
                                                                >
                                                                    Limpiar todo
                                                                </button>
                                                                <span className={`vyd-bulk-counter ${pendientes > 0 ? 'pendiente' : 'ok'}`}>
                                                                    {pendientes > 0 ? `${pendientes} sin asignar` : 'Todas asignadas ✓'}
                                                                </span>
                                                            </div>
                                                            );
                                                        })()}

                                                        {/* Paginación de registros sin sede */}
                                                        {(() => {
                                                            const POR_PAG = 50;
                                                            const totalPags = Math.ceil(registros.length / POR_PAG);
                                                            const pag = Math.min(paginaSinSede, totalPags);
                                                            const registrosPag = registros.slice((pag-1)*POR_PAG, pag*POR_PAG);
                                                            return (
                                                            <>
                                                        <table className="vyd-sr-tabla">
                                                            <thead>
                                                                <tr>
                                                                    <th>Cédula</th>
                                                                    <th>Nombre</th>
                                                                    <th>Celular</th>
                                                                    <th>Motivo</th>
                                                                    <th>Sede a asignar</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {registrosPag.map((r) => {
                                                                    const sedeActual = mapeoFilas[String(r.df_index)] || '';
                                                                    const esNoSede   = sedeActual === NO_SEDE_KEY;
                                                                    return (
                                                                    <tr key={r.df_index}
                                                                        className={sedeActual ? 'asignado' : 'pendiente'}>
                                                                        <td><span style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{r.cedula || '—'}</span></td>
                                                                        <td>{r.nombre || '—'}</td>
                                                                        <td style={{ whiteSpace: 'nowrap' }}>{r.celular || '—'}</td>
                                                                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.motivo || '—'}</td>
                                                                        <td>
                                                                            {esNoSede ? (
                                                                                <div className="vyd-nosede-chip">
                                                                                    <span className="vyd-nosede-badge">Sin sede</span>
                                                                                    <button type="button" className="vyd-nosede-cambiar"
                                                                                        onClick={() => actualizarMapeoFila(r.df_index, '')}>
                                                                                        Cambiar
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <SedeSelect
                                                                                    sedeIdActual={sedeActual}
                                                                                    onChangeSede={id => actualizarMapeoFila(r.df_index, id)}
                                                                                    sedesDisponibles={resolucionSedes.sedes_disponibles}
                                                                                    placeholder="Seleccionar..."
                                                                                    inputKey={`__fila_${r.df_index}`}
                                                                                />
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                        {/* Barra de paginación */}
                                                        {totalPags > 1 && (
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '8px 12px',
                                                                borderTop: '1px solid rgba(245,158,11,.15)',
                                                                background: 'rgba(245,158,11,.04)',
                                                                fontSize: 11,
                                                            }}>
                                                                <span style={{ color: 'var(--fg3)' }}>
                                                                    Página <strong>{pag}</strong> de <strong>{totalPags}</strong>
                                                                    {' · '}{registros.length} registros sin sede
                                                                </span>
                                                                <div style={{ display: 'flex', gap: 5 }}>
                                                                    <button
                                                                        type="button"
                                                                        className="vyd-btn-sm ghost"
                                                                        style={{ padding: '3px 10px', fontSize: 11 }}
                                                                        disabled={pag <= 1}
                                                                        onClick={() => setPaginaSinSede(p => p - 1)}
                                                                    >← Anterior</button>
                                                                    <button
                                                                        type="button"
                                                                        className="vyd-btn-sm ghost"
                                                                        style={{ padding: '3px 10px', fontSize: 11 }}
                                                                        disabled={pag >= totalPags}
                                                                        onClick={() => setPaginaSinSede(p => p + 1)}
                                                                    >Siguiente →</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                            </>
                                                            ); // fin return paginación
                                                        })() /* fin IIFE paginación */}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                        <button className="vyd-btn-sm" onClick={irAConfirmar} disabled={!sedesListas() || cargando}>
                            {cargando ? <><span className="vyd-btn-spinner" /> Verificando...</> : <>Continuar <FiArrowRight size={13} /></>}
                        </button>
                        <button className="vyd-btn-sm ghost" onClick={() => irAPaso(1)}>Volver</button>
                    </div>
                </div>
            )}

            {/* ── Paso 3: Confirmar ─────────────────────────────────────────── */}
            {paso === 3 && (
                <div className="vyd-panel">
                    <div className="vyd-panel-title" style={{ marginBottom: 18 }}>Resumen antes de cargar</div>

                    {/* Sección de duplicados detectados */}
                    {duplicadosPendientes.length > 0 && (
                        <div style={{
                            margin: '0 0 20px', padding: '16px 18px',
                            borderRadius: 10, background: 'rgba(245,158,11,.07)',
                            border: '1px solid rgba(245,158,11,.35)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <FiAlertTriangle size={15} color="#f59e0b" />
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>
                                    {duplicadosPendientes.length} registro{duplicadosPendientes.length !== 1 ? 's' : ''} ya existen con los mismos datos
                                </span>
                            </div>

                            {/* Muestra hasta 6 duplicados */}
                            <div style={{ marginBottom: 12 }}>
                                {duplicadosPendientes.slice(0, 6).map((d, i) => (
                                    <div key={i} style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto',
                                        gap: '0 10px', alignItems: 'start',
                                        padding: '6px 8px', marginBottom: 4, borderRadius: 6,
                                        background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)',
                                        fontSize: 12,
                                    }}>
                                        {/* Fila 1: cédula · nombre · fechas */}
                                        <span style={{ fontFamily: 'monospace', color: '#fbbf24', whiteSpace: 'nowrap' }}>{d.documento_id}</span>
                                        <span style={{ color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre || '—'}</span>
                                        <span style={{ color: 'var(--fg4)', fontSize: 11, whiteSpace: 'nowrap', textAlign: 'right' }}>
                                            {d.fecha_ingreso || '?'} → {d.fecha_retiro || 'activo'}
                                        </span>
                                        {/* Fila 2: motivo (span completo si existe) */}
                                        {d.motivo && (
                                            <span style={{
                                                gridColumn: '1 / -1', fontSize: 11,
                                                color: 'var(--fg4)', paddingLeft: 2, marginTop: 2,
                                            }}>
                                                Motivo: <em style={{ color: 'var(--fg3)' }}>{d.motivo}</em>
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {duplicadosPendientes.length > 6 && (
                                    <div style={{ fontSize: 11, color: 'var(--fg4)', paddingLeft: 8 }}>
                                        y {duplicadosPendientes.length - 6} más…
                                    </div>
                                )}
                            </div>

                            {/* Elección del usuario */}
                            <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginBottom: 10 }}>
                                ¿Qué deseas hacer con estos registros?
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    {
                                        key: 'fusionar',
                                        label: 'Fusionar — no crear duplicados',
                                        desc: 'Los registros que ya existen se omiten y se cuentan como cargados correctamente. Recomendado.',
                                        color: '#22c55e',
                                    },
                                    {
                                        key: 'separado',
                                        label: 'Cargar por separado — mantener ambos',
                                        desc: 'Se crean los registros nuevos aunque ya existan datos idénticos. Quedará información repetida en el historial.',
                                        color: '#f59e0b',
                                    },
                                ].map(op => (
                                    <label key={op.key} style={{
                                        display: 'flex', gap: 10, padding: '10px 12px',
                                        borderRadius: 8, cursor: 'pointer',
                                        background: modoDuplicados === op.key ? `${op.color}14` : 'var(--surface2)',
                                        border: `1.5px solid ${modoDuplicados === op.key ? op.color : 'var(--border)'}`,
                                        transition: 'all .15s',
                                    }}>
                                        <input
                                            type="radio" name="modoDuplicados" value={op.key}
                                            checked={modoDuplicados === op.key}
                                            onChange={() => setModoDuplicados(op.key)}
                                            style={{ marginTop: 2, accentColor: op.color }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 12.5, color: modoDuplicados === op.key ? op.color : 'var(--fg2)' }}>
                                                {op.label}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: 'var(--fg4)', marginTop: 2 }}>{op.desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="vyd-confirm-grid">
                        <div className="vyd-confirm-item">
                            <span className="vyd-confirm-label">Archivo</span>
                            <span className="vyd-confirm-value">{archivo?.name}</span>
                        </div>
                        <div className="vyd-confirm-item">
                            <span className="vyd-confirm-label">Origen de datos</span>
                            <span className="vyd-confirm-value" style={{ color: 'var(--accent)', fontWeight: 700 }}>{origenFinal}</span>
                        </div>
                        <div className="vyd-confirm-item">
                            <span className="vyd-confirm-label">Total filas</span>
                            <span className="vyd-confirm-value">{preview?.total_filas}</span>
                        </div>
                        <div className="vyd-confirm-item">
                            <span className="vyd-confirm-label">Columnas mapeadas</span>
                            <span className="vyd-confirm-value">
                                {Object.values(mapeo).filter(Boolean).length} / {preview?.headers?.length}
                            </span>
                        </div>
                        {preview?.tiene_col_sede ? (
                            <div className="vyd-confirm-item">
                                <span className="vyd-confirm-label">Sedes</span>
                                <span className="vyd-confirm-value">
                                    {Object.keys(resolucionSedes?.resueltos || {}).length + Object.keys(mapeoSedes).filter(k => !resolucionSedes?.resueltos?.[k]).length} asignadas
                                </span>
                            </div>
                        ) : (
                            <div className="vyd-confirm-item">
                                <span className="vyd-confirm-label">Sede</span>
                                <span className="vyd-confirm-value">
                                    {sedes.find(s => String(s.id) === String(sedeDefecto))?.nombre || '—'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                        <button className="vyd-btn-sm" onClick={ejecutarCarga} disabled={cargando}>
                            {cargando ? <><span className="vyd-btn-spinner" /> Cargando...</> : <><FiUpload size={13} /> Cargar ahora</>}
                        </button>
                        <button className="vyd-btn-sm ghost" onClick={() => irAPaso(2)}>Volver</button>
                    </div>
                </div>
            )}

            {/* ── Resultado ─────────────────────────────────────────────────── */}
            {paso === 4 && resultado && (
                <div className="vyd-panel vyd-result">
                    <div className="vyd-result-icon">{resultado.fallidos === 0 ? '✅' : '⚠️'}</div>
                    <h2 className="vyd-result-title">{resultado.mensaje}</h2>
                    <div className="vyd-result-stats">
                        <div className="vyd-stat ok">
                            <span className="vyd-stat-num">{resultado.nuevos ?? resultado.exitosos}</span>
                            <span className="vyd-stat-lbl">Nuevos</span>
                        </div>
                        {resultado.fusionados > 0 && (
                            <div className="vyd-stat" style={{ color: '#22c55e' }}>
                                <span className="vyd-stat-num">{resultado.fusionados}</span>
                                <span className="vyd-stat-lbl">Fusionados</span>
                            </div>
                        )}
                        <div className="vyd-stat danger">
                            <span className="vyd-stat-num">{resultado.fallidos}</span>
                            <span className="vyd-stat-lbl">Con error</span>
                        </div>
                        <div className="vyd-stat mute">
                            <span className="vyd-stat-num">{resultado.total}</span>
                            <span className="vyd-stat-lbl">Total filas</span>
                        </div>
                    </div>
                    {resultado.fallidos > 0 && (
                        <ErroresPanel errores={resultado.errores} totalFallidos={resultado.fallidos} />
                    )}
                    <button className="vyd-btn-sm" onClick={reiniciar} style={{ marginTop: 24 }}>
                        <FiRefreshCw size={13} /> Nueva carga
                    </button>
                </div>
            )}

            </>}
        </div>
    );
};

export default CargaExcel;
