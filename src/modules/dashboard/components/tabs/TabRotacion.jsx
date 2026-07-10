import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    LineChart, Line, ResponsiveContainer, Cell, Brush,
} from 'recharts';
import Swal from 'sweetalert2';
import api from '../../../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtN = n =>
    n == null ? '—' : new Intl.NumberFormat('es-CO').format(n);

const fmtCOP = n =>
    n == null || isNaN(n) ? '—' :
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = n =>
    n == null || isNaN(n) ? '—' : `${Number(n).toFixed(2)}%`;

const rotColor = pct => {
    if (pct >= 10) return { bg: 'rgba(239,68,68,.18)',  fg: '#ef4444' };
    if (pct >= 5)  return { bg: 'rgba(249,115,22,.18)', fg: '#f97316' };
    return              { bg: 'rgba(34,197,94,.18)',  fg: '#22c55e' };
};

const MOTIVO_SHORT = {
    'RENUNCIA VOLUNTARIA':                           'Renuncia voluntaria',
    'TERMINACION CONTRATO TERMINO FIJO':             'Fin contrato fijo',
    'TERMINACION CONTRATO APRENDIZAJE':              'Fin aprendizaje',
    'TERMINACION CONTRATO TERMINO FIJO INDEMNIZA':   'Fin contrato (indem.)',
    'TERMINACION SIN JUSTA CAUSA':                   'Sin justa causa',
    'TERMINACION CON JUSTA CAUSA':                   'Con justa causa',
    'ABANDONO DEL TRABAJO':                          'Abandono',
    'FALLECIMIENTO':                                 'Fallecimiento',
    'PENSION':                                       'Pensión',
};
const shortMot = m => MOTIVO_SHORT[m] || m;

const MESES_ES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const mesLabel = m => {
    if (!m) return '';
    const i = MESES_ES.indexOf(m.toUpperCase());
    return i >= 0 ? m.charAt(0) + m.slice(1).toLowerCase() : m;
};

const _today = new Date();

const isMesFuturo = (anio, mes) => {
    if (!anio || !mes) return false;
    const y = parseInt(anio);
    if (isNaN(y)) return false;
    const m = MESES_ES.indexOf(mes.toUpperCase());
    if (m === -1) return false;
    return y > _today.getFullYear() || (y === _today.getFullYear() && m > _today.getMonth());
};

const DEFAULTS = {
    anio:   String(_today.getFullYear()),
    mes:    MESES_ES[_today.getMonth()],
    tienda: '',
    motivo: '',
    cargo:  '',
};

const filtersEqual = (a, b) =>
    a.anio === b.anio && a.mes === b.mes &&
    a.tienda === b.tienda && a.motivo === b.motivo && a.cargo === b.cargo;

// ─── TabRotacion ──────────────────────────────────────────────────────────────

const TabRotacion = () => {
    // pending = lo que el usuario está editando; applied = lo que se envió al API
    const [pending,  setPending]  = useState(DEFAULTS);
    const [applied,  setApplied]  = useState(DEFAULTS);
    const [data,     setData]     = useState(null);
    const [opts,     setOpts]     = useState({});
    const [loading,  setLoading]  = useState(true);
    const abortRef = useRef(null);

    const isDirty = !filtersEqual(pending, applied);

    // ── Carga única de opciones ───────────────────────────────────────────────
    useEffect(() => {
        api.get('dashboard/rotacion/opciones/')
            .then(res => setOpts(res.data))
            .catch(() => {});
    }, []);

    // ── Fetch de datos ────────────────────────────────────────────────────────
    const fetchData = useCallback(async (filters) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        const p = {};
        if (filters.anio)   p.anio   = filters.anio;
        if (filters.mes)    p.mes    = filters.mes;
        if (filters.tienda) p.tienda = filters.tienda;
        if (filters.motivo) p.motivo = filters.motivo;
        if (filters.cargo)  p.cargo  = filters.cargo;
        try {
            const res = await api.get('dashboard/rotacion/', { params: p, signal: abortRef.current.signal });
            setData(res.data);
        } catch (err) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
            Swal.fire({
                icon: 'error', title: 'Error',
                text: 'No se pudo cargar el dashboard de rotación.',
                toast: true, position: 'top-end', timer: 3500, showConfirmButton: false,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Carga inicial
    useEffect(() => { fetchData(DEFAULTS); }, [fetchData]);

    // ── Aplicar / Limpiar ────────────────────────────────────────────────────
    const handleApply = useCallback(() => {
        setApplied({ ...pending });
        fetchData(pending);
    }, [pending, fetchData]);

    const handleClear = useCallback(() => {
        setPending(DEFAULTS);
        setApplied(DEFAULTS);
        fetchData(DEFAULTS);
    }, [fetchData]);

    // Click en tienda aplica directo (igual que Ausentismo)
    const handleTiendaClick = useCallback((name) => {
        if (name === '__TOTAL__') return;
        setPending(f => {
            const next = { ...f, tienda: f.tienda === name ? '' : name };
            setApplied(next);
            fetchData(next);
            return next;
        });
    }, [fetchData]);

    const handleCargoClick = useCallback((cargo) => {
        setPending(f => {
            const next = { ...f, cargo: f.cargo === cargo ? '' : cargo };
            setApplied(next);
            fetchData(next);
            return next;
        });
    }, [fetchData]);

    // ── Datos derivados ───────────────────────────────────────────────────────
    const k          = data?.kpis            ?? {};
    const kr         = data?.kpis_referencia ?? {};
    const tabTiendas = data?.tabla_tiendas   ?? [];
    const tabMotivos = data?.tabla_motivos   ?? [];
    const tabCargos  = data?.tabla_cargos    ?? [];
    const detalle    = data?.detalle         ?? [];
    const tendencia  = data?.tendencia       ?? [];

    const anios    = opts.anios_disponibles   ?? [];
    const meses    = opts.meses_disponibles   ?? [];
    const tiendas  = opts.tiendas_disponibles ?? [];
    const motivos  = opts.motivos_disponibles ?? [];

    const chartDataTiendas = useMemo(() =>
        tabTiendas.filter(r => r.tienda !== '__TOTAL__' && r.retiros > 0).slice(0, 15),
    [tabTiendas]);

    const totRow = tabTiendas.find(r => r.tienda === '__TOTAL__');
    const rotC   = rotColor(k.indice_rotacion ?? 0);

    const tieneFiltroActivo = applied.tienda || applied.cargo || applied.motivo ||
        applied.anio !== DEFAULTS.anio || applied.mes !== DEFAULTS.mes;

    return (
        <div className="dnm-tab-body">

            {/* ── Filtros ──────────────────────────────────────────────────── */}
            <div className="dnm-filters">
                <select
                    className="dnm-select"
                    value={pending.anio}
                    onChange={e => {
                        const newAnio = e.target.value;
                        setPending(f => {
                            const mes = isMesFuturo(newAnio, f.mes) ? MESES_ES[_today.getMonth()] : f.mes;
                            return { ...f, anio: newAnio, mes };
                        });
                    }}
                >
                    {anios.length === 0 && <option value={pending.anio}>{pending.anio}</option>}
                    {anios.map(a => <option key={a} value={String(a)}>{a}</option>)}
                </select>
                <select
                    className="dnm-select"
                    value={pending.mes}
                    onChange={e => setPending(f => ({ ...f, mes: e.target.value }))}
                >
                    {meses.length === 0 && <option value={pending.mes}>{mesLabel(pending.mes)}</option>}
                    {meses.map(m => {
                        const futuro = isMesFuturo(pending.anio, m);
                        return (
                            <option key={m} value={m} disabled={futuro}
                                style={futuro ? { color: 'var(--fg3)' } : undefined}>
                                {mesLabel(m)}
                            </option>
                        );
                    })}
                </select>
                <select
                    className="dnm-select"
                    value={pending.tienda}
                    onChange={e => setPending(f => ({ ...f, tienda: e.target.value }))}
                >
                    <option value="">Todas las tiendas</option>
                    {tiendas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                    className="dnm-select"
                    value={pending.motivo}
                    onChange={e => setPending(f => ({ ...f, motivo: e.target.value }))}
                >
                    <option value="">Todos los motivos</option>
                    {motivos.map(m => <option key={m} value={m}>{shortMot(m)}</option>)}
                </select>

                {isDirty && (
                    <button className="dnm-apply-btn dnm-apply-btn--dirty" onClick={handleApply}>
                        Aplicar filtros
                    </button>
                )}
                {tieneFiltroActivo && !isDirty && (
                    <button className="dnm-clear-btn" onClick={handleClear}>
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* ── Banners de filtros activos ─────────────────────────────── */}
            {(applied.tienda || applied.cargo) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {applied.tienda && (
                        <div className="dnm-emp-banner">
                            <span>Tienda:</span>
                            <strong>{applied.tienda}</strong>
                            <button className="dnm-emp-banner-close" onClick={() => {
                                const next = { ...pending, tienda: '' };
                                setPending(next); setApplied(next); fetchData(next);
                            }}>×</button>
                        </div>
                    )}
                    {applied.cargo && (
                        <div className="dnm-emp-banner">
                            <span>Cargo:</span>
                            <strong>{applied.cargo}</strong>
                            <button className="dnm-emp-banner-close" onClick={() => {
                                const next = { ...pending, cargo: '' };
                                setPending(next); setApplied(next); fetchData(next);
                            }}>×</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Contenido ─────────────────────────────────────────────────── */}
            {loading ? (
                <div className="dnm-loading">
                    <span className="dnm-spinner" /> Cargando datos de rotación...
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* ── KPIs de referencia global ───────────────────────────── */}
                    {kr.mes_ref > 0 && (() => {
                        const mNom   = MESES_ES[kr.mes_ref - 1] ?? '';
                        const rcMes  = rotColor(kr.rotacion_mensual   ?? 0);
                        const rcAnio = rotColor(kr.rotacion_anual     ?? 0);
                        const rcAcum = rotColor(kr.rotacion_acumulada ?? 0);
                        return (
                            <div className="dnm-nom-kpis-row2">
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">
                                        <span style={{ display:'inline-block', background:rcMes.bg, color:rcMes.fg, padding:'3px 14px', borderRadius:8, fontWeight:900 }}>
                                            {fmtPct(kr.rotacion_mensual)}
                                        </span>
                                    </div>
                                    <div className="vyd-kpi-lbl">Rotación Mensual</div>
                                    <div style={{ fontSize:11, color:'var(--fg4)', marginTop:2 }}>
                                        {mesLabel(mNom)} {kr.anio_ref} · {fmtN(kr.retiros_mensual)} retiros
                                    </div>
                                </div>
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">
                                        <span style={{ display:'inline-block', background:rcAnio.bg, color:rcAnio.fg, padding:'3px 14px', borderRadius:8, fontWeight:900 }}>
                                            {fmtPct(kr.rotacion_anual)}
                                        </span>
                                    </div>
                                    <div className="vyd-kpi-lbl">Rotación Anual</div>
                                    <div style={{ fontSize:11, color:'var(--fg4)', marginTop:2 }}>
                                        Año {kr.anio_ref} · {fmtN(kr.retiros_anual)} retiros
                                    </div>
                                </div>
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">
                                        <span style={{ display:'inline-block', background:rcAcum.bg, color:rcAcum.fg, padding:'3px 14px', borderRadius:8, fontWeight:900 }}>
                                            {fmtPct(kr.rotacion_acumulada)}
                                        </span>
                                    </div>
                                    <div className="vyd-kpi-lbl">Rotación Acumulada</div>
                                    <div style={{ fontSize:11, color:'var(--fg4)', marginTop:2 }}>
                                        Ene–{mesLabel(mNom).slice(0,3)} {kr.anio_ref} · {fmtN(kr.retiros_acumulada)} retiros
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── KPIs del período filtrado ───────────────────────────── */}
                    <div className="dnm-nom-kpis-row2">
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">
                                <span style={{ display:'inline-block', background:rotC.bg, color:rotC.fg, padding:'3px 14px', borderRadius:8, fontWeight:900 }}>
                                    {fmtPct(k.indice_rotacion)}
                                </span>
                            </div>
                            <div className="vyd-kpi-lbl">Índice de Rotación</div>
                        </div>
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">{fmtN(k.total_retiros)}</div>
                            <div className="vyd-kpi-lbl">Retiros en el período</div>
                        </div>
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">{fmtN(k.total_activos)}</div>
                            <div className="vyd-kpi-lbl">Activos al cierre</div>
                        </div>
                    </div>

                    <div className="dnm-nom-kpis-row2">
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">{k.pct_renuncia}%</div>
                            <div className="vyd-kpi-lbl">Renuncia voluntaria ({k.ret_renuncia})</div>
                        </div>
                        <div className="vyd-kpi mute">
                            <div className="vyd-kpi-num">{k.pct_terminacion}%</div>
                            <div className="vyd-kpi-lbl">Fin de contrato ({k.ret_terminacion})</div>
                        </div>
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">
                                {k.avg_antiguedad_anios}{' '}
                                <small style={{ fontSize:13, fontWeight:400, color:'var(--fg3)' }}>años</small>
                            </div>
                            <div className="vyd-kpi-lbl">Antigüedad prom. retirados</div>
                        </div>
                    </div>

                    {/* ── Gráfico barras: rotación por tienda ─────────────────── */}
                    {chartDataTiendas.length > 0 && (
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Rotación por Tienda
                                    <span className="dnm-table-count">{chartDataTiendas.length}</span>
                                </div>
                            </div>
                            <div className="dnm-chart-wrap">
                                <ResponsiveContainer width="100%" height={Math.max(180, chartDataTiendas.length * 30)}>
                                    <BarChart layout="vertical" data={chartDataTiendas} margin={{ top:4, right:50, left:8, bottom:4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize:10, fill:'var(--fg3)' }} unit="%" domain={[0,'auto']} />
                                        <YAxis type="category" dataKey="tienda" tick={{ fontSize:10, fill:'var(--fg2)' }} width={160} />
                                        <Tooltip
                                            contentStyle={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                                            formatter={(v, name) => [
                                                name === 'indice_rotacion' ? `${v}%` : fmtN(v),
                                                name === 'indice_rotacion' ? 'Índice rotación' : 'Retiros',
                                            ]}
                                        />
                                        <Bar dataKey="indice_rotacion" radius={[0,4,4,0]} maxBarSize={22}>
                                            {chartDataTiendas.map((r, i) => {
                                                const c = rotColor(r.indice_rotacion);
                                                return <Cell key={i} fill={c.fg} fillOpacity={0.82} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── Dos columnas: Por Tienda + Por Motivo ────────────────── */}
                    <div className="dnm-two-col">

                        {/* Tabla por tienda */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Por Tienda
                                    <span className="dnm-table-count">
                                        {tabTiendas.filter(r => r.tienda !== '__TOTAL__').length}
                                    </span>
                                </div>
                            </div>
                            <div className="dnm-table-wrap">
                                <table className="dnm-table">
                                    <thead>
                                        <tr>
                                            <th>Tienda</th>
                                            <th>Activos</th>
                                            <th>Retiros</th>
                                            <th>% Rot.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabTiendas.filter(r => r.tienda !== '__TOTAL__').map(r => {
                                            const rc = rotColor(r.indice_rotacion);
                                            return (
                                                <tr
                                                    key={r.tienda}
                                                    className={`dnm-row-clickable${applied.tienda === r.tienda ? ' dnm-row-selected' : ''}`}
                                                    onClick={() => handleTiendaClick(r.tienda)}
                                                >
                                                    <td>{r.tienda}</td>
                                                    <td>{fmtN(r.activos)}</td>
                                                    <td>{fmtN(r.retiros)}</td>
                                                    <td>
                                                        <span className="dnm-pct-badge" style={{ background:rc.bg, color:rc.fg }}>
                                                            {fmtPct(r.indice_rotacion)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {totRow && (() => {
                                        const rc = rotColor(totRow.indice_rotacion);
                                        return (
                                            <tfoot>
                                                <tr>
                                                    <th>Total</th>
                                                    <th>{fmtN(totRow.activos)}</th>
                                                    <th>{fmtN(totRow.retiros)}</th>
                                                    <th>
                                                        <span className="dnm-pct-badge" style={{ background:rc.bg, color:rc.fg }}>
                                                            {fmtPct(totRow.indice_rotacion)}
                                                        </span>
                                                    </th>
                                                </tr>
                                            </tfoot>
                                        );
                                    })()}
                                </table>
                            </div>
                        </div>

                        {/* Motivos con barras visuales */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Por Motivo de Retiro
                                    <span className="dnm-table-count">{tabMotivos.length}</span>
                                </div>
                            </div>
                            <div style={{ padding:'4px 16px 16px', display:'flex', flexDirection:'column', gap:14 }}>
                                {tabMotivos.map(r => (
                                    <div key={r.motivo}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5, gap:8 }}>
                                            <span style={{ fontSize:12, color:'var(--fg2)', fontWeight:600, flex:1 }}>
                                                {shortMot(r.motivo)}
                                            </span>
                                            <span style={{ fontSize:12, fontWeight:700, color:'var(--fg1)', flexShrink:0 }}>
                                                {r.cantidad}{' '}
                                                <span style={{ color:'var(--fg3)', fontWeight:400 }}>· {fmtPct(r.pct)}</span>
                                            </span>
                                        </div>
                                        <div style={{ height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
                                            <div style={{ width:`${r.pct}%`, height:'100%', background:'var(--accent)', borderRadius:4, transition:'width .5s ease' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Tendencia mensual ────────────────────────────────────── */}
                    {tendencia.length > 1 && (
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">Tendencia de Rotación Mensual</div>
                            </div>
                            <div className="dnm-chart-wrap">
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={tendencia} margin={{ top:8, right:30, left:0, bottom:4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="label" tick={{ fontSize:11, fill:'var(--fg3)' }} />
                                        <YAxis tick={{ fontSize:11, fill:'var(--fg3)' }} unit="%" />
                                        <Tooltip
                                            contentStyle={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                                            formatter={(v, name) => [
                                                name === 'indice' ? `${v}%` : fmtN(v),
                                                name === 'indice' ? 'Índice' : 'Retiros',
                                            ]}
                                        />
                                        <Line type="monotone" dataKey="indice" stroke="var(--accent)" strokeWidth={2} dot={{ r:4 }} activeDot={{ r:6 }} name="indice" />
                                        <Brush
                                            dataKey="label"
                                            height={22}
                                            stroke="var(--border2)"
                                            fill="var(--surface)"
                                            travellerWidth={8}
                                            startIndex={Math.max(0, tendencia.length - 12)}
                                            endIndex={tendencia.length - 1}
                                            tickFormatter={() => ''}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── Tabla por cargo (top 15) ─────────────────────────────── */}
                    {tabCargos.length > 0 && (
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Por Cargo
                                    <span className="dnm-table-count">Top {tabCargos.length}</span>
                                    {applied.cargo && (
                                        <span style={{ fontSize:11, fontWeight:400, color:'var(--accent)', marginLeft:6 }}>
                                            · filtrando por {applied.cargo}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="dnm-table-wrap" style={{ maxHeight:280 }}>
                                <table className="dnm-table">
                                    <thead>
                                        <tr>
                                            <th>Cargo</th>
                                            <th>Retiros</th>
                                            <th>%</th>
                                            <th style={{ minWidth:100 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabCargos.map(r => (
                                            <tr
                                                key={r.cargo}
                                                className={`dnm-row-clickable${applied.cargo === r.cargo ? ' dnm-row-selected' : ''}`}
                                                onClick={() => handleCargoClick(r.cargo)}
                                            >
                                                <td title={r.cargo}>{r.cargo}</td>
                                                <td>{fmtN(r.cantidad)}</td>
                                                <td>
                                                    <span className="dnm-pct-badge" style={{ background:'rgba(139,92,246,.18)', color:'#a78bfa' }}>
                                                        {fmtPct(r.pct)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                                                        <div style={{ width:`${r.pct}%`, height:'100%', background:'#8b5cf6', borderRadius:3 }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Detalle empleados retirados ──────────────────────────── */}
                    <div className="vyd-panel">
                        <div className="vyd-panel-head">
                            <div className="vyd-panel-title">
                                Detalle Empleados Retirados
                                <span className="dnm-table-count">{detalle.length}</span>
                            </div>
                        </div>
                        <div className="dnm-table-wrap" style={{ maxHeight:380 }}>
                            <table className="dnm-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Cargo</th>
                                        <th>Tienda</th>
                                        <th>Motivo</th>
                                        <th>F. Ingreso</th>
                                        <th>F. Retiro</th>
                                        <th>Antigüedad</th>
                                        <th>Salario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalle.map((r, i) => {
                                        const isActive =
                                            (applied.tienda || applied.cargo) &&
                                            (!applied.tienda || applied.tienda === (r.tienda || '')) &&
                                            (!applied.cargo  || applied.cargo  === (r.cargo  || ''));
                                        return (
                                            <tr key={i} className={isActive ? 'dnm-row-selected' : ''}>
                                                <td style={{ whiteSpace:'nowrap' }}>{r.nombre}</td>
                                                <td title={r.cargo}>{r.cargo}</td>
                                                <td style={{ whiteSpace:'nowrap' }}>{r.tienda}</td>
                                                <td title={r.motivo}>{shortMot(r.motivo)}</td>
                                                <td style={{ whiteSpace:'nowrap' }}>{r.fecha_ingreso}</td>
                                                <td style={{ whiteSpace:'nowrap' }}>{r.fecha_retiro}</td>
                                                <td style={{ whiteSpace:'nowrap' }}>{r.antiguedad_anios} años</td>
                                                <td style={{ whiteSpace:'nowrap' }}>{r.salario ? fmtCOP(r.salario) : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default TabRotacion;
