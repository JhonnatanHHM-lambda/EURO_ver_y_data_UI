import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiMenu, FiSun, FiMoon, FiMapPin, FiChevronDown, FiX,
         FiLock, FiCheck, FiAlertCircle, FiEye, FiEyeOff, FiLogOut,
         FiFileText, FiRefreshCw, FiXCircle, FiCheckCircle } from 'react-icons/fi';
import { useTheme } from '../../../../context/ThemeContext.jsx';
import { useSede }  from '../../../../context/SedeContext.jsx';
import swal from '../../../../utils/swal';
import api  from '../../../../services/api';
import '../utils/Navbar.scss';

const Navbar = ({ titulo, subtitulo, onMenuClick }) => {
    const navigate = useNavigate();
    const { theme, toggleTheme }                            = useTheme();
    const { sedes, sedeActiva, seleccionarSede, limpiarSede } = useSede();

    const [sedeOpen,     setSedeOpen]     = useState(false);
    const [notifOpen,    setNotifOpen]    = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifs,       setNotifs]       = useState([]);
    const [noLeidas,     setNoLeidas]     = useState(0);
    const [resolviendo,  setResolviendo]  = useState(null);
    const [nuevaPass,    setNuevaPass]    = useState('');
    const [verPass,      setVerPass]      = useState(false);

    const sedeRef    = useRef(null);
    const notifRef   = useRef(null);
    const userMenuRef = useRef(null);

    const user            = JSON.parse(localStorage.getItem('user') || '{}');
    const initials        = `${(user.nombres || 'U')[0]}${(user.apellidos || '')[0] || ''}`.toUpperCase();
    const fullName        = `${user.nombres || ''} ${user.apellidos || ''}`.trim();
    const permisos        = user.permisos_rol || [];
    const esAdmin         = user.is_superuser || permisos.includes('can_manage_users');
    const puedeVerNotif   = esAdmin || permisos.includes('can_view_contratos');

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        setUserMenuOpen(false);
        const result = await swal({
            title: 'Cerrar sesión', icon: 'question',
            showCancelButton: true, confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6366f1',
        });
        if (!result.isConfirmed) return;
        try { await api.post('auth/logout/', { refresh: localStorage.getItem('refresh_token') }); } catch {}
        localStorage.clear();
        navigate('/');
    };

    // ── Notificaciones ────────────────────────────────────────────────────────
    const cargarNotificaciones = useCallback(async () => {
        if (!puedeVerNotif) return;
        try {
            const r = await api.get('admin/notificaciones/');
            setNotifs(r.data.notificaciones || []);
            setNoLeidas(r.data.no_leidas || 0);
        } catch { /* silencioso */ }
    }, [puedeVerNotif]);

    useEffect(() => { cargarNotificaciones(); }, [cargarNotificaciones]);

    useEffect(() => {
        if (!puedeVerNotif) return;
        const interval = setInterval(cargarNotificaciones, 60000);
        return () => clearInterval(interval);
    }, [puedeVerNotif, cargarNotificaciones]);

    const abrirNotif = () => {
        setNotifOpen(o => !o);
        setUserMenuOpen(false);
        setResolviendo(null); setNuevaPass('');
    };

    const marcarLeida = useCallback((id) => {
        const notif = notifs.find(n => n.id === id);
        if (!notif || notif.leida) return;
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
        setNoLeidas(prev => Math.max(0, prev - 1));
        api.put(`admin/notificaciones/${id}/`).catch(() => {});
    }, [notifs]);

    const resolverTicket = async (solicitudId) => {
        if (!nuevaPass.trim() || nuevaPass.length < 8) {
            swal({ icon: 'warning', title: 'Contraseña muy corta', text: 'Mínimo 8 caracteres.' });
            return;
        }
        try {
            const r = await api.post(`admin/recuperaciones/${solicitudId}/resolver/`, { nueva_password: nuevaPass });
            swal({
                icon: 'success', title: 'Contraseña actualizada',
                html: `<p style="font-size:13px">${r.data.mensaje}</p>`,
                confirmButtonText: 'Entendido',
            });
            setResolviendo(null); setNuevaPass('');
            cargarNotificaciones();
        } catch (err) {
            swal({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'No se pudo resolver.' });
        }
    };

    // ── Cierre con click fuera ────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (sedeRef.current    && !sedeRef.current.contains(e.target))    setSedeOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <header className="vyd-topbar">
            <button className="vyd-burger" onClick={onMenuClick}><FiMenu size={20} /></button>

            <div className="vyd-topbar-title">
                <div className="vyd-tb-h1">{titulo || 'Dashboard'}</div>
                {subtitulo && <div className="vyd-tb-sub">{subtitulo}</div>}
            </div>

            <div className="vyd-topbar-right">
                {/* Selector de sede */}
                <div className="vyd-sede-wrap" ref={sedeRef}>
                    <button className={`vyd-sede-pill${sedeActiva ? ' set' : ''}`} onClick={() => setSedeOpen(o => !o)}>
                        <FiMapPin size={13} />
                        <span>{sedeActiva ? <b>{sedeActiva.nombre}</b> : 'Selecciona una sede'}</span>
                        {sedeActiva
                            ? <FiX size={12} style={{ marginLeft: 2 }} onClick={(e) => { e.stopPropagation(); limpiarSede(); }} />
                            : <FiChevronDown size={12} />}
                    </button>
                    {sedeOpen && (
                        <div className="vyd-sede-dropdown">
                            <div className="vyd-sede-dropdown-header">Sede activa</div>
                            {sedes.map(s => (
                                <button key={s.id}
                                    className={`vyd-sede-option${sedeActiva?.id === s.id ? ' active' : ''}`}
                                    onClick={() => { seleccionarSede(s); setSedeOpen(false); }}>
                                    <span className="vyd-sede-option-name">{s.nombre}</span>
                                    <span className="vyd-sede-option-city">{s.ciudad}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Toggle tema */}
                <button className={`vyd-theme-toggle${theme === 'light' ? ' is-light' : ''}`}
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>
                    {theme === 'dark' ? <FiSun size={15} /> : <FiMoon size={15} />}
                </button>

                {/* Campana */}
                {puedeVerNotif && (
                    <div className="vyd-notif-wrap" ref={notifRef}>
                        <button className="vyd-icon-btn" title="Notificaciones" onClick={abrirNotif}>
                            <FiBell size={16} />
                            {noLeidas > 0 && (
                                <span className="vyd-notif-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>
                            )}
                        </button>

                        {notifOpen && (
                            <div className="vyd-notif-dropdown">
                                <div className="vyd-notif-head">
                                    <span>Notificaciones</span>
                                    {noLeidas > 0 && <span className="vyd-notif-count">{noLeidas} nuevas</span>}
                                </div>
                                {notifs.length === 0 ? (
                                    <div className="vyd-notif-empty">
                                        <FiBell size={22} style={{ opacity: .3, marginBottom: 8 }} />
                                        <span>Sin notificaciones</span>
                                    </div>
                                ) : notifs.map(n => (
                                    <div
                                        key={n.id}
                                        className={`vyd-notif-item${n.leida ? ' leida' : ''} clickeable`}
                                        onClick={() => {
                                            marcarLeida(n.id);
                                            if (n.contrato_id) {
                                                setNotifOpen(false);
                                                navigate(`/app/contratos?abrirContrato=${n.contrato_id}`);
                                            }
                                        }}
                                        title={n.contrato_id ? 'Ver contrato' : (!n.leida ? 'Marcar como leída' : undefined)}
                                    >
                                        <div className={`vyd-notif-icon${
                                            n.tipo === 'alerta_urgente' ? ' urgente'
                                            : n.tipo === 'alerta_contrato' ? ' contrato'
                                            : n.tipo === 'decision_director_terminacion' ? ' urgente'
                                            : n.tipo === 'decision_director_prorroga' ? ' contrato'
                                            : ''
                                        }`}>
                                            {n.tipo === 'alerta_urgente' || n.tipo === 'decision_director_terminacion'
                                                ? <FiAlertCircle size={14} />
                                                : n.tipo === 'alerta_contrato' || n.tipo === 'decision_director_prorroga'
                                                    ? <FiRefreshCw size={14} />
                                                    : n.tipo === 'condiciones_gh_listas'
                                                        ? <FiCheckCircle size={14} style={{ color: '#a855f7' }} />
                                                        : n.tipo === 'contrato_firmado_gh'
                                                            ? <FiCheckCircle size={14} style={{ color: '#22c55e' }} />
                                                            : <FiLock size={14} />}
                                        </div>
                                        <div className="vyd-notif-body">
                                            <div className="vyd-notif-titulo">{n.titulo}</div>
                                            <div className="vyd-notif-cuerpo">{n.cuerpo}</div>
                                            <div className="vyd-notif-fecha">
                                                {new Date(n.creado).toLocaleString('es-CO', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                            {n.solicitud?.estado === 'PENDIENTE_ADMIN' && (
                                                resolviendo === n.solicitud.id ? (
                                                    <div className="vyd-notif-resolver">
                                                        <div style={{ position: 'relative', display: 'flex' }}>
                                                            <input
                                                                type={verPass ? 'text' : 'password'}
                                                                placeholder="Nueva contraseña (mín. 8 caracteres)"
                                                                value={nuevaPass}
                                                                onChange={e => setNuevaPass(e.target.value)}
                                                                autoFocus autoComplete="new-password"
                                                                style={{
                                                                    flex: 1, padding: '7px 32px 7px 10px', fontSize: 12,
                                                                    borderRadius: 7, background: 'var(--bg-input)',
                                                                    border: '1px solid var(--border2)', color: 'var(--fg1)', outline: 'none',
                                                                }}
                                                            />
                                                            <button type="button" onClick={() => setVerPass(v => !v)}
                                                                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                                                                         background:'none', border:'none', cursor:'pointer', color:'var(--fg4)', padding:0 }}>
                                                                {verPass ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                                                            </button>
                                                        </div>
                                                        <div style={{ display:'flex', gap:6, marginTop:6 }}>
                                                            <button className="vyd-btn-sm" style={{ flex:1, padding:'6px 0', fontSize:11 }}
                                                                onClick={() => resolverTicket(n.solicitud.id)}>
                                                                <FiCheck size={11} /> Guardar contraseña
                                                            </button>
                                                            <button className="vyd-btn-sm ghost" style={{ padding:'6px 10px', fontSize:11 }}
                                                                onClick={() => { setResolviendo(null); setNuevaPass(''); }}>
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                        <p style={{ fontSize:10, color:'var(--fg4)', marginTop:6, lineHeight:1.4 }}>
                                                            Después de guardar, envía la contraseña al usuario por un medio seguro.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <button className="vyd-btn-sm" style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}
                                                        onClick={() => { setResolviendo(n.solicitud.id); setNuevaPass(''); setVerPass(false); }}>
                                                        <FiLock size={11} /> Asignar nueva contraseña
                                                    </button>
                                                )
                                            )}
                                            {n.solicitud?.estado === 'RESUELTO' && (
                                                <span style={{ fontSize:10, color:'#22c55e', display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                                                    <FiCheck size={11} /> Resuelto
                                                </span>
                                            )}
                                        </div>
                                        {!n.leida && <div className="vyd-notif-dot" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="vyd-tb-divider" />

                {/* Avatar + dropdown de usuario */}
                <div className="vyd-user-wrap" ref={userMenuRef}>
                    <button
                        className={`vyd-user${userMenuOpen ? ' open' : ''}`}
                        onClick={() => setUserMenuOpen(o => !o)}
                        title="Opciones de cuenta"
                    >
                        <div className="vyd-user-avatar">{initials}</div>
                        <div className="vyd-user-meta">
                            <div className="vyd-user-name">{fullName}</div>
                            <div className="vyd-user-role">{user.rol || 'Usuario'}</div>
                        </div>
                        <FiChevronDown size={13} className="vyd-user-chevron" />
                    </button>

                    {userMenuOpen && (
                        <div className="vyd-user-dropdown">
                            {/* Cabecera con info del usuario */}
                            <div className="vyd-user-dd-head">
                                <div className="vyd-user-dd-avatar">{initials}</div>
                                <div className="vyd-user-dd-info">
                                    <div className="vyd-user-dd-name">{fullName}</div>
                                    <div className="vyd-user-dd-email">{user.correo || user.email || ''}</div>
                                    <div className="vyd-user-dd-role">{user.rol || 'Usuario'}</div>
                                </div>
                            </div>
                            <div className="vyd-user-dd-divider" />
                            <button className="vyd-user-dd-item danger" onClick={handleLogout}>
                                <FiLogOut size={14} />
                                <span>Cerrar sesión</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
