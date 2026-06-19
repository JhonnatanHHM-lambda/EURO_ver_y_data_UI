import { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/* ─── utilidades ────────────────────────────────────────────── */
const padZ     = (n) => String(n).padStart(2, '0');
const toStr    = (y, m, d) => `${y}-${padZ(m + 1)}-${padZ(d)}`;
const getToday = () => { const d = new Date(); return toStr(d.getFullYear(), d.getMonth(), d.getDate()); };
const getOffset = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return toStr(d.getFullYear(), d.getMonth(), d.getDate()); };
const fmtDisplay = (s) => {
    if (!s) return '—';
    const [y, m, d] = s.split('-');
    return `${parseInt(d)} ${MESES_C[parseInt(m) - 1]} ${y}`;
};

/* ─── constantes ───────────────────────────────────────────── */
const MESES_C = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_L = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS    = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];
const CELL    = 26;

const PRESETS = [
    { label: 'Ayer',             desde: () => getOffset(-1),  hasta: () => getOffset(-1)  },
    { label: 'Hoy',              desde: getToday,             hasta: getToday              },
    { label: 'Últimos 7 días',   desde: () => getOffset(-6),  hasta: getToday              },
    { label: 'Últimos 14 días',  desde: () => getOffset(-13), hasta: getToday              },
    { label: 'Últimos 30 días',  desde: () => getOffset(-29), hasta: getToday              },
    { label: 'Últimos 90 días',  desde: () => getOffset(-89), hasta: getToday              },
];

const getCells = (year, month) => {
    const first  = new Date(year, month, 1).getDay();
    const offset = first === 0 ? 6 : first - 1;
    const total  = new Date(year, month + 1, 0).getDate();
    const cells  = Array(offset).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
};

/* ─── colores rango ─────────────────────────────────────────── */
const RANGE_BG = 'rgba(14,165,233,0.15)';
const ACCENT   = '#0ea5e9';

const getCellStyle = (dateStr, inicio, fin, hover) => {
    let effFin = fin;
    if (!fin && inicio && hover && hover !== inicio) effFin = hover;
    if (!inicio) return { cellBg: 'transparent', circBg: 'transparent', isEP: false };

    const s = (!effFin || inicio <= effFin) ? inicio : effFin;
    const e = (!effFin || inicio <= effFin) ? effFin  : inicio;

    const isS  = dateStr === s;
    const isE  = !!e && dateStr === e;
    const inR  = !!s && !!e && dateStr > s && dateStr < e;
    const span = !!s && !!e && s !== e;

    let cellBg = 'transparent';
    if (span) {
        if (isS)      cellBg = `linear-gradient(90deg, transparent 50%, ${RANGE_BG} 50%)`;
        else if (isE) cellBg = `linear-gradient(90deg, ${RANGE_BG} 50%, transparent 50%)`;
        else if (inR) cellBg = RANGE_BG;
    }
    return { cellBg, circBg: (isS || isE) ? ACCENT : 'transparent', isEP: isS || isE };
};

/* ─── CSS responsive (inyectado una sola vez) ───────────────── */
const DRP_CSS = `
.drp-root {
    display: flex; flex-direction: column;
    background: var(--bg-modal);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0,0,0,.22);
    position: absolute; z-index: 600;
    top: calc(100% + 6px); right: 0;
    user-select: none;
}
.drp-body       { display: flex; }
.drp-cal-wrap   { padding: 16px 18px; flex-shrink: 0; }
.drp-cals       { display: flex; }
.drp-cal2       { display: flex; }
.drp-div-main   { width: 1px; background: var(--border); flex-shrink: 0; }
.drp-panels     { display: flex; }
.drp-div-v      { width: 1px; background: var(--border); flex-shrink: 0; }
.drp-presets    { width: 140px; padding: 16px 14px; display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.drp-mesanio    { width: 130px; padding: 16px 14px; display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
/* en desktop el botón siguiente de cal1 está oculto (cal2 lo tiene) */
.drp-cal1-next  { display: none !important; }

@media (max-width: 640px) {
    .drp-root {
        position: fixed !important;
        left: 8px !important; right: 8px !important;
        bottom: 8px !important; top: auto !important;
        border-radius: 16px 16px 16px 16px !important;
        max-height: 82vh; overflow-y: auto;
    }
    .drp-body      { flex-direction: column; }
    .drp-cal-wrap  { padding: 12px 14px; }
    .drp-cals      { justify-content: center; }
    /* ocultar segundo calendario y su divisor */
    .drp-cal2      { display: none !important; }
    .drp-div-main  { display: none !important; }
    /* mostrar botón siguiente en cal1 */
    .drp-cal1-next { display: flex !important; }
    /* paneles: lado a lado debajo del calendario */
    .drp-panels    { border-top: 1px solid var(--border); }
    .drp-presets   { flex: 1; width: auto !important; padding: 12px 10px; }
    .drp-mesanio   { flex: 1; width: auto !important; padding: 12px 10px; border-left: 1px solid var(--border); }
}
`;

/* ─── componente ───────────────────────────────────────────── */
const DateRangePicker = ({ value, onChange, onClear }) => {
    const now     = new Date();
    const initMes = value?.desde ? parseInt(value.desde.slice(5, 7)) - 1 : now.getMonth();

    const [anio1, setAnio1]     = useState(value?.desde ? parseInt(value.desde.slice(0, 4)) : now.getFullYear());
    const [mes1, setMes1]       = useState(initMes === 11 ? 10 : initMes);
    const [inicio, setInicio]   = useState(value?.desde || null);
    const [fin, setFin]         = useState(value?.hasta || null);
    const [hover, setHover]     = useState(null);
    const [activePreset, setAP] = useState(null);
    const [anioSel, setAnioSel] = useState(now.getFullYear());
    const [mesSel, setMesSel]   = useState(now.getMonth());

    const mes2  = (mes1 + 1) % 12;
    const anio2 = mes1 === 11 ? anio1 + 1 : anio1;

    const prevMes = () => { if (mes1 === 0) { setMes1(11); setAnio1(a => a - 1); } else setMes1(m => m - 1); };
    const nextMes = () => { if (mes1 === 11) { setMes1(0); setAnio1(a => a + 1); } else setMes1(m => m + 1); };

    const handleDay = (dateStr) => {
        setAP(null);
        if (!inicio || (inicio && fin)) { setInicio(dateStr); setFin(null); }
        else {
            const [s, e] = dateStr >= inicio ? [inicio, dateStr] : [dateStr, inicio];
            setInicio(s); setFin(e);
        }
    };

    const handlePreset = (idx) => {
        const p = PRESETS[idx];
        setInicio(p.desde()); setFin(p.hasta()); setAP(idx);
    };

    const handleMesAnio = () => {
        const d    = toStr(anioSel, mesSel, 1);
        const last = new Date(anioSel, mesSel + 1, 0).getDate();
        onChange(d, toStr(anioSel, mesSel, last));
    };

    const hoy = getToday();

    /* renderiza un mes del calendario */
    const renderCal = (year, month, showPrev, showNext) => {
        const cells = getCells(year, month);
        return (
            <div style={{ width: CELL * 7 }}>
                {/* cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    {showPrev
                        ? <button onClick={prevMes} style={sBtn}><FiChevronLeft size={14} /></button>
                        : <div style={{ width: 22 }} />}
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg1)' }}>
                        {MESES_L[month]} {year}
                    </span>
                    {showNext
                        ? <button onClick={nextMes} style={sBtn}><FiChevronRight size={14} /></button>
                        : <div style={{ width: 22 }} />}
                </div>
                {/* nombres de días */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(7,${CELL}px)`, marginBottom: 2 }}>
                    {DIAS.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fg4)', height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {d}
                        </div>
                    ))}
                </div>
                {/* celdas */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(7,${CELL}px)` }}>
                    {cells.map((day, i) => {
                        if (day === null) return <div key={`e${i}`} style={{ height: CELL }} />;
                        const ds = toStr(year, month, day);
                        const { cellBg, circBg, isEP } = getCellStyle(ds, inicio, fin, hover);
                        const isToday = ds === hoy;
                        return (
                            <div key={ds}
                                style={{ height: CELL, background: cellBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                onClick={() => handleDay(ds)}
                                onMouseEnter={() => inicio && !fin && setHover(ds)}
                            >
                                <span style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: CELL - 2, height: CELL - 2, borderRadius: '50%',
                                    background: circBg,
                                    color: isEP ? '#fff' : isToday ? ACCENT : 'var(--fg1)',
                                    fontSize: 11.5,
                                    fontWeight: isEP ? 700 : isToday ? 600 : 400,
                                    outline: isToday && !isEP ? `1.5px solid ${ACCENT}` : 'none',
                                    outlineOffset: -1,
                                    transition: 'background .1s',
                                }}>
                                    {day}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    /* calendario 1: ← siempre visible; → oculto en desktop (visible en móvil via .drp-cal1-next) */
    const renderCal1 = () => {
        const cells = getCells(anio1, mes1);
        return (
            <div style={{ width: CELL * 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <button onClick={prevMes} style={sBtn}><FiChevronLeft size={14} /></button>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg1)' }}>
                        {MESES_L[mes1]} {anio1}
                    </span>
                    {/* visible solo en móvil */}
                    <button onClick={nextMes} className="drp-cal1-next" style={sBtn}><FiChevronRight size={14} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(7,${CELL}px)`, marginBottom: 2 }}>
                    {DIAS.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fg4)', height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(7,${CELL}px)` }}>
                    {cells.map((day, i) => {
                        if (day === null) return <div key={`e${i}`} style={{ height: CELL }} />;
                        const ds = toStr(anio1, mes1, day);
                        const { cellBg, circBg, isEP } = getCellStyle(ds, inicio, fin, hover);
                        const isToday = ds === hoy;
                        return (
                            <div key={ds}
                                style={{ height: CELL, background: cellBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                onClick={() => handleDay(ds)}
                                onMouseEnter={() => inicio && !fin && setHover(ds)}
                            >
                                <span style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: CELL - 2, height: CELL - 2, borderRadius: '50%',
                                    background: circBg,
                                    color: isEP ? '#fff' : isToday ? ACCENT : 'var(--fg1)',
                                    fontSize: 11.5, fontWeight: isEP ? 700 : isToday ? 600 : 400,
                                    outline: isToday && !isEP ? `1.5px solid ${ACCENT}` : 'none',
                                    outlineOffset: -1, transition: 'background .1s',
                                }}>
                                    {day}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <>
            <style>{DRP_CSS}</style>
            <div className="drp-root" onMouseLeave={() => setHover(null)}>
                <div className="drp-body">

                    {/* calendarios */}
                    <div className="drp-cal-wrap">
                        <div className="drp-cals">
                            {renderCal1()}
                            {/* segundo calendario: oculto en móvil */}
                            <div className="drp-cal2">
                                <div style={{ width: 1, background: 'var(--border)', margin: '0 14px' }} />
                                {renderCal(anio2, mes2, false, true)}
                            </div>
                        </div>
                        {/* chips de rango seleccionado */}
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
                            <span style={chip(!!inicio)}>{inicio ? fmtDisplay(inicio) : 'Fecha inicio'}</span>
                            <span style={{ color: 'var(--fg4)' }}>→</span>
                            <span style={chip(!!(fin || (hover && inicio)))}>
                                {fin ? fmtDisplay(fin) : (hover && inicio ? fmtDisplay(hover) : 'Fecha fin')}
                            </span>
                        </div>
                    </div>

                    {/* divisor calendarios / paneles */}
                    <div className="drp-div-main" />

                    {/* paneles laterales */}
                    <div className="drp-panels">

                        {/* accesos rápidos */}
                        <div className="drp-presets">
                            <div style={lblSec}>Accesos rápidos</div>
                            {PRESETS.map((p, i) => (
                                <button key={i} onClick={() => handlePreset(i)} style={presetBtn(activePreset === i)}>
                                    {activePreset === i && <span style={{ marginRight: 5, fontSize: 10 }}>✓</span>}
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* divisor entre paneles */}
                        <div className="drp-div-v" />

                        {/* mes / año */}
                        <div className="drp-mesanio">
                            <div style={lblSec}>Mes / Año</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                <button onClick={() => setAnioSel(a => a - 1)} style={sBtn}><FiChevronLeft size={13} /></button>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg1)' }}>{anioSel}</span>
                                <button onClick={() => setAnioSel(a => a + 1)} style={sBtn}><FiChevronRight size={13} /></button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
                                {MESES_C.map((m, i) => {
                                    const activo = mesSel === i;
                                    return (
                                        <button key={i} onClick={() => setMesSel(i)} style={{
                                            padding: '4px 2px', fontSize: 10.5, fontWeight: activo ? 700 : 500,
                                            borderRadius: 5, cursor: 'pointer',
                                            border: activo ? `1px solid ${ACCENT}` : '1px solid transparent',
                                            background: activo ? 'rgba(14,165,233,0.15)' : 'transparent',
                                            color: activo ? ACCENT : 'var(--fg3)', transition: 'all .1s',
                                        }}>
                                            {m}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={handleMesAnio} style={{ marginTop: 8, fontSize: 11.5, padding: '6px 0', background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                                Aplicar mes
                            </button>
                        </div>
                    </div>
                </div>

                {/* pie */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
                    <button onClick={onClear} style={{ fontSize: 12, padding: '5px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg2)', fontWeight: 500 }}>
                        Limpiar
                    </button>
                    <button
                        onClick={() => inicio && fin && onChange(inicio, fin)}
                        disabled={!(inicio && fin)}
                        style={{ fontSize: 12, padding: '5px 18px', background: inicio && fin ? ACCENT : 'var(--bg2)', color: inicio && fin ? '#fff' : 'var(--fg4)', border: `1px solid ${inicio && fin ? ACCENT : 'var(--border)'}`, borderRadius: 6, cursor: inicio && fin ? 'pointer' : 'default', fontWeight: 600, transition: 'all .15s' }}
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </>
    );
};

/* ─── helpers de estilo ─────────────────────────────────────── */
const sBtn = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--fg3)', padding: '2px 4px', borderRadius: 4,
    display: 'flex', alignItems: 'center',
};
const lblSec = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--fg4)', marginBottom: 4,
};
const presetBtn = (active) => ({
    textAlign: 'left', padding: '6px 8px', fontSize: 12,
    borderRadius: 6, border: 'none', cursor: 'pointer',
    background: active ? ACCENT : 'transparent',
    color: active ? '#fff' : 'var(--fg2)',
    fontWeight: active ? 600 : 400,
    transition: 'background .12s',
});
const chip = (filled) => ({
    padding: '3px 9px', borderRadius: 6, fontSize: 11,
    background: filled ? 'rgba(14,165,233,0.12)' : 'var(--bg2)',
    border: `1px solid ${filled ? 'rgba(14,165,233,0.3)' : 'var(--border)'}`,
    color: filled ? ACCENT : 'var(--fg4)',
    fontWeight: filled ? 600 : 400,
    transition: 'all .1s',
});

export default DateRangePicker;
