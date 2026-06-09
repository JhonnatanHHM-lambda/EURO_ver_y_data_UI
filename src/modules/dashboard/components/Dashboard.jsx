import { FiDatabase, FiUsers, FiShield, FiActivity } from 'react-icons/fi';
import '../utils/Dashboard.scss';

const kpis = [
    { label: 'Total Candidatos', value: '—', icon: <FiUsers size={18} />, variant: 'default' },
    { label: 'Habilitados', value: '—', icon: <FiShield size={18} />, variant: 'ok' },
    { label: 'Inhabilitados', value: '—', icon: <FiActivity size={18} />, variant: 'danger' },
    { label: 'Bases cargadas', value: '0 / 15', icon: <FiDatabase size={18} />, variant: 'mute' },
];

const Dashboard = () => {
    return (
        <div className="vyd-main fade-in">
            <div>
                <h1 className="vyd-page-title"><FiDatabase size={20} /> Dashboard</h1>
                <p className="vyd-page-sub">Resumen general de la plataforma VER & DATA</p>
            </div>

            {/* Banner de sede */}
            <div className="vyd-gate">
                <div className="vyd-gate-icon">⚠️</div>
                <div className="vyd-gate-body">
                    <div className="vyd-gate-title">Selecciona una sede para continuar</div>
                    <div className="vyd-gate-text">Debes elegir una sede antes de subir archivos Excel o registrar candidatos.</div>
                </div>
                <select className="vyd-gate-select">
                    <option value="">Seleccionar sede...</option>
                    <option value="barranquilla">Barranquilla</option>
                </select>
            </div>

            {/* KPIs */}
            <div className="vyd-kpis">
                {kpis.map((k) => (
                    <div key={k.label} className={`vyd-kpi${k.variant !== 'default' ? ` ${k.variant}` : ''}`}>
                        <div className="vyd-kpi-num">{k.value}</div>
                        <div className="vyd-kpi-lbl">{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Placeholder módulos próximos */}
            <div className="vyd-panel">
                <div className="vyd-panel-head">
                    <div>
                        <div className="vyd-panel-title">Módulo de Trazabilidad</div>
                        <div className="vyd-panel-sub">Fase 1 — en desarrollo</div>
                    </div>
                </div>
                <div className="vyd-coming-soon">
                    <div className="vyd-coming-icon">🚧</div>
                    <div className="vyd-coming-text">La carga de Excel y la vista de trazabilidad estarán disponibles en la Fase 1.</div>
                    <div className="vyd-coming-meta">Meta: 15 de junio de 2026</div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
