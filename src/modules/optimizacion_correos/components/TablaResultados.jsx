const ESTADO_LABEL = {
    CONCILIADA:      'Conciliada',
    REVISION_MANUAL: 'Revisión manual',
    SOLO_RADIAN:     'Solo RADIAN',
    SOLO_CORREO:     'Solo correo',
};

const fmtMonto = (v) =>
    v != null
        ? Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
        : '—';

const fmtFecha = (f) => {
    if (!f) return '—';
    try {
        return new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return f; }
};

const truncCufe = (cufe) =>
    cufe ? `${cufe.substring(0, 20)}…` : '—';

const EstadoBadge = ({ estado }) => (
    <span className={`vyd-oc-estado-badge ${estado}`}>
        {ESTADO_LABEL[estado] || estado}
    </span>
);

const TablaResultados = ({ resultados, cargando }) => {
    if (cargando) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }

    if (!resultados.length) {
        return (
            <div className="vyd-tbl-empty">
                No hay resultados para los filtros seleccionados.
            </div>
        );
    }

    return (
        <div className="vyd-tbl-wrap">
            <table className="vyd-tbl">
                <thead>
                    <tr>
                        <th>Estado</th>
                        <th>Niv.</th>
                        <th>CUFE</th>
                        <th>Número</th>
                        <th>NIT Prov.</th>
                        <th>Nombre Proveedor</th>
                        <th style={{ textAlign: 'right' }}>Monto RADIAN</th>
                        <th style={{ textAlign: 'right' }}>Monto Correo</th>
                        <th style={{ textAlign: 'right' }}>Delta</th>
                        <th>Fecha RADIAN</th>
                        <th>Fecha Correo</th>
                        <th>Asunto Correo</th>
                    </tr>
                </thead>
                <tbody>
                    {resultados.map((r) => (
                        <tr key={r.id}>
                            <td><EstadoBadge estado={r.estado} /></td>
                            <td style={{ fontSize: 11, color: 'var(--fg3)', fontWeight: 600 }}>
                                {r.nivel_match || '—'}
                            </td>
                            <td>
                                <span
                                    className="vyd-oc-cufe"
                                    title={r.cufe}
                                >
                                    {truncCufe(r.cufe)}
                                </span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                {r.numero || '—'}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--fg2)' }}>
                                {r.nit_proveedor || '—'}
                            </td>
                            <td style={{ fontSize: 12, maxWidth: 200 }}>
                                {r.nombre_proveedor || '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {fmtMonto(r.monto_radian)}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {fmtMonto(r.monto_correo)}
                            </td>
                            <td style={{
                                textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums',
                                color: r.delta_monto != null && Math.abs(r.delta_monto) > 0
                                    ? '#ef4444' : 'var(--fg3)',
                            }}>
                                {r.delta_monto != null ? fmtMonto(r.delta_monto) : '—'}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--fg2)' }}>
                                {fmtFecha(r.fecha_radian)}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--fg2)' }}>
                                {fmtFecha(r.fecha_correo)}
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--fg3)', maxWidth: 220 }}
                                title={r.asunto_correo}>
                                {r.asunto_correo
                                    ? r.asunto_correo.length > 50
                                        ? `${r.asunto_correo.substring(0, 50)}…`
                                        : r.asunto_correo
                                    : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TablaResultados;
