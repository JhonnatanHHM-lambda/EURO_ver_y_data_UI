import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './modules/core/Login/components/Login.jsx';
import ProtectedRoute from './modules/core/ProtectedRoute/components/ProtectedRoute.jsx';
import Layout from './modules/core/Layout/components/Layout.jsx';
import RedireccionarDash from './modules/core/RedireccionarDash/components/RedireccionarDash.jsx';
import TienePermiso from './modules/core/TienePermiso/components/TienePermiso.jsx';
import Dashboard from './modules/dashboard/components/Dashboard.jsx';
import Trazabilidad from './modules/trazabilidad/components/Trazabilidad.jsx';
import TrazabilidadDetalle from './modules/trazabilidad/components/TrazabilidadDetalle.jsx';
import Usuarios from './modules/usuarios/components/Usuarios.jsx';
import Roles from './modules/roles/components/Roles.jsx';
import CargaExcel from './modules/carga/components/CargaExcel.jsx';
import BDCentralizada from './modules/bd_centralizada/components/BDCentralizada.jsx';
import Administracion from './modules/administracion/components/Administracion.jsx';
import AdminRegistros from './modules/adminRegistros/components/AdminRegistros.jsx';
import Contratos from './modules/contratos/components/Contratos.jsx';
import Contrataciones from './modules/contrataciones/components/Contrataciones.jsx';
import FirmaDigital from './modules/firma/components/FirmaDigital.jsx';
import FirmaGH from './modules/firma-gh/components/FirmaGH.jsx';
import OptimizacionCorreos from './modules/optimizacion_correos/components/OptimizacionCorreos.jsx';
import MigracionMasivaArchivo from './modules/migracion_masiva_archivo/components/MigracionMasivaArchivo.jsx';

function App() {
    return (
        <BrowserRouter basename="/ver-y-data">
            <div className="vyd-bg-canvas" />
            <Routes>
                {/* Públicas */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/firma/:token" element={<FirmaDigital />} />

                {/* Protegidas */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/app/inicio"      element={<RedireccionarDash />} />
                        <Route path="/app/sin-acceso"  element={
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                                          justifyContent:'center', minHeight:'60vh', gap:16, textAlign:'center' }}>
                                <span style={{ fontSize: 48 }}>🔒</span>
                                <h2 style={{ color:'var(--fg1)', margin:0 }}>Sin acceso</h2>
                                <p style={{ color:'var(--fg3)', maxWidth:360, margin:0 }}>
                                    Tu cuenta no tiene permisos asignados todavía.<br />
                                    Contacta al administrador del sistema.
                                </p>
                            </div>
                        } />

                        <Route path="/app/dashboard" element={<Dashboard />} />

                        <Route path="/app/trazabilidad" element={
                            <TienePermiso permiso="can_view_trazabilidad">
                                <Trazabilidad />
                            </TienePermiso>
                        } />
                        <Route path="/app/trazabilidad/:documento" element={
                            <TienePermiso permiso="can_view_trazabilidad">
                                <TrazabilidadDetalle />
                            </TienePermiso>
                        } />

                        <Route path="/app/usuarios" element={
                            <TienePermiso permiso="can_manage_users">
                                <Usuarios />
                            </TienePermiso>
                        } />

                        <Route path="/app/roles" element={
                            <TienePermiso permiso="can_manage_roles">
                                <Roles />
                            </TienePermiso>
                        } />

                        <Route path="/app/carga" element={
                            <TienePermiso permiso="can_upload_excel">
                                <CargaExcel />
                            </TienePermiso>
                        } />

                        <Route path="/app/bd-centralizada" element={
                            <TienePermiso permiso="can_manage_cargas">
                                <BDCentralizada />
                            </TienePermiso>
                        } />

                        <Route path="/app/administracion" element={
                            <TienePermiso permiso="can_manage_sedes">
                                <Administracion />
                            </TienePermiso>
                        } />

                        <Route path="/app/registros" element={
                            <TienePermiso permiso="can_edit_registros">
                                <AdminRegistros />
                            </TienePermiso>
                        } />

                        <Route path="/app/contratos" element={
                            <TienePermiso permiso="can_view_contratos">
                                <Contratos />
                            </TienePermiso>
                        } />

                        <Route path="/app/contrataciones" element={
                            <TienePermiso permiso="can_view_contrataciones">
                                <Contrataciones />
                            </TienePermiso>
                        } />

                        <Route path="/app/firma-gh" element={
                            <TienePermiso permiso="can_manage_firma_gh">
                                <FirmaGH />
                            </TienePermiso>
                        } />

                        <Route path="/app/optimizacion-correos" element={
                            <TienePermiso permiso="can_view_optimizacion_correos">
                                <OptimizacionCorreos />
                            </TienePermiso>
                        } />

                        <Route path="/app/migracion-masiva-archivo" element={
                            <TienePermiso permiso="can_view_migracion_masiva_archivo">
                                <MigracionMasivaArchivo />
                            </TienePermiso>
                        } />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
