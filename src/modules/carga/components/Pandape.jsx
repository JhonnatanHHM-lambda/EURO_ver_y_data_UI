import { useState, useRef, useEffect } from 'react';
import {
    FiUpload, FiCheckCircle, FiAlertTriangle, FiChevronDown,
    FiChevronRight, FiRefreshCw, FiCheck, FiUser,
} from 'react-icons/fi';
import api from '../../../services/api';
import swal from '../../../utils/swal';

const ESTADO_CHIP = {
    HABILITADO:                 { label: 'Habilitado',           color: '#22c55e' },
    INHABILITADO:               { label: 'Inhabilitado',         color: '#ef4444' },
    REGISTRADO:                 { label: 'Registrado',           color: '#94a3b8' },
    VERIFICACION_PARCIAL:       { label: 'Verf. parcial',        color: '#f59e0b' },
    REVISION_MANUAL_AUTORIZADA: { label: 'Autorizado',           color: '#f59e0b' },
    REVISION_MANUAL_RECHAZADA:  { label: 'Rechazado',            color: '#ef4444' },
};

const EstadoChip = ({ estado }) => {
    const cfg = ESTADO_CHIP[estado] || { label: estado, color: '#94a3b8' };
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 20,
            fontSize: 11, fontWeight: 700, color: cfg.color,
            background: `${cfg.color}22`, border: `1px solid ${cfg.color}44`,
        }}>
            {cfg.label}
        </span>
    );
};

const TablaAntecedentes = ({ antecedentes }) => (
    <div className="vyd-pp-antec-wrap">
        <table className="vyd-pp-antec-table">
            <thead>
                <tr>
                    <th>Sede</th><th>Cargo</th><th>Tipo</th><th>Estado</th>
                    <th>Ingreso</th><th>Retiro</th><th>Motivo</th><th>Origen</th>
                </tr>
            </thead>
            <tbody>
                {antecedentes.map((a, i) => (
                    <tr key={i}>
                        <td>{a.sede || '—'}</td>
                        <td>{a.cargo || '—'}</td>
                        <td>{a.tipo_proceso || '—'}</td>
                        <td><EstadoChip estado={a.estado_candidato} /></td>
                        <td>{a.fecha_ingreso || '—'}</td>
                        <td>{a.fecha_retiro || '—'}</td>
                        <td title={a.motivo_retiro}>{a.motivo_retiro ? (a.motivo_retiro.length > 30 ? a.motivo_retiro.slice(0, 30) + '…' : a.motivo_retiro) : '—'}</td>
                        <td>{a.origen_datos}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Pandape = () => {
    const [fase, setFase] = useState('idle');           // idle | procesando | resultados
    const [isDragging, setIsDragging] = useState(false);
    const [resumen, setResumen] = useState(null);
    const [habilitados, setHabilitados] = useState([]);
    const [conAntecedentes, setConAntecedentes] = useState([]);
    const [conHistorial, setConHistorial] = useState([]);
    const [tabResultado, setTabResultado] = useState('habilitados');
    const [seleccionados, setSeleccionados] = useState(new Set());
    const [expandidos, setExpandidos] = useState(new Set());
    const [cargando, setCargando] = useState(false);
    const [sedes, setSedes] = useState([]);
    const [sedeIncorporar, setSedeIncorporar] = useState('');
    const inputRef = useRef();

    useEffect(() => {
        api.get('sedes/').then(r => setSedes(r.data || [])).catch(() => {});
    }, []);

    const procesar = async (archivo) => {
        setCargando(true);
        setFase('procesando');
        const fd = new FormData();
        fd.append('archivo', archivo);
        try {
            const { data } = await api.post('trazabilidad/pandape/procesar/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setHabilitados(data.habilitados);
            setConAntecedentes(data.con_antecedentes);
            setConHistorial(data.con_historial);
            setResumen(data.resumen);
            setFase('resultados');
            setTabResultado('habilitados');
            setSeleccionados(new Set());
            setExpandidos(new Set());
        } catch (e) {
            swal({ title: 'Error', text: e.response?.data?.error || 'No se pudo procesar el archivo.', icon: 'error' });
            setFase('idle');
        } finally {
            setCargando(false);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) procesar(f);
    };

    const onInputChange = (e) => {
        const f = e.target.files[0];
        if (f) procesar(f);
        e.target.value = '';
    };

    const toggleExpandir = (doc) => setExpandidos(prev => {
        const n = new Set(prev);
        n.has(doc) ? n.delete(doc) : n.add(doc);
        return n;
    });

    const toggleSeleccionar = (doc) => setSeleccionados(prev => {
        const n = new Set(prev);
        n.has(doc) ? n.delete(doc) : n.add(doc);
        return n;
    });

    const listaActual = tabResultado === 'habilitados' ? habilitados : tabResultado === 'historial' ? conHistorial : [];

    const seleccionarTodos = () => {
        const todos = listaActual.map(c => c.documento_id);
        setSeleccionados(prev => prev.size === todos.length && todos.length > 0 ? new Set() : new Set(todos));
    };

    const incorporar = async () => {
        const candidatos = listaActual.filter(c => seleccionados.has(c.documento_id));
        if (!candidatos.length) return;
        const res = await swal({
            title: `Incorporar ${candidatos.length} candidato(s)`,
            text: 'Se agregarán como CANDIDATOS habilitados a la BD centralizada.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, incorporar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#22c55e',
        });
        if (!res.isConfirmed) return;
        setCargando(true);
        try {
            const { data } = await api.post('trazabilidad/pandape/confirmar/', {
                candidatos,
                sede_id: sedeIncorporar || null,
            });
            swal({ title: 'Listo', text: data.mensaje, icon: 'success' });
            const docs = new Set(candidatos.map(c => c.documento_id));
            if (tabResultado === 'habilitados') setHabilitados(prev => prev.filter(c => !docs.has(c.documento_id)));
            else setConHistorial(prev => prev.filter(c => !docs.has(c.documento_id)));
            setSeleccionados(new Set());
        } catch (e) {
            swal({ title: 'Error', text: e.response?.data?.error || 'Error al incorporar.', icon: 'error' });
        } finally {
            setCargando(false);
        }
    };

    const autorizar = async (cand) => {
        const { value: just, isConfirmed } = await swal({
            title: 'Autorizar candidato con antecedentes',
            html: `<strong>${cand.nombre_completo}</strong><br><small style="color:var(--fg3)">Documento: ${cand.documento_id}</small>`,
            input: 'textarea',
            inputPlaceholder: 'Justificación para autorizar este proceso (mín. 10 caracteres)...',
            inputAttributes: { maxlength: 300, style: 'min-height:80px;font-size:13px' },
            showCancelButton: true,
            confirmButtonText: 'Autorizar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
        });
        if (!isConfirmed || !just) return;
        if (just.trim().length < 10) {
            swal({ title: 'Justificación muy corta', text: 'Escribe al menos 10 caracteres.', icon: 'warning' });
            return;
        }
        try {
            const { data } = await api.post(`trazabilidad/pandape/autorizar/${cand.documento_id}/`, { justificacion: just.trim() });
            swal({ title: 'Autorizado', text: data.mensaje, icon: 'success' });
            setConAntecedentes(prev => prev.filter(c => c.documento_id !== cand.documento_id));
            setConHistorial(prev => [...prev, {
                ...cand,
                resultado: 'CON_HISTORIAL',
                antecedentes: cand.antecedentes.map(a => ({ ...a, estado_candidato: 'REVISION_MANUAL_AUTORIZADA' })),
            }]);
        } catch (e) {
            swal({ title: 'Error', text: e.response?.data?.error || 'Error al autorizar.', icon: 'error' });
        }
    };

    const reiniciar = () => {
        setFase('idle');
        setResumen(null);
        setHabilitados([]);
        setConAntecedentes([]);
        setConHistorial([]);
        setSeleccionados(new Set());
        setExpandidos(new Set());
    };

    // ── IDLE / PROCESANDO ──────────────────────────────────────────────────────
    if (fase === 'idle' || fase === 'procesando') {
        return (
            <div className="vyd-panel fade-in" style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg1)' }}>Verificación PandaPé</div>
                    <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 }}>
                        Sube el reporte de precandidatos para cruzarlo con la BD centralizada
                    </div>
                </div>

                {fase === 'procesando' ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--fg3)' }}>
                        <div className="vyd-spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 14 }}>Cruzando candidatos contra la BD centralizada…</p>
                    </div>
                ) : (
                    <div
                        className={`vyd-dropzone${isDragging ? ' active' : ''}`}
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <span className="vyd-dropzone-icon">📋</span>
                        <div className="vyd-dropzone-text">Arrastra el reporte de PandaPé aquí</div>
                        <div className="vyd-dropzone-hint">o haz clic para seleccionar — archivo .xlsx</div>
                        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={onInputChange} />
                    </div>
                )}

                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fg4)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <FiUser size={12} />
                    El reporte debe tener la columna <strong style={{ color: 'var(--fg3)' }}>CPF</strong> con el número de documento de cada precandidato.
                </div>
            </div>
        );
    }

    // ── RESULTADOS ─────────────────────────────────────────────────────────────
    const todosSeleccionados = listaActual.length > 0 && seleccionados.size === listaActual.length;
    const algunoSeleccionado = seleccionados.size > 0 && (tabResultado === 'habilitados' || tabResultado === 'historial');

    return (
        <div className="fade-in" style={{ marginTop: 16 }}>
            {/* KPIs resumen */}
            <div className="vyd-pp-kpis">
                <div className="vyd-pp-kpi green" onClick={() => setTabResultado('habilitados')}>
                    <span className="vyd-pp-kpi-num">{habilitados.length}</span>
                    <span className="vyd-pp-kpi-lbl">Habilitados</span>
                </div>
                <div className="vyd-pp-kpi red" onClick={() => setTabResultado('antecedentes')}>
                    <span className="vyd-pp-kpi-num">{conAntecedentes.length}</span>
                    <span className="vyd-pp-kpi-lbl">Con antecedentes</span>
                </div>
                <div className="vyd-pp-kpi orange" onClick={() => setTabResultado('historial')}>
                    <span className="vyd-pp-kpi-num">{conHistorial.length}</span>
                    <span className="vyd-pp-kpi-lbl">Con historial</span>
                </div>
                <div className="vyd-pp-kpi mute" style={{ cursor: 'default' }}>
                    <span className="vyd-pp-kpi-num">{resumen.total}</span>
                    <span className="vyd-pp-kpi-lbl">Total cargados</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="vyd-pp-tab-bar">
                <button className={`vyd-pp-tab green${tabResultado === 'habilitados' ? ' active' : ''}`} onClick={() => { setTabResultado('habilitados'); setSeleccionados(new Set()); }}>
                    <FiCheckCircle size={13} /> Habilitados ({habilitados.length})
                </button>
                <button className={`vyd-pp-tab red${tabResultado === 'antecedentes' ? ' active' : ''}`} onClick={() => { setTabResultado('antecedentes'); setSeleccionados(new Set()); }}>
                    <FiAlertTriangle size={13} /> Con antecedentes ({conAntecedentes.length})
                </button>
                <button className={`vyd-pp-tab orange${tabResultado === 'historial' ? ' active' : ''}`} onClick={() => { setTabResultado('historial'); setSeleccionados(new Set()); }}>
                    <FiUser size={13} /> Con historial ({conHistorial.length})
                </button>
            </div>

            <div className="vyd-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Toolbar — solo en tabs que permiten incorporar */}
                {(tabResultado === 'habilitados' || tabResultado === 'historial') && listaActual.length > 0 && (
                    <div className="vyd-pp-toolbar">
                        <label className="vyd-pp-check-all">
                            <input type="checkbox" checked={todosSeleccionados} onChange={seleccionarTodos} />
                            <span>Seleccionar todos ({listaActual.length})</span>
                        </label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select
                                className="vyd-pp-sede-select"
                                value={sedeIncorporar}
                                onChange={e => setSedeIncorporar(e.target.value)}
                            >
                                <option value="">Sin sede asignada</option>
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            <button
                                className="vyd-btn-sm"
                                style={{ background: algunoSeleccionado ? 'rgba(34,197,94,.15)' : undefined, color: algunoSeleccionado ? '#22c55e' : undefined, borderColor: algunoSeleccionado ? 'rgba(34,197,94,.4)' : undefined }}
                                onClick={incorporar}
                                disabled={!algunoSeleccionado || cargando}
                            >
                                <FiCheck size={13} /> Incorporar seleccionados {seleccionados.size > 0 && `(${seleccionados.size})`}
                            </button>
                        </div>
                    </div>
                )}

                {/* TABLA HABILITADOS */}
                {tabResultado === 'habilitados' && (
                    habilitados.length === 0 ? (
                        <div className="vyd-pp-empty">No hay candidatos sin antecedentes en este reporte.</div>
                    ) : (
                        <table className="vyd-pp-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}></th>
                                    <th>Nombre</th>
                                    <th>Documento</th>
                                    <th>Celular</th>
                                    <th>Correo</th>
                                    <th>Provincia</th>
                                    <th>Aplicación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {habilitados.map(cand => (
                                    <tr key={cand.documento_id} className={seleccionados.has(cand.documento_id) ? 'selected' : ''}>
                                        <td>
                                            <input type="checkbox" checked={seleccionados.has(cand.documento_id)} onChange={() => toggleSeleccionar(cand.documento_id)} />
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{cand.nombre_completo || '—'}</td>
                                        <td>{cand.documento_id}</td>
                                        <td>{cand.celular || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{cand.email || '—'}</td>
                                        <td>{cand.provincia || '—'}</td>
                                        <td style={{ fontSize: 11, color: 'var(--fg3)' }}>{cand.fecha_aplicacion ? cand.fecha_aplicacion.split(' ')[0] : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}

                {/* LISTA CON ANTECEDENTES */}
                {tabResultado === 'antecedentes' && (
                    conAntecedentes.length === 0 ? (
                        <div className="vyd-pp-empty">
                            <FiCheckCircle size={20} style={{ color: '#22c55e' }} />
                            <span>No hay candidatos con antecedentes bloqueantes.</span>
                        </div>
                    ) : (
                        <div className="vyd-pp-cards">
                            {conAntecedentes.map(cand => (
                                <div key={cand.documento_id} className="vyd-pp-card danger">
                                    <div className="vyd-pp-card-header" onClick={() => toggleExpandir(cand.documento_id)}>
                                        <span className="vyd-pp-card-chevron">
                                            {expandidos.has(cand.documento_id) ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                                        </span>
                                        <div className="vyd-pp-card-info">
                                            <strong>{cand.nombre_completo || '—'}</strong>
                                            <span className="mute">CC {cand.documento_id}</span>
                                            {cand.celular && <span className="mute">{cand.celular}</span>}
                                            {cand.provincia && <span className="mute">{cand.provincia}</span>}
                                        </div>
                                        <span className="vyd-pp-badge danger">{cand.antecedentes.length} registro(s)</span>
                                        <button
                                            className="vyd-btn-sm"
                                            style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,.4)', background: 'rgba(245,158,11,.08)', marginLeft: 'auto' }}
                                            onClick={e => { e.stopPropagation(); autorizar(cand); }}
                                        >
                                            Autorizar
                                        </button>
                                    </div>
                                    {expandidos.has(cand.documento_id) && (
                                        <TablaAntecedentes antecedentes={cand.antecedentes} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* LISTA CON HISTORIAL */}
                {tabResultado === 'historial' && (
                    conHistorial.length === 0 ? (
                        <div className="vyd-pp-empty">No hay candidatos con historial previo en este reporte.</div>
                    ) : (
                        <div className="vyd-pp-cards">
                            {conHistorial.map(cand => (
                                <div key={cand.documento_id} className={`vyd-pp-card${seleccionados.has(cand.documento_id) ? ' selected' : ''}`}>
                                    <div className="vyd-pp-card-header" onClick={() => toggleExpandir(cand.documento_id)}>
                                        <span className="vyd-pp-card-chevron">
                                            {expandidos.has(cand.documento_id) ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={seleccionados.has(cand.documento_id)}
                                            onChange={() => toggleSeleccionar(cand.documento_id)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ marginRight: 4 }}
                                        />
                                        <div className="vyd-pp-card-info">
                                            <strong>{cand.nombre_completo || '—'}</strong>
                                            <span className="mute">CC {cand.documento_id}</span>
                                            {cand.celular && <span className="mute">{cand.celular}</span>}
                                        </div>
                                        <span className="vyd-pp-badge orange">{cand.antecedentes.length} registro(s)</span>
                                    </div>
                                    {expandidos.has(cand.documento_id) && (
                                        <TablaAntecedentes antecedentes={cand.antecedentes} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Acciones inferiores */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="vyd-btn-sm" onClick={reiniciar}>
                    <FiRefreshCw size={13} /> Cargar otro reporte
                </button>
            </div>
        </div>
    );
};

export default Pandape;
