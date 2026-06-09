import { FiDatabase, FiChevronDown, FiChevronUp, FiTrash2, FiUpload,
         FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiFileText, FiRotateCcw } from 'react-icons/fi';
import useBDCentralizada from '../hooks/useBDCentralizada';
import useActaCarga       from '../hooks/useActaCarga';
import ModalActa          from './ModalActa';
import swal               from '../../../utils/swal';
import '../utils/BDCentralizada.scss';

// ── Panel de errores (mismo del módulo Carga) ─────────────────────────────────
const TIPOS_ERROR = {
    sin_documento: {
        label: 'Cédula faltante',
        color: '#f59e0b',
        desc: 'A estas filas les falta el número de cédula, que es obligatorio para cargar el registro.',
    },
    sin_nombre: {
        label: 'Nombre faltante',
        color: '#f59e0b',
        desc: 'A estas filas les falta el nombre completo (columnas NOMBRE y/o APELLIDO vacías).',
    },
    duplicado: {
        label: 'Registro duplicado',
        color: '#6366f1',
        desc: 'Ya existía un registro con la misma cédula. No se cargó de nuevo.',
    },
    referencia_invalida: {
        label: 'Referencia inválida',
        color: '#ef4444',
        desc: 'Un campo relacionado no fue encontrado en el sistema.',
    },
    error_inesperado: {
        label: 'Error en el registro',
        color: '#ef4444',
        desc: 'A estas filas les falta la cédula o el nombre. Corrígelas en el Excel y vuelve a cargar.',
    },
};

const MAX_FILAS = 30;

const ErroresPanel = ({ errores, totalFallidos }) => {
    if (!errores?.length) return null;
    const total      = totalFallidos ?? errores.length;
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

    const gruposPlanos = tieneHojas ? null : errores.reduce((acc, e) => {
        const tipo = e.tipo || 'error_inesperado';
        if (!acc[tipo]) acc[tipo] = [];
        acc[tipo].push(e);
        return acc;
    }, {});

    return (
        <div className="bdc-errores">
            <div className="bdc-errores-titulo">
                <FiAlertTriangle size={13} /> {total} registro{total !== 1 ? 's' : ''} no se pudieron cargar
                {total > errores.length && (
                    <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, opacity: .7 }}>
                        (mostrando {errores.length})
                    </span>
                )}
            </div>

            {tieneHojas ? (
                Object.entries(porHoja).map(([hoja, tiposEnHoja]) => {
                    const totalHoja = Object.values(tiposEnHoja).reduce((s, l) => s + l.length, 0);
                    return (
                        <div key={hoja} className="bdc-errores-grupo">
                            <div className="bdc-errores-grupo-header" style={{ borderLeftColor: '#6366f1' }}>
                                <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
                                    Hoja: {hoja}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--fg4)' }}>{totalHoja} filas</span>
                            </div>
                            {Object.entries(tiposEnHoja).map(([tipo, lista]) => {
                                const info    = TIPOS_ERROR[tipo] || TIPOS_ERROR.error_inesperado;
                                const mostrar = lista.slice(0, MAX_FILAS);
                                const resto   = lista.length - mostrar.length;
                                return (
                                    <div key={tipo} style={{ marginTop: 6, paddingLeft: 10 }}>
                                        <div style={{ fontSize: 11, color: info.color, fontWeight: 700, marginBottom: 4 }}>
                                            {info.label} — {lista.length} fila{lista.length !== 1 ? 's' : ''}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                            {mostrar.map((e, i) => (
                                                <span key={i} className="bdc-fila-badge">
                                                    Fila {e.fila_hoja ?? e.fila}
                                                </span>
                                            ))}
                                            {resto > 0 && (
                                                <span style={{ fontSize: 10, color: 'var(--fg4)', alignSelf: 'center' }}>
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
                Object.entries(gruposPlanos).map(([tipo, lista]) => {
                    const info    = TIPOS_ERROR[tipo] || TIPOS_ERROR.error_inesperado;
                    const mostrar = lista.slice(0, MAX_FILAS);
                    const resto   = lista.length - mostrar.length;
                    return (
                        <div key={tipo} className="bdc-errores-grupo">
                            <div className="bdc-errores-grupo-header" style={{ borderLeftColor: info.color }}>
                                <span style={{ color: info.color, fontSize: 12.5, fontWeight: 700 }}>{info.label}</span>
                                <span style={{ fontSize: 11, color: 'var(--fg4)' }}>{lista.length} fila{lista.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--fg3)', margin: '4px 0 8px' }}>{info.desc}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {mostrar.map((e, i) => (
                                    <span key={i} className="bdc-fila-badge">Fila {e.fila_hoja ?? e.fila}</span>
                                ))}
                                {resto > 0 && (
                                    <span style={{ fontSize: 10, color: 'var(--fg4)', alignSelf: 'center' }}>
                                        +{resto} más
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

const fmt = (dt) => {
    if (!dt) return '—';
    try {
        return new Date(dt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dt; }
};

const BDCentralizada = () => {
    const { cargas, loading, expandida, toggleExpandida, revertir, cargar } = useBDCentralizada();
    const acta = useActaCarga(cargar);

    // Intercepta el clic en "Revertir" y verifica si hay acta firmada
    const handleRevertir = async (e, carga) => {
        e.stopPropagation();

        if (!carga.firma_gh_nombre) {
            // Sin acta firmada → advertencia con opciones
            const { swalColors } = await import('../../../utils/swal');
            const c = swalColors();
            const res = await swal({
                icon: 'warning',
                title: 'Carga sin acta firmada',
                html: `
                    <p style="color:${c.text};font-size:13px;margin-bottom:10px;">
                        Esta carga <strong>no tiene acta firmada</strong>. Si la reviertes ahora,
                        perderás la oportunidad de generar un acta formal del proceso antes de eliminarlo.
                    </p>
                    <p style="color:${c.muted};font-size:12px;">
                        Recomendamos firmar el acta primero para mantener trazabilidad completa.
                    </p>
                `,
                showDenyButton:    true,
                showCancelButton:  true,
                confirmButtonText: 'Firmar acta primero',
                denyButtonText:    'Revertir sin acta',
                cancelButtonText:  'Cancelar',
                confirmButtonColor: '#6366f1',
                denyButtonColor:    '#ef4444',
                width: 480,
            });

            if (res.isConfirmed) {
                // Abrir modal de acta
                acta.abrirModal(carga);
                return;
            }
            if (!res.isDenied) return;   // Canceló → no hacer nada
            // isDenied → continúa con la reversión sin acta
        }

        // Con o sin acta → flujo normal de confirmación
        revertir(carga);
    };

    return (
        <>
        <div className="vyd-main fade-in">
            <div className="vyd-page-header">
                <div>
                    <h1 className="vyd-page-title"><FiDatabase size={20} /> BD Centralizada</h1>
                    <p className="vyd-page-sub">Historial de archivos cargados · {cargas.filter(c => c.estado !== false).length} cargas activas</p>
                </div>
                <button className="vyd-btn-sm ghost" onClick={() => window.location.href = '/ver-y-data/app/carga'}>
                    <FiUpload size={13} /> Nueva carga
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <div className="spinner" />
                </div>
            ) : cargas.length === 0 ? (
                <div className="vyd-panel" style={{ textAlign: 'center', padding: '56px 20px' }}>
                    <FiDatabase size={32} style={{ opacity: .2, display: 'block', margin: '0 auto 12px' }} />
                    <div style={{ color: 'var(--fg2)', fontWeight: 700, marginBottom: 6 }}>Sin cargas registradas</div>
                    <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>Usa el módulo "Carga de datos" para subir archivos Excel.</div>
                </div>
            ) : (
                <div className="bdc-lista">
                    {cargas.map(c => {
                        const activa   = c.estado !== false;
                        const abierta  = expandida === c.id;
                        const tieneErr = c.fallidos > 0 && c.errores?.length > 0;

                        return (
                            <div key={c.id} className={`bdc-carga${activa ? '' : ' revertida'}`}>
                                {/* Cabecera */}
                                <div className="bdc-carga-header" onClick={() => toggleExpandida(c.id)}>
                                    <div className="bdc-carga-info">
                                        <div className="bdc-carga-archivo">{c.nombre_archivo}</div>
                                        <div className="bdc-carga-meta">
                                            <span className="bdc-badge origen">{c.origen_datos}</span>
                                            {c.hoja && <span className="bdc-badge hoja">{c.hoja}</span>}
                                            {c.sede_nombre && <span className="bdc-badge sede">{c.sede_nombre}</span>}
                                            {!activa && <span className="bdc-badge revertida">Revertida</span>}
                                            <span style={{ color: 'var(--fg4)', fontSize: 11.5 }}>{fmt(c.creado)}</span>
                                            <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>por {c.cargado_por_nombre || '—'}</span>
                                        </div>
                                    </div>

                                    <div className="bdc-carga-stats">
                                        <div className="bdc-stat ok"><FiCheckCircle size={13} /> {c.exitosos} cargados</div>
                                        {c.fallidos > 0 && (
                                            <div className="bdc-stat err"><FiAlertCircle size={13} /> {c.fallidos} con error</div>
                                        )}
                                        <div className="bdc-stat mute">{c.total_registros} total</div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {/* Botón Acta — estilo según estado de la carga */}
                                        {c.exitosos > 0 && (() => {
                                            const revertida = !c.estado;
                                            const firmada   = !!c.firma_gh_nombre;

                                            // Revertida + firmada → verde vibrante
                                            if (revertida && firmada) return (
                                                <button
                                                    className="vyd-btn-sm"
                                                    style={{
                                                        fontSize: 11,
                                                        background: 'rgba(34,197,94,.15)',
                                                        border:     '1.5px solid rgba(34,197,94,.55)',
                                                        color:      '#16a34a',
                                                        fontWeight: 700,
                                                    }}
                                                    onClick={e => { e.stopPropagation(); acta.abrirModal(c); }}
                                                    title={`Acta revertida firmada por ${c.firma_gh_nombre}`}
                                                >
                                                    <FiCheckCircle size={12} /> Acta firmada ↩
                                                </button>
                                            );

                                            // Revertida + sin firmar → ámbar llamativo
                                            if (revertida && !firmada) return (
                                                <button
                                                    className="vyd-btn-sm"
                                                    style={{
                                                        fontSize: 11,
                                                        background: 'rgba(245,158,11,.14)',
                                                        border:     '1.5px solid rgba(245,158,11,.55)',
                                                        color:      '#d97706',
                                                        fontWeight: 700,
                                                    }}
                                                    onClick={e => { e.stopPropagation(); acta.abrirModal(c); }}
                                                    title="Carga revertida — genera el acta histórica"
                                                >
                                                    <FiRotateCcw size={12} /> Acta revertida
                                                </button>
                                            );

                                            // Activa + firmada → verde suave
                                            if (!revertida && firmada) return (
                                                <button
                                                    className="vyd-btn-sm"
                                                    style={{
                                                        fontSize: 11,
                                                        background: 'rgba(34,197,94,.10)',
                                                        border:     '1px solid rgba(34,197,94,.35)',
                                                        color:      '#16a34a',
                                                    }}
                                                    onClick={e => { e.stopPropagation(); acta.abrirModal(c); }}
                                                    title={`Acta firmada por ${c.firma_gh_nombre}`}
                                                >
                                                    <FiCheckCircle size={12} /> Ver acta
                                                </button>
                                            );

                                            // Activa + sin firmar → botón normal
                                            return (
                                                <button
                                                    className="vyd-btn-sm"
                                                    style={{ fontSize: 11 }}
                                                    onClick={e => { e.stopPropagation(); acta.abrirModal(c); }}
                                                    title="Generar acta de carga"
                                                >
                                                    <FiFileText size={12} /> Generar acta
                                                </button>
                                            );
                                        })()}
                                        {activa && c.exitosos > 0 && (
                                            <button
                                                className="vyd-btn-sm danger"
                                                style={{ fontSize: 11 }}
                                                onClick={e => handleRevertir(e, c)}
                                                title="Revertir — eliminar todos los registros de esta carga"
                                            >
                                                <FiTrash2 size={12} /> Revertir
                                            </button>
                                        )}
                                        {abierta ? <FiChevronUp size={16} style={{ color: 'var(--fg3)' }} />
                                                 : <FiChevronDown size={16} style={{ color: 'var(--fg3)' }} />}
                                    </div>
                                </div>

                                {/* Detalle expandible */}
                                {abierta && (
                                    <div className="bdc-carga-detalle">
                                        {tieneErr ? (
                                            <ErroresPanel errores={c.errores} />
                                        ) : c.fallidos === 0 ? (
                                            <div style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--fg3)' }}>
                                                <FiCheckCircle size={13} style={{ color: '#16a34a', marginRight: 6 }} />
                                                Todos los registros se cargaron correctamente.
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

            {/* Modal de acta de carga */}
            {acta.open && (
                <ModalActa
                    carga={acta.carga}
                    nombre={acta.nombre}    setNombre={acta.setNombre}
                    cargo={acta.cargo}      setCargo={acta.setCargo}
                    guardando={acta.guardando}
                    sigRef={acta.sigRef}
                    yaFirmada={acta.yaFirmada}
                    firmaImagen={acta.firmaImagen}
                    cerrarModal={acta.cerrarModal}
                    limpiarFirma={acta.limpiarFirma}
                    firmarYDescargar={acta.firmarYDescargar}
                    soloDescargar={acta.soloDescargar}
                />
            )}
        </>
    );
};

export default BDCentralizada;
