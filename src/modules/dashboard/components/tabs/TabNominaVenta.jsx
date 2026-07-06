import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from 'recharts';
import Swal from 'sweetalert2';
import api from '../../../../services/api';

// ─── Helpers de formato ───────────────────────────────────────────────────────

const fmtCOP = (n) =>
    n == null || isNaN(n) ? '—' :
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = (n) =>
    n == null || isNaN(n) ? '—' : `${Number(n).toFixed(2)}%`;

const Delta = ({ value, suffix = '%' }) => {
    if (value == null) return <span className="dnm-delta-nil">—</span>;
    const abs = Math.abs(value).toFixed(suffix === '%' ? 2 : 0);
    if (value > 0) return <span className="dnm-delta-up">▲ {abs}{suffix}</span>;
    if (value < 0) return <span className="dnm-delta-down">▼ {abs}{suffix}</span>;
    return <span className="dnm-delta-nil">— 0{suffix}</span>;
};

const pctColor = (pct) => ({
    background: pct > 15 ? '#ef444433' : pct > 10 ? '#f9731633' : '#22c55e33',
    color:      pct > 15 ? '#ef4444'   : pct > 10 ? '#f97316'   : '#22c55e',
});

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="dnm-chart-tooltip">
            <p className="dnm-chart-tooltip-label">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: {p.name?.includes('%') ? fmtPct(p.value) : fmtCOP(p.value)}
                </p>
            ))}
        </div>
    );
};

// ─── Constante ───────────────────────────────────────────────────────────────

const INIT = { mes: '', anio: '', tienda: '' };

// ─── Componente ──────────────────────────────────────────────────────────────

const TabNominaVenta = () => {
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [refetching, setRefetch]= useState(false);
    const [filters, setFilters]   = useState(INIT);

    const reqIdRef  = useRef(0);
    const hasDataRef= useRef(false);

    const fetchData = useCallback(async (params) => {
        const reqId = ++reqIdRef.current;
        if (hasDataRef.current) setRefetch(true);
        else                    setLoading(true);
        try {
            const res = await api.get('dashboard/nomina-venta/', { params });
            if (reqId !== reqIdRef.current) return;
            hasDataRef.current = true;
            setData(res.data);
        } catch {
            if (reqId !== reqIdRef.current) return;
            Swal.fire({
                icon: 'error', title: 'Error',
                text: 'No se pudo cargar el dashboard de nómina sobre venta.',
                toast: true, position: 'top-end', timer: 3500, showConfirmButton: false,
            });
        } finally {
            if (reqId === reqIdRef.current) { setLoading(false); setRefetch(false); }
        }
    }, []);

    useEffect(() => {
        const params = {};
        if (filters.mes)    params.mes    = filters.mes;
        if (filters.anio)   params.anio   = filters.anio;
        if (filters.tienda) params.tienda = filters.tienda;
        fetchData(params);
    }, [filters, fetchData]);

    const handleTiendaClick = useCallback((name) => {
        setFilters(f => ({ ...f, tienda: f.tienda === name ? '' : name }));
    }, []);

    // ── Datos derivados ───────────────────────────────────────────────────────
    const opts    = data ?? {};
    const k       = opts.kpis ?? {};
    const meses   = opts.meses_disponibles   ?? [];
    const anios   = opts.anios_disponibles   ?? [];
    const tiendas = opts.tiendas_disponibles ?? [];
    const tendencia     = opts.tendencia          ?? [];
    const tablaTiendas  = opts.tabla_tiendas      ?? [];
    const novedadesTda  = opts.novedades_tienda   ?? [];
    const compMensual   = opts.comparacion_mensual ?? [];

    // Pivot para tabla matricial de comparación mensual
    const { mesesComp, tiendasComp, pivotComp } = useMemo(() => {
        if (!compMensual.length) return { mesesComp: [], tiendasComp: [], pivotComp: {} };
        const MN = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
        const mesMap = {}, tiendaOrder = [], tiendaSeen = new Set(), piv = {};
        compMensual.forEach(r => {
            const key = r.label;
            if (!mesMap[key]) {
                const parts = (r.label || '').split(' ');
                mesMap[key] = { label: key, anio: Number(parts[1]) || 0, mesNum: MN[parts[0]?.toLowerCase()] || 0 };
            }
            if (!tiendaSeen.has(r.tienda)) { tiendaSeen.add(r.tienda); tiendaOrder.push(r.tienda); }
            if (!piv[r.tienda]) piv[r.tienda] = {};
            piv[r.tienda][key] = r;
        });
        const sortedMeses = Object.values(mesMap).sort((a, b) => a.anio - b.anio || a.mesNum - b.mesNum).map(m => m.label);
        return { mesesComp: sortedMeses, tiendasComp: tiendaOrder, pivotComp: piv };
    }, [compMensual]);

    const hasFilters = filters.mes || filters.anio || filters.tienda;

    return (
        <div className="dnm-tab-body">

            {/* ── Filtros ─────────────────────────────────────────────────── */}
            <div className="dnm-filters">
                <select value={filters.mes} onChange={e => setFilters(f => ({ ...f, mes: e.target.value }))} className="dnm-select">
                    <option value="">Todos los meses</option>
                    {meses.map(m => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
                </select>
                <select value={filters.anio} onChange={e => setFilters(f => ({ ...f, anio: e.target.value }))} className="dnm-select">
                    <option value="">Todos los años</option>
                    {anios.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={filters.tienda} onChange={e => setFilters(f => ({ ...f, tienda: e.target.value }))} className="dnm-select">
                    <option value="">Todas las tiendas</option>
                    {tiendas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {hasFilters && (
                    <button className="dnm-clear-btn" onClick={() => setFilters(INIT)}>
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* ── Banner tienda seleccionada ───────────────────────────────── */}
            {filters.tienda && (
                <div className="dnm-emp-banner" style={{
                    borderLeftColor: '#FFE302',
                    background: 'linear-gradient(135deg, rgba(255,227,2,.10), rgba(255,227,2,.03))',
                    borderColor: 'rgba(255,227,2,.28)',
                }}>
                    <span>🏬 Tienda seleccionada:</span>
                    <strong>{filters.tienda}</strong>
                    <button className="dnm-emp-banner-close"
                        onClick={() => setFilters(f => ({ ...f, tienda: '' }))}
                        title="Quitar filtro de tienda">×</button>
                </div>
            )}

            {/* ── Contenido ────────────────────────────────────────────────── */}
            {loading ? (
                <div className="dnm-loading"><span className="dnm-spinner" /> Cargando datos...</div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {refetching && <div className="dnm-progress-bar-anim" />}
                    <div style={{
                        opacity: refetching ? 0.6 : 1,
                        transition: 'opacity .3s',
                        pointerEvents: refetching ? 'none' : 'auto',
                        display: 'flex', flexDirection: 'column', gap: '20px',
                    }}>

                        {/* ── KPIs fila 1: montos ──────────────────────────── */}
                        <div className="vyd-kpis">
                            <div className="vyd-kpi danger">
                                <div className="vyd-kpi-num">{fmtCOP(k.nomina_total)}</div>
                                <div className="vyd-kpi-lbl">Nómina Total Compañía</div>
                            </div>
                            <div className="vyd-kpi">
                                <div className="vyd-kpi-num">{fmtCOP(k.venta_total)}</div>
                                <div className="vyd-kpi-lbl">Venta Total</div>
                            </div>
                            <div className="vyd-kpi">
                                <div className="vyd-kpi-num">{fmtCOP(k.venta_tiendas)}</div>
                                <div className="vyd-kpi-lbl">Venta De Las Tiendas</div>
                            </div>
                            <div className="vyd-kpi mute">
                                <div className="vyd-kpi-num">{fmtCOP(k.venta_omnicanal)}</div>
                                <div className="vyd-kpi-lbl">Ventas de Omnicanal</div>
                            </div>
                        </div>

                        {/* ── KPIs fila 2: porcentajes ─────────────────────── */}
                        <div className="dnm-nom-kpis-row2">
                            <div className="vyd-kpi danger">
                                <div className="vyd-kpi-num">{fmtPct(k.pct_nom_venta)}</div>
                                <div className="vyd-kpi-lbl">% De La Nómina Sobre La Venta</div>
                            </div>
                            <div className="vyd-kpi">
                                <div className="vyd-kpi-num">{fmtPct(k.pct_tiendas_venta)}</div>
                                <div className="vyd-kpi-lbl">% Tiendas Sobre La Venta</div>
                            </div>
                            <div className="vyd-kpi mute">
                                <div className="vyd-kpi-num">{fmtPct(k.pct_omnicanal_venta)}</div>
                                <div className="vyd-kpi-lbl">% Omnicanal Sobre La Venta</div>
                            </div>
                        </div>

                        {/* ── Fila 1: Nómina vs Ventas por Tienda (ancho completo) ── */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Nómina vs Ventas por Tienda
                                    <span className="dnm-table-count">
                                        {tablaTiendas.filter(r => r.tienda !== '__TOTAL__').length}
                                    </span>
                                </div>
                            </div>
                            <div className="dnm-table-wrap" style={{ maxHeight: 360 }}>
                                <table className="dnm-table">
                                    <thead>
                                        <tr>
                                            <th>Tienda</th>
                                            <th>Venta Total</th>
                                            <th>Venta Física</th>
                                            <th>Venta Omnicanal</th>
                                            <th>Nómina</th>
                                            <th>% Nóm/Venta</th>
                                            <th>% Tiendas</th>
                                            <th>% Omnicanal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tablaTiendas.filter(r => r.tienda !== '__TOTAL__').map((r, i) => {
                                            const isDirec  = ['ADMINISTRACIÓN','CEDI','DESPOSTAR','OMNICANAL'].includes(r.tienda);
                                            const selected = filters.tienda === r.tienda;
                                            const rowCls = [
                                                'dnm-row-clickable',
                                                selected ? 'dnm-row-selected' : '',
                                                isDirec  ? 'dnm-row-direc'   : '',
                                            ].filter(Boolean).join(' ');
                                            return (
                                                <tr key={i} className={rowCls}
                                                    onClick={() => handleTiendaClick(r.tienda)}
                                                    title={`Filtrar por ${r.tienda}`}>
                                                    <td title={r.tienda}>{r.tienda}</td>
                                                    <td>{fmtCOP(r.venta_total_row)}</td>
                                                    <td>{fmtCOP(r.venta_tiendas_row)}</td>
                                                    <td>{fmtCOP(r.venta_omnicanal_row)}</td>
                                                    <td>{fmtCOP(r.nomina)}</td>
                                                    <td>{r.pct_nom > 0 ? <span className="dnm-pct-badge" style={pctColor(r.pct_nom)}>{fmtPct(r.pct_nom)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{r.pct_tda > 0 ? <span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(r.pct_tda)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{r.pct_omn > 0 ? <span className="dnm-pct-badge" style={{ background: 'rgba(168,85,247,.15)', color: '#a855f7' }}>{fmtPct(r.pct_omn)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {(() => { const t = tablaTiendas.find(r => r.tienda === '__TOTAL__'); return t ? (
                                        <tfoot><tr>
                                            <td><strong>Total</strong></td>
                                            <td><strong>{fmtCOP(t.venta_total_row)}</strong></td>
                                            <td><strong>{fmtCOP(t.venta_tiendas_row)}</strong></td>
                                            <td><strong>{fmtCOP(t.venta_omnicanal_row)}</strong></td>
                                            <td><strong>{fmtCOP(t.nomina)}</strong></td>
                                            <td>{t.pct_nom > 0 ? <span className="dnm-pct-badge" style={pctColor(t.pct_nom)}>{fmtPct(t.pct_nom)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                            <td>{t.pct_tda > 0 ? <span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(t.pct_tda)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                            <td>{t.pct_omn > 0 ? <span className="dnm-pct-badge" style={{ background: 'rgba(168,85,247,.15)', color: '#a855f7' }}>{fmtPct(t.pct_omn)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                        </tr></tfoot>
                                    ) : null; })()}
                                </table>
                            </div>
                        </div>

                        {/* ── Fila 2: Tendencia (izq) | Novedades por Tienda (der) ── */}
                        <div className="dnm-nom-mid-grid">

                            {/* Tendencia */}
                            <div className="vyd-panel">
                                <div className="vyd-panel-head">
                                    <div className="vyd-panel-title">Tendencia % Nómina sobre la Venta</div>
                                </div>
                                <div className="dnm-chart-wrap" style={{ height: 320 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={tendencia} margin={{ top: 8, right: 16, left: 0, bottom: 56 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                                            <XAxis dataKey="label"
                                                tick={{ fill: 'var(--fg3)', fontSize: 10 }}
                                                angle={-40} textAnchor="end" interval={0} />
                                            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'var(--fg3)', fontSize: 10 }} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Line type="monotone" dataKey="pct" name="% Nóm/Venta"
                                                stroke="var(--accent)" strokeWidth={2}
                                                dot={{ r: 4, fill: 'var(--accent)' }}
                                                activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Novedades por tienda */}
                            <div className="vyd-panel">
                                <div className="vyd-panel-head">
                                    <div className="vyd-panel-title">
                                        Novedades por Tienda
                                        <span className="dnm-table-count">
                                            {novedadesTda.filter(r => r.tienda !== '__TOTAL__').length}
                                        </span>
                                    </div>
                                </div>
                                <div className="dnm-table-wrap" style={{ maxHeight: 320 }}>
                                    <table className="dnm-table">
                                        <thead>
                                            <tr>
                                                <th>Tienda</th>
                                                <th>Nómina</th>
                                                <th>Novedades</th>
                                                <th>% Nov/Nóm</th>
                                                <th>Horas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {novedadesTda.filter(r => r.tienda !== '__TOTAL__').map((r, i) => {
                                                const isDirec  = ['ADMINISTRACIÓN','CEDI','DESPOSTAR','OMNICANAL'].includes(r.tienda);
                                                const selected = filters.tienda === r.tienda;
                                                const rowCls = ['dnm-row-clickable', selected ? 'dnm-row-selected' : '', isDirec ? 'dnm-row-direc' : ''].filter(Boolean).join(' ');
                                                return (
                                                    <tr key={i} className={rowCls}
                                                        onClick={() => handleTiendaClick(r.tienda)}
                                                        title={`Filtrar por ${r.tienda}`}>
                                                        <td title={r.tienda}>{r.tienda}</td>
                                                        <td>{fmtCOP(r.nomina)}</td>
                                                        <td>{fmtCOP(r.novedades)}</td>
                                                        <td><span className="dnm-pct-badge" style={pctColor(r.pct_novedades)}>{fmtPct(r.pct_novedades)}</span></td>
                                                        <td>{r.horas != null ? Number(r.horas).toFixed(1) : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {(() => { const t = novedadesTda.find(r => r.tienda === '__TOTAL__'); return t ? (
                                            <tfoot><tr>
                                                <td><strong>Total</strong></td>
                                                <td><strong>{fmtCOP(t.nomina)}</strong></td>
                                                <td><strong>{fmtCOP(t.novedades)}</strong></td>
                                                <td><span className="dnm-pct-badge" style={pctColor(t.pct_novedades)}>{fmtPct(t.pct_novedades)}</span></td>
                                                <td><strong>{t.horas != null ? Number(t.horas).toFixed(1) : '—'}</strong></td>
                                            </tr></tfoot>
                                        ) : null; })()}
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ── Fila 3: Comparación Mensual (ancho completo) ── */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Comparación Mensual Tienda Conceptos Novedades
                                    <span className="dnm-table-count">
                                        {tiendasComp.filter(t => t !== '__TOTAL__').length} tiendas · {mesesComp.length} meses
                                    </span>
                                </div>
                            </div>
                            <div className="dnm-table-wrap dnm-comp-wrap">
                                <table className="dnm-table dnm-table-comp">
                                    <thead>
                                        <tr>
                                            <th className="dnm-comp-tienda-th" rowSpan={2}>Tienda</th>
                                            {mesesComp.map(mes => (
                                                <th key={mes} colSpan={5} className="dnm-comp-mes-th">{mes}</th>
                                            ))}
                                        </tr>
                                        <tr>
                                            {mesesComp.map(mes => (
                                                ['Nómina','Nóm. Nov.','% Peso','Var %','Var $'].map(sub => (
                                                    <th key={`${mes}-${sub}`} className="dnm-comp-sub-th">{sub}</th>
                                                ))
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tiendasComp.filter(t => t !== '__TOTAL__').map((tienda, i) => {
                                            const isDirec  = ['ADMINISTRACIÓN','CEDI','DESPOSTAR','OMNICANAL'].includes(tienda);
                                            const selected = filters.tienda === tienda;
                                            const rowCls = ['dnm-row-clickable', selected ? 'dnm-row-selected' : '', isDirec ? 'dnm-row-direc' : ''].filter(Boolean).join(' ');
                                            return (
                                                <tr key={i} className={rowCls}
                                                    onClick={() => handleTiendaClick(tienda)}
                                                    title={`Filtrar por ${tienda}`}>
                                                    <td className="dnm-comp-tienda-td">{tienda}</td>
                                                    {mesesComp.map(mes => {
                                                        const d = pivotComp[tienda]?.[mes];
                                                        return (
                                                            <React.Fragment key={mes}>
                                                                <td>{d ? fmtCOP(d.nomina) : '—'}</td>
                                                                <td>{d ? fmtCOP(d.novedades) : '—'}</td>
                                                                <td>{d ? <span className="dnm-pct-badge" style={pctColor(d.pct_novedades)}>{fmtPct(d.pct_novedades)}</span> : '—'}</td>
                                                                <td><Delta value={d?.var_pct_mm} suffix="%" /></td>
                                                                <td><Delta value={d?.var_dinero_mm} suffix="" /></td>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {pivotComp['__TOTAL__'] && (
                                        <tfoot>
                                            <tr>
                                                <td className="dnm-comp-tienda-td"><strong>Total</strong></td>
                                                {mesesComp.map(mes => {
                                                    const d = pivotComp['__TOTAL__']?.[mes];
                                                    return (
                                                        <React.Fragment key={mes}>
                                                            <td><strong>{d ? fmtCOP(d.nomina) : '—'}</strong></td>
                                                            <td><strong>{d ? fmtCOP(d.novedades) : '—'}</strong></td>
                                                            <td>{d ? <span className="dnm-pct-badge" style={pctColor(d.pct_novedades)}>{fmtPct(d.pct_novedades)}</span> : '—'}</td>
                                                            <td><Delta value={d?.var_pct_mm} suffix="%" /></td>
                                                            <td><Delta value={d?.var_dinero_mm} suffix="" /></td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default TabNominaVenta;
