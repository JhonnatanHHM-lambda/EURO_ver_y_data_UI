import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../Sidebar/components/Sidebar.jsx';
import Navbar from '../../Navbar/components/Navbar.jsx';
import '../utils/Layout.scss';

const Layout = () => {
    const [collapsed,   setCollapsed]   = useState(false);
    const [mobileOpen,  setMobileOpen]  = useState(false);

    const handleToggle      = useCallback(() => setCollapsed(c => !c), []);
    const handleMobileClose = useCallback(() => setMobileOpen(false), []);
    const handleBurger      = useCallback(() => setMobileOpen(o => !o), []);

    return (
        <div className={`vyd-shell${collapsed ? ' sb-collapsed' : ''}`}>
            <Sidebar
                collapsed={collapsed}
                onToggle={handleToggle}
                mobileOpen={mobileOpen}
                onMobileClose={handleMobileClose}
            />
            <div className="vyd-content-wrap">
                <Navbar onMenuClick={handleBurger} />
                <main className="vyd-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
