import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const SedeContext = createContext();

export const SedeProvider = ({ children }) => {
    const [sedes, setSedes]       = useState([]);
    const [sedeActiva, setSedeActiva] = useState(() => {
        try { return JSON.parse(localStorage.getItem('vyd-sede-activa')) || null; } catch { return null; }
    });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        api.get('sedes/').then(r => setSedes(r.data)).catch(() => {});
    }, []);

    const seleccionarSede = (sede) => {
        setSedeActiva(sede);
        localStorage.setItem('vyd-sede-activa', JSON.stringify(sede));
    };

    const limpiarSede = () => {
        setSedeActiva(null);
        localStorage.removeItem('vyd-sede-activa');
    };

    return (
        <SedeContext.Provider value={{ sedes, sedeActiva, seleccionarSede, limpiarSede }}>
            {children}
        </SedeContext.Provider>
    );
};

export const useSede = () => useContext(SedeContext);
