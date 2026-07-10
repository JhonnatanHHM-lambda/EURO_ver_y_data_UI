import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import api from '../../../../services/api';
import MultiSelect from '../../../core/MultiSelect/components/MultiSelect';

// ─── formatters ───────────────────────────────────────────────────────────────

const fmtCOP = (n) =>
    n == null || isNaN(n) ? '—' :
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtNum = (n) =>
    n == null || isNaN(n) ? '—' : new Intl.NumberFormat('es-CO').format(Math.round(n));

const fmtPct = (n) =>
    n == null || isNaN(n) ? '—' : `${Number(n).toFixed(2)}%`;

const fmtDias = (n) =>
    n == null || isNaN(n) ? '—' : Number(n).toFixed(2);

// ─── Delta (variaciones) ──────────────────────────────────────────────────────

const Delta = ({ value, suffix = '%' }) => {
    if (value == null) return <span className="dnm-delta-nil">—</span>;
    const abs = Math.abs(value).toFixed(suffix === '%' ? 2 : 0);
    if (value > 0) return <span className="dnm-delta-up">▲ {abs}{suffix}</span>;
    if (value < 0) return <span className="dnm-delta-down">▼ {abs}{suffix}</span>;
    return <span className="dnm-delta-nil">— 0{suffix}</span>;
};

// ─── Gauge de ausentismo ──────────────────────────────────────────────────────

const GAUGE_ZONES = [
    { from: 0, to: 2,  color: '#22c55e', label: 'Bajo',    desc: 'Ausentismo bajo control. Mantener medidas preventivas.' },
    { from: 2, to: 5,  color: '#FFE302', label: 'Normal',  desc: 'Nivel aceptable. Monitorear tendencias.' },
    { from: 5, to: 7,  color: '#f97316', label: 'Alto',    desc: 'Ausentismo elevado. Revisar causas e implementar planes de acción.' },
    { from: 7, to: 10, color: '#ef4444', label: 'Crítico', desc: 'Nivel crítico. Intervención inmediata requerida.' },
];

const getZone = (pct) => {
    if (pct <= 2) return GAUGE_ZONES[0];
    if (pct <= 5) return GAUGE_ZONES[1];
    if (pct <= 7) return GAUGE_ZONES[2];
    return GAUGE_ZONES[3];
};

const GaugeAusentismo = ({ pct = 0, horasTNL = 0, horasTotal = 0 }) => {
    const MAX = 10, TRACK = 22;
    const cx = 200, cy = 175, r = 140;
    const zone = getZone(pct);

    const toRad = (v) => (1 - Math.min(Math.max(v, 0), MAX) / MAX) * Math.PI;

    const arcPt = (v, radius) => {
        const θ = toRad(v);
        return { x: cx + radius * Math.cos(θ), y: cy - radius * Math.sin(θ) };
    };

    const arcPath = (v1, v2, radius) => {
        const p1 = arcPt(v1, radius), p2 = arcPt(v2, radius);
        return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    };

    const θNeedle = toRad(pct);
    const tip = arcPt(pct, r - 14);
    const bw  = 7;
    const b1  = { x: cx + bw * Math.sin(θNeedle), y: cy + bw * Math.cos(θNeedle) };
    const b2  = { x: cx - bw * Math.sin(θNeedle), y: cy - bw * Math.cos(θNeedle) };

    return (
        <div className="dnm-gauge-wrap">
            <svg viewBox="15 -5 370 195" width="100%" style={{ maxWidth: 500, display: 'block', margin: '0 auto' }}>
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {(() => {
                    const iR = r - TRACK / 2 - 2;
                    return (
                        <path
                            d={`M ${(cx - iR).toFixed(1)} ${cy} A ${iR} ${iR} 0 0 1 ${(cx + iR).toFixed(1)} ${cy} Z`}
                            fill="var(--bg-modal)"
                        />
                    );
                })()}

                <path d={arcPath(0, MAX, r)} stroke="var(--border)" strokeWidth={TRACK + 2} fill="none" strokeLinecap="butt" opacity="0.6" />

                <polygon
                    points={`${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${b1.x.toFixed(1)},${b1.y.toFixed(1)} ${b2.x.toFixed(1)},${b2.y.toFixed(1)}`}
                    fill="#7f8c9a"
                />

                {GAUGE_ZONES.map(z => {
                    const active = z === zone;
                    return (
                        <path
                            key={z.label}
                            d={arcPath(z.from, z.to, r)}
                            stroke={z.color}
                            strokeWidth={active ? TRACK + 6 : TRACK}
                            fill="none"
                            strokeLinecap="butt"
                            opacity={active ? 1 : 0.28}
                            filter={active ? 'url(#glow)' : undefined}
                        />
                    );
                })}

                {[2, 5, 7].map(v => {
                    const inner = arcPt(v, r - TRACK / 2 - 1);
                    const outer = arcPt(v, r + TRACK / 2 + 1);
                    return (
                        <line key={v}
                            x1={inner.x.toFixed(1)} y1={inner.y.toFixed(1)}
                            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
                            stroke="var(--bg-modal)" strokeWidth="2"
                        />
                    );
                })}

                {[0, 2, 5, 7, 10].map(v => {
                    const outer = arcPt(v, r + TRACK / 2 + 4);
                    const lbl   = arcPt(v, r + TRACK / 2 + 18);
                    return (
                        <g key={v}>
                            <circle cx={outer.x.toFixed(1)} cy={outer.y.toFixed(1)} r="2.5" fill="var(--fg3)" />
                            <text x={lbl.x.toFixed(1)} y={lbl.y.toFixed(1)}
                                fontSize="10" fill="var(--fg3)" textAnchor="middle" dominantBaseline="middle"
                            >{v}%</text>
                        </g>
                    );
                })}

                <circle cx={cx} cy={cy} r="13" fill="var(--bg-modal)" stroke="var(--border)" strokeWidth="1.5" />
                <circle cx={cx} cy={cy} r="6"  fill="var(--fg1)" />

                <text x={cx} y={cy - 44} textAnchor="middle" fontSize="30" fontWeight="900" fill="var(--fg1)" letterSpacing="-0.5">
                    {fmtPct(pct)}
                </text>
                <text x={cx} y={cy - 20} textAnchor="middle" fontSize="11" fontWeight="800" fill={zone.color} letterSpacing="1.5">
                    {zone.label.toUpperCase()}
                </text>
            </svg>

            <div className="dnm-gauge-formula">
                <span style={{ color: '#ef4444' }}>{fmtNum(horasTNL)}h TNL</span>
                {' ÷ '}
                <span style={{ color: 'var(--fg2)' }}>{fmtNum(horasTotal)}h totales</span>
                {' × 100 = '}
                <span style={{ color: zone.color, fontWeight: 700 }}>{fmtPct(pct)}</span>
            </div>

            <div className="dnm-gauge-legend">
                {GAUGE_ZONES.map(z => (
                    <span key={z.label} className={`dnm-gauge-chip${z === zone ? ' active' : ''}`} style={{ '--chip-color': z.color }}>
                        <span className="dnm-gauge-chip-dot" />
                        {z.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

const _hoyAus = new Date();
const isMesFuturoAus = (anio, mes) => {
    if (!anio || !mes) return false;
    const y = parseInt(anio);
    if (isNaN(y)) return false;
    const m = MESES_NOMBRES.indexOf(mes.toUpperCase());
    if (m === -1) return false;
    return y > _hoyAus.getFullYear() || (y === _hoyAus.getFullYear() && m > _hoyAus.getMonth());
};

const buildDefaults = () => {
    const now = new Date();
    return {
        mes:           MESES_NOMBRES[now.getMonth()],
        anio:          String(now.getFullYear()),
        tiendas:       [],
        tipo_concepto: '',
        desc_concepto: '',
        empleado_cc:   '',
        cargo:         '',
    };
};

const DEFAULTS = buildDefaults();

const filtersEqual = (a, b) =>
    a.mes === b.mes && a.anio === b.anio && a.tipo_concepto === b.tipo_concepto &&
    a.desc_concepto === b.desc_concepto && a.empleado_cc === b.empleado_cc &&
    a.cargo === b.cargo && JSON.stringify(a.tiendas) === JSON.stringify(b.tiendas);

const barColor = (v) => {
    if (v <= 2) return '#22c55e';
    if (v <= 5) return '#FFE302';
    if (v <= 7) return '#f97316';
    return '#ef4444';
};

const pctColor = (pct) => ({
    background: pct > 7 ? '#ef444433' : pct > 5 ? '#f9731633' : pct > 2 ? '#FFE30233' : '#22c55e33',
    color:      pct > 7 ? '#ef4444'   : pct > 5 ? '#f97316'   : pct > 2 ? '#b89000'   : '#22c55e',
});

const labelFiltroActivo = (f) => {
    const parts = [];
    if (f.mes)  parts.push(f.mes.charAt(0) + f.mes.slice(1).toLowerCase());
    if (f.anio) parts.push(f.anio);
    if (f.tiendas.length === 1) parts.push(f.tiendas[0]);
    if (f.tiendas.length > 1)  parts.push(`${f.tiendas.length} sedes`);
    if (f.tipo_concepto) parts.push(f.tipo_concepto);
    if (f.cargo) parts.push(f.cargo);
    return parts.length ? parts.join(' · ') : 'Todos los datos';
};

// ─── TabAusentismo ────────────────────────────────────────────────────────────

const TabAusentismo = () => {
    // pending: lo que el usuario está editando en los controles
    // applied: lo que se envió al API (dispara el fetch)
    const [pending,  setPending]  = useState(DEFAULTS);
    const [applied,  setApplied]  = useState(DEFAULTS);
    const [data,     setData]     = useState(null);
    const [opts,     setOpts]     = useState({});
    const [loading,  setLoading]  = useState(true);
    const [loadingOpts, setLoadingOpts] = useState(true);
    const abortRef = useRef(null);

    const isDirty = !filtersEqual(pending, applied);

    // ── Carga única de opciones de filtros ────────────────────────────────────
    useEffect(() => {
        api.get('dashboard/ausentismo/opciones/')
            .then(res => setOpts(res.data))
            .catch(() => {/* silencioso: las opciones son de comodidad */})
            .finally(() => setLoadingOpts(false));
    }, []);

    // ── Carga de datos al aplicar filtros ────────────────────────────────────
    const fetchData = useCallback(async (filters, isInitialLoad = false) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        const p = {};
        if (filters.mes)            p.mes                   = filters.mes;
        if (filters.anio)           p.anio                  = filters.anio;
        if (filters.tiendas.length) p.tiendas               = filters.tiendas.join(',');
        if (filters.tipo_concepto)  p.tipo_concepto         = filters.tipo_concepto;
        if (filters.desc_concepto)  p.descripcion_concepto  = filters.desc_concepto;
        if (filters.empleado_cc)    p.empleado_cc           = filters.empleado_cc;
        if (filters.cargo)          p.cargo                 = filters.cargo;

        try {
            const res = await api.get('dashboard/ausentismo/', {
                params: p,
                signal: abortRef.current.signal,
            });

            if (isInitialLoad && res.data?.ultimo_periodo_con_datos) {
                const ult = res.data.ultimo_periodo_con_datos;
                const periodoOk = ult.mes === filters.mes && ult.anio === filters.anio;
                if (!periodoOk) {
                    const fallback = { ...filters, mes: ult.mes, anio: ult.anio };
                    setPending(fallback);
                    setApplied(fallback);
                    Swal.fire({
                        icon: 'info',
                        title: 'Período en curso sin datos completos',
                        text: `Mostrando el último período disponible: ${ult.mes.charAt(0) + ult.mes.slice(1).toLowerCase()} ${ult.anio}`,
                        toast: true,
                        position: 'top-end',
                        timer: 4500,
                        showConfirmButton: false,
                    });
                    fetchData(fallback);
                    return;
                }
            }

            setData(res.data);
        } catch (err) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el dashboard de ausentismo.', toast: true, position: 'top-end', timer: 3500, showConfirmButton: false });
        } finally {
            setLoading(false);
        }
    }, []);

    // Carga inicial con los defaults (mes y año en curso)
    useEffect(() => {
        fetchData(DEFAULTS, true);
    }, [fetchData]);

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

    // Click en fila de tienda aplica directamente (sigue funcionando como antes)
    const handleTiendaClick = useCallback((name) => {
        setPending(f => {
            const tiendas = f.tiendas.includes(name)
                ? f.tiendas.filter(t => t !== name)
                : [...f.tiendas, name];
            const next = { ...f, tiendas };
            setApplied(next);
            fetchData(next);
            return next;
        });
    }, [fetchData]);

    // ── Datos desestructurados ────────────────────────────────────────────────
    const k           = data?.kpis            ?? {};
    const meses       = opts.meses_disponibles                   ?? [];
    const anios       = opts.anios_disponibles                   ?? [];
    const tiendas     = opts.tiendas_disponibles                 ?? [];
    const tiposConc   = opts.tipos_concepto_disponibles          ?? [];
    const descsConc   = opts.descripciones_concepto_disponibles  ?? [];
    const empleados   = opts.empleados_disponibles               ?? [];
    const cargos      = opts.cargos_disponibles                  ?? [];
    const tabTiendas  = data?.tabla_tiendas         ?? [];
    const tabConceptos = data?.tabla_conceptos_full ?? [];
    const tabColab    = data?.tabla_colaboradores   ?? [];
    const compAus     = data?.comparacion_mensual_aus ?? [];

    // Pivot comparación mensual
    const { mesesComp, tiendasComp, pivotComp } = useMemo(() => {
        if (!compAus.length) return { mesesComp: [], tiendasComp: [], pivotComp: {} };
        const MN = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12 };
        const mesMap = {}, tiendaOrder = [], tiendaSeen = new Set(), piv = {};
        compAus.forEach(r => {
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
    }, [compAus]);

    return (
        <div className="dnm-tab-body">

            {/* ── Panel de filtros ─────────────────────────────────────────── */}
            <div className="dnm-filter-panel">
                <div className="dnm-filter-controls">
                    <select
                        value={pending.mes}
                        onChange={e => setPending(f => ({ ...f, mes: e.target.value }))}
                        className="dnm-select"
                    >
                        <option value="">Todos los meses</option>
                        {meses.map(m => {
                            const futuro = isMesFuturoAus(pending.anio, m);
                            return (
                                <option key={m} value={m} disabled={futuro}
                                    style={futuro ? { color: 'var(--fg3)' } : undefined}>
                                    {m.charAt(0) + m.slice(1).toLowerCase()}
                                </option>
                            );
                        })}
                    </select>

                    <select
                        value={pending.anio}
                        onChange={e => setPending(f => ({ ...f, anio: e.target.value }))}
                        className="dnm-select"
                    >
                        {anios.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <MultiSelect
                        value={pending.tiendas}
                        onChange={sel => setPending(f => ({ ...f, tiendas: sel }))}
                        options={tiendas}
                        placeholder="Todas las sedes"
                    />

                    <select
                        value={pending.tipo_concepto}
                        onChange={e => setPending(f => ({ ...f, tipo_concepto: e.target.value }))}
                        className="dnm-select"
                    >
                        <option value="">Tipo de Concepto</option>
                        {tiposConc.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select
                        value={pending.desc_concepto}
                        onChange={e => setPending(f => ({ ...f, desc_concepto: e.target.value }))}
                        className="dnm-select"
                    >
                        <option value="">Descripción Concepto</option>
                        {descsConc.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <select
                        value={pending.empleado_cc}
                        onChange={e => setPending(f => ({ ...f, empleado_cc: e.target.value }))}
                        className="dnm-select"
                    >
                        <option value="">Empleado (cc)</option>
                        {empleados.map(e => <option key={e.cc} value={e.cc}>{e.cc} — {e.nombre}</option>)}
                    </select>

                    <select
                        value={pending.cargo}
                        onChange={e => setPending(f => ({ ...f, cargo: e.target.value }))}
                        className="dnm-select"
                    >
                        <option value="">Cargo</option>
                        {cargos.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Acciones de filtros */}
                <div className="dnm-filter-actions">
                    <button
                        className={`dnm-apply-btn${isDirty ? ' dnm-apply-btn--dirty' : ''}`}
                        onClick={handleApply}
                        disabled={loading || !isDirty}
                        title={isDirty ? 'Aplicar los filtros seleccionados' : 'Los filtros ya están aplicados'}
                    >
                        {loading ? <span className="dnm-spinner-sm" /> : null}
                        {isDirty ? 'Aplicar filtros' : 'Filtros aplicados'}
                    </button>

                    <button
                        className="dnm-clear-btn"
                        onClick={handleClear}
                        title="Restablecer al mes y año en curso"
                    >
                        Restablecer
                    </button>
                </div>
            </div>

            {/* ── Badge del período activo ─────────────────────────────────── */}
            <div className={`dnm-active-badge${isDirty ? ' dnm-active-badge--pending' : ''}`}>
                <span className="dnm-active-badge-icon">{isDirty ? '⏳' : '📊'}</span>
                <span className="dnm-active-badge-label">
                    {isDirty
                        ? <><strong>Cambios pendientes</strong> · Mostrando: {labelFiltroActivo(applied)}</>
                        : <><strong>Mostrando:</strong> {labelFiltroActivo(applied)}</>
                    }
                </span>
                {isDirty && (
                    <span className="dnm-active-badge-hint">Haz clic en «Aplicar filtros» para actualizar</span>
                )}
            </div>

            {/* ── Banner sedes seleccionadas ───────────────────────────────── */}
            {applied.tiendas.length > 0 && (
                <div className="dnm-emp-banner" style={{
                    borderLeftColor: '#FFE302',
                    background: 'linear-gradient(135deg, rgba(255,227,2,.10), rgba(255,227,2,.03))',
                    borderColor: 'rgba(255,227,2,.28)',
                }}>
                    <span>🏬 {applied.tiendas.length === 1 ? 'Sede seleccionada:' : 'Sedes seleccionadas:'}</span>
                    <strong>{applied.tiendas.join(' · ')}</strong>
                    <button className="dnm-emp-banner-close"
                        onClick={() => {
                            const next = { ...applied, tiendas: [] };
                            setPending(next); setApplied(next); fetchData(next);
                        }}
                        title="Quitar filtro de sedes">×</button>
                </div>
            )}

            {loading ? (
                <div className="dnm-loading"><span className="dnm-spinner" /> Cargando datos...</div>
            ) : (
                <>
                    {/* ── KPIs (izq) + Gauge (der) ─────────────────────── */}
                    <div className="dnm-aus-layout">

                        {/* Columna izquierda: KPIs */}
                        <div className="dnm-aus-kpis">
                            <div className="vyd-kpi danger">
                                <div className="vyd-kpi-num">{fmtCOP(k.nomina_total)}</div>
                                <div className="vyd-kpi-lbl">Nómina Total Compañía</div>
                            </div>
                            <div className="dnm-kpis-grid">
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">{fmtCOP(k.nomina_tnl)}</div>
                                    <div className="vyd-kpi-lbl">Nómina TNL</div>
                                </div>
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">{fmtNum(k.horas_total)}</div>
                                    <div className="vyd-kpi-lbl">Horas Total</div>
                                </div>
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">{fmtNum(k.total_colaboradores)}</div>
                                    <div className="vyd-kpi-lbl">Total Colaboradores</div>
                                </div>
                                <div className="vyd-kpi danger">
                                    <div className="vyd-kpi-num">{fmtNum(k.personas_ausentismo)}</div>
                                    <div className="vyd-kpi-lbl">Personas Con Ausentismo</div>
                                </div>
                            </div>
                            <div className="dnm-kpis-grid">
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">{fmtPct(k.pct_nomina_tnl)}</div>
                                    <div className="vyd-kpi-lbl">% Peso Nómina TNL</div>
                                </div>
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">{fmtNum(k.horas_tnl)}</div>
                                    <div className="vyd-kpi-lbl">Horas TNL</div>
                                </div>
                                <div className="vyd-kpi danger">
                                    <div className="vyd-kpi-num">{fmtPct(k.pct_ausentismo)}</div>
                                    <div className="vyd-kpi-lbl">% De Ausentismo</div>
                                </div>
                                <div className="vyd-kpi">
                                    <div className="vyd-kpi-num">{fmtNum(k.cantidad_ausentismo)}</div>
                                    <div className="vyd-kpi-lbl">Cantidad de Ausentismos</div>
                                </div>
                            </div>
                        </div>

                        {/* Columna derecha: Gauge */}
                        <div className="vyd-panel dnm-gauge-panel">
                            <div className="vyd-panel-head">
                                <div>
                                    <div className="vyd-panel-title">Índice de Ausentismo Laboral</div>
                                    <div className="vyd-panel-sub">Horas TNL ÷ Horas totales × 100</div>
                                </div>
                            </div>
                            <GaugeAusentismo
                                pct={k.pct_ausentismo ?? 0}
                                horasTNL={k.horas_tnl ?? 0}
                                horasTotal={k.horas_total ?? 0}
                            />
                        </div>

                    </div>

                    {/* ── Tienda (izq) + Conceptos (der) ─────────────────── */}
                    <div className="dnm-two-col">

                        {/* Tabla Tienda */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Tienda
                                    <span className="dnm-table-count">
                                        {tabTiendas.filter(r => r.tienda !== '__TOTAL__').length}
                                    </span>
                                </div>
                            </div>
                            <div className="dnm-table-wrap" style={{ maxHeight: 400 }}>
                                <table className="dnm-table">
                                    <thead>
                                        <tr>
                                            <th>Tienda</th>
                                            <th>Nómina</th>
                                            <th>Nómina TNL</th>
                                            <th>% Peso Nóm. TNL</th>
                                            <th>Horas Total</th>
                                            <th>Horas TNL</th>
                                            <th>% De Aus.</th>
                                            <th>Personas</th>
                                            <th>Cargos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabTiendas.filter(r => r.tienda !== '__TOTAL__').map((r, i) => {
                                            const isDirec  = ['ADMINISTRACIÓN','CEDI','DESPOSTAR','OMNICANAL'].includes(r.tienda);
                                            const selected = applied.tiendas.includes(r.tienda);
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
                                                    <td>{fmtCOP(r.nomina)}</td>
                                                    <td>{r.nomina_tnl > 0 ? fmtCOP(r.nomina_tnl) : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{r.pct_nomina_tnl > 0 ? <span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(r.pct_nomina_tnl)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{fmtNum(r.horas_total)}</td>
                                                    <td>{r.horas_tnl > 0 ? fmtNum(r.horas_tnl) : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{r.pct_aus > 0 ? <span className="dnm-pct-badge" style={pctColor(r.pct_aus)}>{fmtPct(r.pct_aus)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{fmtNum(r.personas)}</td>
                                                    <td>{fmtNum(r.cargos)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {(() => {
                                        const t = tabTiendas.find(r => r.tienda === '__TOTAL__');
                                        return t ? (
                                            <tfoot><tr>
                                                <td><strong>Total</strong></td>
                                                <td><strong>{fmtCOP(t.nomina)}</strong></td>
                                                <td><strong>{fmtCOP(t.nomina_tnl)}</strong></td>
                                                <td><span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(t.pct_nomina_tnl)}</span></td>
                                                <td><strong>{fmtNum(t.horas_total)}</strong></td>
                                                <td><strong>{fmtNum(t.horas_tnl)}</strong></td>
                                                <td><span className="dnm-pct-badge" style={pctColor(t.pct_aus)}>{fmtPct(t.pct_aus)}</span></td>
                                                <td><strong>{fmtNum(t.personas)}</strong></td>
                                                <td><strong>{fmtNum(t.cargos)}</strong></td>
                                            </tr></tfoot>
                                        ) : null;
                                    })()}
                                </table>
                            </div>
                        </div>

                        {/* Tabla Conceptos */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Conceptos
                                    <span className="dnm-table-count">
                                        {tabConceptos.filter(r => r.desc_concepto !== '__TOTAL__').length}
                                    </span>
                                </div>
                            </div>
                            <div className="dnm-table-wrap" style={{ maxHeight: 400 }}>
                                <table className="dnm-table">
                                    <thead>
                                        <tr>
                                            <th>Descripción Concepto</th>
                                            <th>Nómina</th>
                                            <th>Horas Total</th>
                                            <th>Personas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabConceptos.filter(r => r.desc_concepto !== '__TOTAL__').map((r, i) => (
                                            <tr key={i}>
                                                <td title={r.desc_concepto}>{r.desc_concepto}</td>
                                                <td>{fmtCOP(r.nomina)}</td>
                                                <td>{r.horas_total > 0 ? fmtNum(r.horas_total) : <span className="dnm-delta-nil">—</span>}</td>
                                                <td>{fmtNum(r.personas)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {(() => {
                                        const t = tabConceptos.find(r => r.desc_concepto === '__TOTAL__');
                                        return t ? (
                                            <tfoot><tr>
                                                <td><strong>Total</strong></td>
                                                <td><strong>{fmtCOP(t.nomina)}</strong></td>
                                                <td><strong>{fmtNum(t.horas_total)}</strong></td>
                                                <td><strong>{fmtNum(t.personas)}</strong></td>
                                            </tr></tfoot>
                                        ) : null;
                                    })()}
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* ── Colaborador (izq) + Tienda Conceptos TNL (der) ── */}
                    <div className="dnm-two-col">

                        {/* Tabla Colaborador */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Colaborador
                                    <span className="dnm-table-count">
                                        {tabColab.filter(r => r.cc !== '__TOTAL__').length}
                                    </span>
                                </div>
                            </div>
                            <div className="dnm-table-wrap" style={{ maxHeight: 400 }}>
                                <table className="dnm-table">
                                    <thead>
                                        <tr>
                                            <th>Empleado</th>
                                            <th>Nómina</th>
                                            <th>Nómina TNL</th>
                                            <th>% Peso Nóm. TNL</th>
                                            <th>Horas Total</th>
                                            <th>Horas TNL</th>
                                            <th>% De Aus.</th>
                                            <th>Días</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabColab.filter(r => r.cc !== '__TOTAL__').map((r, i) => (
                                            <tr key={i}>
                                                <td title={`${r.cc} — ${r.nombre}`}>{r.nombre}</td>
                                                <td>{fmtCOP(r.nomina)}</td>
                                                <td>{r.nomina_tnl > 0 ? fmtCOP(r.nomina_tnl) : <span className="dnm-delta-nil">—</span>}</td>
                                                <td>{r.pct_nomina_tnl > 0 ? <span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(r.pct_nomina_tnl)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                <td>{fmtNum(r.horas_total)}</td>
                                                <td>{r.horas_tnl > 0 ? fmtNum(r.horas_tnl) : <span className="dnm-delta-nil">—</span>}</td>
                                                <td>{r.pct_aus > 0 ? <span className="dnm-pct-badge" style={pctColor(r.pct_aus)}>{fmtPct(r.pct_aus)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                <td>{fmtDias(r.dias)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {(() => {
                                        const t = tabColab.find(r => r.cc === '__TOTAL__');
                                        return t ? (
                                            <tfoot><tr>
                                                <td><strong>Total</strong></td>
                                                <td><strong>{fmtCOP(t.nomina)}</strong></td>
                                                <td><strong>{fmtCOP(t.nomina_tnl)}</strong></td>
                                                <td><span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(t.pct_nomina_tnl)}</span></td>
                                                <td><strong>{fmtNum(t.horas_total)}</strong></td>
                                                <td><strong>{fmtNum(t.horas_tnl)}</strong></td>
                                                <td><span className="dnm-pct-badge" style={pctColor(t.pct_aus)}>{fmtPct(t.pct_aus)}</span></td>
                                                <td><strong>{fmtDias(t.dias)}</strong></td>
                                            </tr></tfoot>
                                        ) : null;
                                    })()}
                                </table>
                            </div>
                        </div>

                        {/* Tabla Tienda Conceptos TNL */}
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Tienda Conceptos TNL
                                    <span className="dnm-table-count">
                                        {tabTiendas.filter(r => r.tienda !== '__TOTAL__').length}
                                    </span>
                                </div>
                            </div>
                            <div className="dnm-table-wrap" style={{ maxHeight: 400 }}>
                                <table className="dnm-table">
                                    <thead>
                                        <tr>
                                            <th>Tienda</th>
                                            <th>Nómina</th>
                                            <th>Nómina TNL</th>
                                            <th>% Peso Nóm. TNL</th>
                                            <th>Horas TNL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabTiendas.filter(r => r.tienda !== '__TOTAL__').map((r, i) => {
                                            const isDirec  = ['ADMINISTRACIÓN','CEDI','DESPOSTAR','OMNICANAL'].includes(r.tienda);
                                            const selected = applied.tiendas.includes(r.tienda);
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
                                                    <td>{fmtCOP(r.nomina)}</td>
                                                    <td>{r.nomina_tnl > 0 ? fmtCOP(r.nomina_tnl) : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{r.pct_nomina_tnl > 0 ? <span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(r.pct_nomina_tnl)}</span> : <span className="dnm-delta-nil">—</span>}</td>
                                                    <td>{r.horas_tnl > 0 ? fmtNum(r.horas_tnl) : <span className="dnm-delta-nil">—</span>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {(() => {
                                        const t = tabTiendas.find(r => r.tienda === '__TOTAL__');
                                        return t ? (
                                            <tfoot><tr>
                                                <td><strong>Total</strong></td>
                                                <td><strong>{fmtCOP(t.nomina)}</strong></td>
                                                <td><strong>{fmtCOP(t.nomina_tnl)}</strong></td>
                                                <td><span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(t.pct_nomina_tnl)}</span></td>
                                                <td><strong>{fmtNum(t.horas_tnl)}</strong></td>
                                            </tr></tfoot>
                                        ) : null;
                                    })()}
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* ── Comparación Mensual (ancho completo) ── */}
                    {mesesComp.length > 0 && (
                        <div className="vyd-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">
                                    Comparación Mensual Tienda Conceptos TNL
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
                                            {mesesComp.map(mes =>
                                                ['Nómina', 'Nóm. TNL', '% Peso', 'Var %', 'Var $'].map(sub => (
                                                    <th key={`${mes}-${sub}`} className="dnm-comp-sub-th">{sub}</th>
                                                ))
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tiendasComp.filter(t => t !== '__TOTAL__').map((tienda, i) => {
                                            const isDirec  = ['ADMINISTRACIÓN','CEDI','DESPOSTAR','OMNICANAL'].includes(tienda);
                                            const selected = applied.tiendas.includes(tienda);
                                            const rowCls = [
                                                'dnm-row-clickable',
                                                selected ? 'dnm-row-selected' : '',
                                                isDirec  ? 'dnm-row-direc'   : '',
                                            ].filter(Boolean).join(' ');
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
                                                                <td>{d ? fmtCOP(d.nomina_tnl) : '—'}</td>
                                                                <td>{d ? <span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(d.pct_nomina_tnl)}</span> : '—'}</td>
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
                                                            <td><strong>{d ? fmtCOP(d.nomina_tnl) : '—'}</strong></td>
                                                            <td>{d ? <span className="dnm-pct-badge" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{fmtPct(d.pct_nomina_tnl)}</span> : '—'}</td>
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
                    )}
                </>
            )}
        </div>
    );
};

export default TabAusentismo;
