import { useState, useEffect, useRef } from 'react';

const MultiSelect = ({ value = [], onChange, options = [], placeholder = 'Seleccionar...' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (opt) =>
        onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);

    const label = value.length === 0 ? placeholder
                : value.length === 1 ? value[0]
                : `${value.length} seleccionadas`;

    return (
        <div className="dnm-multiselect" ref={ref}>
            <button
                type="button"
                className={`dnm-select dnm-multiselect-btn${value.length ? ' has-value' : ''}${open ? ' open' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                <span className="dnm-multiselect-label">{label}</span>
                <span className="dnm-multiselect-caret">▾</span>
            </button>
            {open && (
                <div className="dnm-multiselect-dropdown">
                    <div className="dnm-multiselect-actions">
                        <button type="button" className="dnm-multiselect-action"
                            onClick={() => onChange(options)}>
                            Todas
                        </button>
                        <button type="button" className="dnm-multiselect-action dnm-multiselect-action--clear"
                            onClick={() => onChange([])}
                            disabled={value.length === 0}>
                            Ninguna
                        </button>
                    </div>
                    {options.map(opt => (
                        <label key={opt} className={`dnm-multiselect-opt${value.includes(opt) ? ' selected' : ''}`}>
                            <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
                            <span>{opt}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
