import { useState } from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';
import '../utils/DataTable.scss';

const DataTable = ({
    data = [],
    columns = [],
    renderActions,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
}) => {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    const handleSort = (key) => {
        setSortOrder(sortColumn === key && sortOrder === 'asc' ? 'desc' : 'asc');
        setSortColumn(key);
    };

    const sorted = [...data].sort((a, b) => {
        if (!sortColumn) return 0;
        const va = a[sortColumn], vb = b[sortColumn];
        if (va == null) return 1;
        if (vb == null) return -1;
        return sortOrder === 'asc'
            ? String(va).localeCompare(String(vb))
            : String(vb).localeCompare(String(va));
    });

    if (loading) {
        return (
            <div className="vyd-table-loading">
                <div className="spinner" />
                <span>Cargando datos...</span>
            </div>
        );
    }

    return (
        <div className="vyd-tbl-wrap">
            <table className="vyd-tbl">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                                style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {col.label}
                                    {col.sortable && sortColumn === col.key && (
                                        sortOrder === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />
                                    )}
                                </span>
                            </th>
                        ))}
                        {renderActions && <th>Acciones</th>}
                    </tr>
                </thead>
                <tbody>
                    {sorted.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (renderActions ? 1 : 0)} className="vyd-tbl-empty">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        sorted.map((row, idx) => (
                            <tr key={row.id || idx}>
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                                    </td>
                                ))}
                                {renderActions && <td>{renderActions(row)}</td>}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
