import { useState } from 'react';
import { FiTrendingUp } from 'react-icons/fi';
import TabAusentismo from './tabs/TabAusentismo';
import TabNominaVenta from './tabs/TabNominaVenta';
import TabAntiguedad from './tabs/TabAntiguedad';
import '../utils/Dashboard.scss';

const TABS = [
    { id: 'ausentismo',   label: 'Ausentismo' },
    { id: 'nomina-venta', label: 'Nómina s/ Venta' },
    { id: 'antiguedad',   label: 'Antigüedad' },
];

const Dashboard = () => {
    const [active, setActive] = useState('ausentismo');

    return (
        <div className="vyd-main fade-in">
            <div>
                <h1 className="vyd-page-title"><FiTrendingUp size={20} /> Dashboard Nómina</h1>
                <p className="vyd-page-sub">Análisis de nómina, ausentismo y antigüedad de colaboradores</p>
            </div>

            <div className="dnm-tabs">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`dnm-tab${active === t.id ? ' active' : ''}`}
                        onClick={() => setActive(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="dnm-tab-content">
                {active === 'ausentismo'   && <TabAusentismo />}
                {active === 'nomina-venta' && <TabNominaVenta />}
                {active === 'antiguedad'   && <TabAntiguedad />}
            </div>
        </div>
    );
};

export default Dashboard;
