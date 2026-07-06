import { useState, useEffect, useRef, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import Swal from 'sweetalert2';
import api from '../../../../services/api';

const fmtNum = (n) =>
    n == null || isNaN(n) ? '—' : new Intl.NumberFormat('es-CO').format(Math.round(n));

const fmtPct = (n) =>
    n == null || isNaN(n) ? '—' : `${Number(n).toFixed(2)}%`;

const PIE_COLORS_SEXO     = ['#6366f1', '#f472b6', '#94a3b8'];
const PIE_COLORS_CONTRATO = ['#27348B', '#FFE302', '#22c55e', '#f97316'];

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="700">
            {value}
        </text>
    );
};

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="dnm-chart-tooltip">
            {label && <p className="dnm-chart-tooltip-label">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color ?? p.payload?.fill }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
};

const INITIAL_FILTERS = { tienda: '', tipo_contrato: '', sexo: '' };
const PAGE_SIZE = 50;

// Tick clickeable del eje Y — nombre de tienda
const YAxisTick = ({ x, y, payload, selectedTienda, onSelect }) => {
    const raw  = payload?.value ?? '';
    const name = raw.replace(/^EURO\s+/i, '');
    const label = name.length > 16 ? name.slice(0, 15) + '…' : name;
    const isSelected = selectedTienda === raw;
    return (
        <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }} onClick={() => onSelect(raw)}>
            <text
                x={0} y={0} dy={4}
                textAnchor="end"
                fontSize={10}
                fontWeight={isSelected ? 700 : 400}
                fill={isSelected ? '#FFE302' : 'var(--fg3)'}
            >
                {label}
            </text>
        </g>
    );
};

const TabAntiguedad = () => {
    const [data, setData]             = useState(null);
    const [loading, setLoading]       = useState(true);
    const [paging, setPaging]         = useState(false);
    const [refetching, setRefetch]    = useState(false);
    const [filters, setFilters]       = useState(INITIAL_FILTERS);
    const [page, setPage]             = useState(1);
    const hasDataRef = useRef(false);

    // Empleado seleccionado al hacer clic en la tabla
    const [selectedEmp, setSelectedEmp] = useState(null); // { cedula, nombre }

    // Búsqueda por cédula (filtros)
    const [cedInput, setCedInput]     = useState('');
    const [cedula, setCedula]         = useState('');
    const cedRef   = useRef('');
    const cedTimer = useRef(null);

    // Búsqueda por nombre (tabla + filtros)
    const [nomInput, setNomInput]     = useState('');
    const [nombre, setNombre]         = useState('');
    const nomRef   = useRef('');
    const nomTimer = useRef(null);

    // Contador de peticiones para ignorar respuestas obsoletas
    const reqIdRef = useRef(0);

    const buildParams = useCallback((p, ced, nom, fil) => {
        const params = { page: p, page_size: PAGE_SIZE };
        if (fil.tienda)        params.tienda        = fil.tienda;
        if (fil.tipo_contrato) params.tipo_contrato = fil.tipo_contrato;
        if (fil.sexo)          params.sexo          = fil.sexo;
        if (ced)               params.cedula        = ced;
        if (nom)               params.nombre        = nom;
        return params;
    }, []);

    const fetchData = useCallback(async (params, isPageChange = false) => {
        const reqId = ++reqIdRef.current;
        if (isPageChange)            setPaging(true);
        else if (hasDataRef.current) setRefetch(true);
        else                         setLoading(true);
        try {
            const res = await api.get('dashboard/antiguedad/', { params });
            if (reqId !== reqIdRef.current) return;
            hasDataRef.current = true;
            setData(res.data);
        } catch {
            if (reqId !== reqIdRef.current) return;
            Swal.fire({
                icon: 'error', title: 'Error',
                text: 'No se pudo cargar el dashboard de antigüedad.',
                toast: true, position: 'top-end', timer: 3500, showConfirmButton: false,
            });
        } finally {
            if (reqId === reqIdRef.current) {
                if (isPageChange) setPaging(false);
                else { setLoading(false); setRefetch(false); }
            }
        }
    }, []);

    // Filtros / búsqueda → recarga completa desde página 1
    useEffect(() => {
        fetchData(buildParams(1, cedula, nombre, filters), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, cedula, nombre]);

    // Cambio de página → overlay solo en la tabla
    const goToPage = useCallback((p) => {
        setPage(p);
        fetchData(buildParams(p, cedula, nombre, filters), true);
    }, [filters, cedula, nombre, fetchData, buildParams]);

    // ── Handlers debounce ───────────────────────────────────────────────────────
    const onCedulaChange = (e) => {
        const v = e.target.value;
        setCedInput(v); cedRef.current = v;
        clearTimeout(cedTimer.current);
        cedTimer.current = setTimeout(() => { setCedula(cedRef.current); setPage(1); }, 600);
    };

    const onNombreChange = (e) => {
        const v = e.target.value;
        setNomInput(v); nomRef.current = v;
        clearTimeout(nomTimer.current);
        nomTimer.current = setTimeout(() => { setNombre(nomRef.current); setPage(1); }, 600);
    };

    // ── Click en fila ────────────────────────────────────────────────────────────
    const handleRowClick = (r) => {
        if (selectedEmp?.cedula === String(r.cedula)) {
            clearSelectedEmp();
            return;
        }
        setSelectedEmp({ cedula: String(r.cedula), nombre: r.nombre });
        setCedula(String(r.cedula));
        setCedInput(String(r.cedula));
        setNombre('');
        setNomInput('');
        setPage(1);
    };

    const clearSelectedEmp = () => {
        setSelectedEmp(null);
        setCedula(''); setCedInput('');
        setPage(1);
    };

    // ── Click en barra/tienda del gráfico ────────────────────────────────────────
    const handleBarClick = (tiendaName) => {
        const isDeselect = filters.tienda === tiendaName;
        setFilters(f => ({ ...f, tienda: isDeselect ? '' : tiendaName }));
        setPage(1);
        if (selectedEmp) {
            setSelectedEmp(null);
            setCedula(''); setCedInput('');
        }
    };

    // ── Limpiar todo ─────────────────────────────────────────────────────────────
    const limpiar = () => {
        setFilters(INITIAL_FILTERS);
        setCedula(''); setCedInput('');
        setNombre(''); setNomInput('');
        setSelectedEmp(null);
        setPage(1);
        clearTimeout(cedTimer.current);
        clearTimeout(nomTimer.current);
    };

    // ── Derivados ────────────────────────────────────────────────────────────────
    const opts           = data ?? {};
    const k              = opts.kpis ?? {};
    const pag            = opts.paginacion ?? {};
    const tiendas        = opts.tiendas_disponibles    ?? [];
    const contratos      = opts.contratos_disponibles  ?? [];
    const sexos          = opts.sexos_disponibles      ?? [];
    const detalle        = opts.detalle                ?? [];
    const totalPages     = pag.total_paginas           ?? 1;
    const totalRegistros = pag.total_registros         ?? 0;
    const hayFiltros     = Object.values(filters).some(Boolean) || cedula || nombre;

    const pageNumbers = (() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = new Set([1, totalPages, page]);
        for (let d = -2; d <= 2; d++) {
            const p2 = page + d;
            if (p2 >= 1 && p2 <= totalPages) pages.add(p2);
        }
        return [...pages].sort((a, b) => a - b);
    })();

    return (
        <div className="dnm-tab-body">
            {/* ── Filtros ─────────────────────────────────────────────────────── */}
            <div className="dnm-filters">
                <select value={filters.tienda} onChange={(e) => { setFilters(f => ({ ...f, tienda: e.target.value })); setPage(1); }} className="dnm-select">
                    <option value="">Todas las tiendas</option>
                    {tiendas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filters.tipo_contrato} onChange={(e) => { setFilters(f => ({ ...f, tipo_contrato: e.target.value })); setPage(1); }} className="dnm-select">
                    <option value="">Todos los contratos</option>
                    {contratos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filters.sexo} onChange={(e) => { setFilters(f => ({ ...f, sexo: e.target.value })); setPage(1); }} className="dnm-select">
                    <option value="">Todos los sexos</option>
                    {sexos.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="dnm-select" placeholder="Cédula..." value={cedInput}
                    onChange={onCedulaChange} style={{ maxWidth: 140 }} />
                {hayFiltros && (
                    <button className="dnm-clear-btn" onClick={limpiar}>Limpiar filtros</button>
                )}
            </div>

            {/* ── Banner tienda seleccionada (cross-filter desde gráfico) ─────── */}
            {filters.tienda && !selectedEmp && (
                <div className="dnm-emp-banner" style={{ borderLeftColor: '#FFE302', background: 'linear-gradient(135deg, rgba(255,227,2,.10), rgba(255,227,2,.03))', borderColor: 'rgba(255,227,2,.28)' }}>
                    <span>🏬 Tienda seleccionada:</span>
                    <strong>{filters.tienda}</strong>
                    <button className="dnm-emp-banner-close"
                        onClick={() => { setFilters(f => ({ ...f, tienda: '' })); setPage(1); }}
                        title="Quitar filtro de tienda">×</button>
                </div>
            )}

            {/* ── Banner empleado seleccionado ────────────────────────────────── */}
            {selectedEmp && (
                <div className="dnm-emp-banner">
                    <span>👤 Empleado seleccionado:</span>
                    <strong>{selectedEmp.nombre}</strong>
                    <span style={{ color: 'var(--fg4)', fontSize: 11 }}>CC {selectedEmp.cedula}</span>
                    <button className="dnm-emp-banner-close" onClick={clearSelectedEmp} title="Quitar selección">×</button>
                </div>
            )}

            {loading ? (
                <div className="dnm-loading"><span className="dnm-spinner" /> Cargando datos...</div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {refetching && <div className="dnm-progress-bar-anim" />}
                    <div style={{ opacity: refetching ? 0.6 : 1, transition: 'opacity .3s', pointerEvents: refetching ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <>
                    {/* ── KPIs fila 1 ─────────────────────────────────────────── */}
                    <div className="dnm-kpis-ant">
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">{fmtNum(k.total_todos)}</div>
                            <div className="vyd-kpi-lbl">Total Empleados</div>
                        </div>
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">{fmtNum(k.total_empleados)}</div>
                            <div className="vyd-kpi-lbl">Empleados</div>
                        </div>
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">{k.avg_anios?.toFixed(1)}</div>
                            <div className="vyd-kpi-lbl">Promedio Antigüedad Años</div>
                        </div>
                        <div className="vyd-kpi">
                            <div className="vyd-kpi-num">{fmtNum(k.avg_dias)}</div>
                            <div className="vyd-kpi-lbl">Promedio Antigüedad Días</div>
                        </div>
                    </div>

                    {/* ── KPI % + texto promedio ───────────────────────────────── */}
                    <div className="dnm-ant-kpi2">
                        <div className="vyd-kpi mute" style={{ flex: 1 }}>
                            <div className="vyd-kpi-num">{fmtPct(k.pct_total)}</div>
                            <div className="vyd-kpi-lbl">% Empleados Sobre el Total</div>
                        </div>
                        <div className="dnm-avg-badge" style={{ flex: 2 }}>
                            Antigüedad promedio: <strong>{k.avg_texto}</strong>
                        </div>
                    </div>

                    {/* ── Barras (izq, alta) + Donuts apilados (der) ──────────── */}
                    <div className="dnm-ant-charts">

                        {/* Barra izquierda — crece hasta igualar la columna derecha */}
                        <div className="vyd-panel dnm-bar-panel">
                            <div className="vyd-panel-head">
                                <div className="vyd-panel-title">Antigüedad Promedio Años por Tienda</div>
                            </div>
                            {/* sin overflow interno — los gestos táctiles propagan al scroll de página */}
                            <div className="dnm-bar-fill" style={{ height: Math.max(520, (opts.por_tienda ?? []).length * 26 + 20) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={opts.por_tienda ?? []}
                                            layout="vertical"
                                            margin={{ top: 4, right: 54, left: 4, bottom: 4 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.12)" horizontal={false} />
                                            <XAxis type="number" tick={{ fill: 'var(--fg3)', fontSize: 10 }}
                                                tickFormatter={v => `${v}a`} domain={[0, 'dataMax + 0.5']} />
                                            <YAxis type="category" dataKey="tienda"
                                                tick={<YAxisTick selectedTienda={filters.tienda} onSelect={handleBarClick} />}
                                                width={130} />
                                            <Tooltip content={<ChartTooltip />} formatter={v => [`${v} años`, 'Prom. antigüedad']} />
                                            <Bar dataKey="prom_anios" name="Años prom." radius={[0, 4, 4, 0]}
                                                cursor="pointer"
                                                onClick={(data) => handleBarClick(data.tienda)}
                                                label={{ position: 'right', fontSize: 10, fill: 'var(--fg3)', formatter: v => `${v}a` }}>
                                                {(opts.por_tienda ?? []).map((entry, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={
                                                            !filters.tienda
                                                                ? '#FFE302'
                                                                : filters.tienda === entry.tienda
                                                                    ? '#27348B'
                                                                    : 'rgba(255,227,2,0.30)'
                                                        }
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Donuts apilados derecha */}
                        <div className="dnm-ant-donuts">
                            <div className="vyd-panel">
                                <div className="vyd-panel-head">
                                    <div className="vyd-panel-title">Empleados por Sexo</div>
                                </div>
                                <div className="dnm-chart-wrap" style={{ height: 290 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={opts.por_sexo ?? []} dataKey="value" nameKey="name"
                                                cx="50%" cy="46%" innerRadius={68} outerRadius={100}
                                                labelLine={false} label={<CustomPieLabel />}>
                                                {(opts.por_sexo ?? []).map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS_SEXO[i % PIE_COLORS_SEXO.length]} />
                                                ))}
                                            </Pie>
                                            <Legend iconSize={11} wrapperStyle={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v, n) => [`${v} empleados`, n]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="vyd-panel">
                                <div className="vyd-panel-head">
                                    <div className="vyd-panel-title">Empleados por Tipo de Contrato</div>
                                </div>
                                <div className="dnm-chart-wrap" style={{ height: 290 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={opts.por_contrato ?? []} dataKey="value" nameKey="name"
                                                cx="50%" cy="46%" innerRadius={68} outerRadius={100}
                                                labelLine={false} label={<CustomPieLabel />}>
                                                {(opts.por_contrato ?? []).map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS_CONTRATO[i % PIE_COLORS_CONTRATO.length]} />
                                                ))}
                                            </Pie>
                                            <Legend iconSize={11} wrapperStyle={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v, n) => [`${v} empleados`, n]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Tabla detalle ────────────────────────────────────────── */}
                    <div className="vyd-panel">
                        <div className="vyd-panel-head">
                            <div className="vyd-panel-title">
                                Detalles Empleados
                                <span className="dnm-table-count">{fmtNum(totalRegistros)} registros</span>
                            </div>
                            <input className="dnm-select" placeholder="Buscar empleado..."
                                value={nomInput} onChange={onNombreChange} style={{ maxWidth: 220 }} />
                        </div>

                        <div className="dnm-table-wrap" style={{ maxHeight: 440, position: 'relative' }}>
                            <div className={`dnm-page-overlay${paging ? ' visible' : ''}`}>
                                <span className="dnm-spinner" />
                            </div>
                            <table className="dnm-table">
                                <thead>
                                    <tr>
                                        <th>Nombre y Apellido</th>
                                        <th>Tienda</th>
                                        <th>Cargo</th>
                                        <th>F. Ingreso</th>
                                        <th>Tipo Contrato</th>
                                        <th>Sexo</th>
                                        <th>Años</th>
                                        <th>Días</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalle.map((r, i) => (
                                        <tr
                                            key={i}
                                            className={`dnm-row-clickable${selectedEmp?.cedula === String(r.cedula) ? ' dnm-row-selected' : ''}`}
                                            onClick={() => handleRowClick(r)}
                                            title="Clic para ver solo este empleado"
                                        >
                                            <td>{r.nombre}</td>
                                            <td title={r.tienda}>{r.tienda}</td>
                                            <td title={r.cargo}>{r.cargo}</td>
                                            <td>{r.fecha_ingreso}</td>
                                            <td>{r.tipo_contrato}</td>
                                            <td>{r.sexo}</td>
                                            <td><strong>{r.antiguedad_anios}a</strong></td>
                                            <td>{fmtNum(r.antiguedad_dias)}</td>
                                        </tr>
                                    ))}
                                    {detalle.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', color: 'var(--fg4)', padding: 24 }}>
                                                Sin resultados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="dnm-pagination">
                                <span className="dnm-page-info">
                                    Página {page} de {totalPages} · {fmtNum(totalRegistros)} registros
                                </span>
                                <div className="dnm-page-controls">
                                    <button className="dnm-page-btn" disabled={page === 1} onClick={() => goToPage(1)}>«</button>
                                    <button className="dnm-page-btn" disabled={page === 1} onClick={() => goToPage(page - 1)}>‹</button>
                                    {pageNumbers.map((p, idx) => {
                                        const prev = pageNumbers[idx - 1];
                                        const gap  = prev != null && p - prev > 1;
                                        return (
                                            <span key={p} style={{ display: 'contents' }}>
                                                {gap && <span style={{ color: 'var(--fg4)', padding: '0 2px' }}>…</span>}
                                                <button
                                                    className={`dnm-page-btn${p === page ? ' active' : ''}`}
                                                    onClick={() => goToPage(p)}
                                                >
                                                    {p}
                                                </button>
                                            </span>
                                        );
                                    })}
                                    <button className="dnm-page-btn" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>›</button>
                                    <button className="dnm-page-btn" disabled={page === totalPages} onClick={() => goToPage(totalPages)}>»</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabAntiguedad;
