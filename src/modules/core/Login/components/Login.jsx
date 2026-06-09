import { useState } from 'react';
import { FiMail, FiLock, FiDatabase, FiSearch, FiShield,
         FiArrowLeft, FiSun, FiMoon, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTheme } from '../../../../context/ThemeContext.jsx';
import useAuth from '../hooks/useAuth';
import euroLogo from '../../../../assets/euro-logo.png';
import '../utils/Login.scss';

const features = [
    { icon: <FiDatabase size={16} />, title: 'Base de datos centralizada',  desc: 'Unifica 17+ fuentes de datos de empleados en un solo repositorio.' },
    { icon: <FiSearch  size={16} />, title: 'Trazabilidad completa',        desc: 'Rastrea el historial de cualquier persona en todas las sedes.' },
    { icon: <FiShield  size={16} />, title: 'Verificación automática',      desc: 'Motor de verificación contra bases de inhabilitación en < 5 seg.' },
];

const Login = () => {
    const { theme, toggleTheme } = useTheme();
    const [verPassword, setVerPassword] = useState(false);
    const {
        paso, setPaso,
        correo, setCorreo, password, setPassword,
        otp, cargando, error,
        timerSegundos, formatTimer, otpRefs,
        handleLogin,
        handleOtpChange, handleOtpKeyDown, handleOtpPaste,
        handleReenviarOTP,
        handleRecuperarIniciar,
        handleRecuperarOtpChange,
        volverAlLogin,
    } = useAuth();

    return (
        <div className="vyd-auth">
            {/* Toggle tema */}
            <button
                className={`vyd-login-theme-btn${theme === 'light' ? ' is-light' : ''}`}
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            >
                {theme === 'dark' ? <FiSun size={15} /> : <FiMoon size={15} />}
            </button>

            {/* ── Panel izquierdo — marca ─────────────────────────────────── */}
            <div className="vyd-auth-split-brand">
                {/* Círculos decorativos */}
                <div className="vyd-circle c1" />
                <div className="vyd-circle c2" />
                <div className="vyd-circle c3" />
                <div className="vyd-circle c4" />
                <div className="vyd-circle c5" />

                <div className="vyd-asb-logo">
                    <img src={euroLogo} alt="Euro" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
                <h1 className="vyd-asb-title">
                    Euro<br />Supermercados
                </h1>
                <p className="vyd-asb-tagline">
                    Plataforma de verificación y trazabilidad de candidatos.
                </p>
                <ul className="vyd-asb-feats">
                    {features.map((f, i) => (
                        <li key={i}>
                            <div className="vyd-asb-fic">{f.icon}</div>
                            <div><b>{f.title}</b><span>{f.desc}</span></div>
                        </li>
                    ))}
                </ul>
                <span className="vyd-asb-foot">Lambda Analytics SAS · 2026</span>
            </div>

            {/* ── Panel derecho — formulario ──────────────────────────────── */}
            <div className="vyd-auth-formside">
                <div className="vyd-auth-card fade-in">

                    {/* ── Login: correo + contraseña ── */}
                    {paso === 'login' && (
                        <>
                            <div className="vyd-auth-logo">
                                <img src={euroLogo} alt="Euro" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            </div>
                            <div className="vyd-auth-brand">
                                <h1>Iniciar sesión</h1>
                                <p>Ingresa tus credenciales para acceder a la plataforma</p>
                            </div>

                            <form onSubmit={handleLogin}>
                                <div className="vyd-field">
                                    <label>Correo electrónico</label>
                                    <div className="vyd-input-icon">
                                        <FiMail size={15} className="vyd-input-ic" />
                                        <input
                                            type="email"
                                            className="vyd-input vyd-input-has-icon"
                                            placeholder="tu@correo.com"
                                            value={correo}
                                            onChange={e => setCorreo(e.target.value)}
                                            autoComplete="email"
                                            autoFocus
                                            disabled={cargando}
                                        />
                                    </div>
                                </div>

                                <div className="vyd-field">
                                    <label>Contraseña</label>
                                    <div className="vyd-input-password-wrap">
                                        <div className="vyd-input-icon" style={{ flex: 1 }}>
                                            <FiLock size={15} className="vyd-input-ic" />
                                            <input
                                                type={verPassword ? 'text' : 'password'}
                                                className="vyd-input vyd-input-has-icon"
                                                style={{ paddingRight: 40 }}
                                                placeholder="Tu contraseña"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                autoComplete="current-password"
                                                disabled={cargando}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="vyd-input-eye"
                                            onClick={() => setVerPassword(v => !v)}
                                            tabIndex={-1}
                                        >
                                            {verPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="vyd-auth-error">
                                        <FiShield size={14} />{error}
                                    </div>
                                )}

                                <button type="submit" className="vyd-btn" disabled={cargando}>
                                    {cargando
                                        ? <><span className="vyd-btn-spinner" /> Verificando...</>
                                        : 'Iniciar sesión'}
                                </button>
                            </form>

                            <div style={{ textAlign: 'center', marginTop: 20 }}>
                                <button
                                    type="button"
                                    className="vyd-auth-link"
                                    onClick={() => { setPaso('recuperar'); }}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── OTP de login ── */}
                    {paso === 'otp' && (
                        <>
                            <div className="vyd-auth-brand">
                                <h1>Verificación en dos pasos</h1>
                                <p>Revisa tu correo electrónico</p>
                            </div>

                            <div className="vyd-otp-sent">
                                Código enviado a <b>{correo}</b>.<br />
                                Válido por <b>{formatTimer(timerSegundos)}</b>.
                            </div>

                            <div className="vyd-otp-row" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => (otpRefs.current[i] = el)}
                                        type="text" inputMode="numeric" maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        className={`vyd-otp-cell${digit ? ' filled' : ''}`}
                                        disabled={cargando}
                                    />
                                ))}
                            </div>

                            {error && <div className="vyd-auth-error"><FiShield size={14} />{error}</div>}
                            {cargando && <div style={{ textAlign:'center', marginTop:10 }}><span className="vyd-btn-spinner" style={{ width:24, height:24, borderTopColor:'var(--accent)' }} /></div>}

                            <div className="vyd-otp-resend">
                                {timerSegundos > 0
                                    ? <span>Reenviar en <span className="vyd-otp-timer">{formatTimer(timerSegundos)}</span></span>
                                    : <button type="button" className="vyd-auth-link" onClick={handleReenviarOTP} disabled={cargando}>Reenviar código</button>}
                            </div>

                            <button type="button" className="vyd-btn vyd-btn-ghost" onClick={volverAlLogin}
                                style={{ marginTop: 12, display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                <FiArrowLeft size={14} /> Volver al inicio de sesión
                            </button>
                        </>
                    )}

                    {/* ── Recuperación paso 1: correo ── */}
                    {paso === 'recuperar' && (
                        <>
                            <div className="vyd-auth-brand">
                                <h1>Recuperar contraseña</h1>
                                <p>Ingresa tu correo para iniciar el proceso. Te enviaremos un código de verificación.</p>
                            </div>

                            <form onSubmit={handleRecuperarIniciar}>
                                <div className="vyd-field">
                                    <label>Correo electrónico</label>
                                    <div className="vyd-input-icon">
                                        <FiMail size={15} className="vyd-input-ic" />
                                        <input
                                            type="email"
                                            className="vyd-input vyd-input-has-icon"
                                            placeholder="tu@correo.com"
                                            value={correo}
                                            onChange={e => setCorreo(e.target.value)}
                                            autoFocus
                                            disabled={cargando}
                                        />
                                    </div>
                                </div>

                                {error && <div className="vyd-auth-error"><FiShield size={14} />{error}</div>}

                                <button type="submit" className="vyd-btn" disabled={cargando}>
                                    {cargando ? <><span className="vyd-btn-spinner" /> Enviando...</> : 'Enviar código de verificación'}
                                </button>
                            </form>

                            <button type="button" className="vyd-btn vyd-btn-ghost" onClick={volverAlLogin}
                                style={{ marginTop: 12, display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                <FiArrowLeft size={14} /> Volver al inicio de sesión
                            </button>
                        </>
                    )}

                    {/* ── Recuperación paso 2: OTP ── */}
                    {paso === 'recuperar-otp' && (
                        <>
                            <div className="vyd-auth-brand">
                                <h1>Verificar identidad</h1>
                                <p>Ingresa el código enviado a <b style={{ color:'var(--accent)' }}>{correo}</b></p>
                            </div>

                            <div className="vyd-otp-sent">
                                Al validar este código se creará un <b>ticket de recuperación</b> que el administrador atenderá y te asignará una nueva contraseña.
                            </div>

                            <div className="vyd-otp-row">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => (otpRefs.current[i] = el)}
                                        type="text" inputMode="numeric" maxLength={1}
                                        value={digit}
                                        onChange={e => handleRecuperarOtpChange(i, e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Backspace' && !otp[i] && i > 0)
                                                otpRefs.current[i - 1]?.focus();
                                        }}
                                        className={`vyd-otp-cell${digit ? ' filled' : ''}`}
                                        disabled={cargando}
                                    />
                                ))}
                            </div>

                            {error && <div className="vyd-auth-error"><FiShield size={14} />{error}</div>}
                            {cargando && <div style={{ textAlign:'center', marginTop:10 }}><span className="vyd-btn-spinner" style={{ width:24, height:24, borderTopColor:'var(--accent)' }} /></div>}

                            <button type="button" className="vyd-btn vyd-btn-ghost" onClick={() => setPaso('recuperar')}
                                style={{ marginTop: 12, display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                <FiArrowLeft size={14} /> Volver
                            </button>
                        </>
                    )}

                    {/* ── Recuperación OK ── */}
                    {paso === 'recuperar-ok' && (
                        <div className="vyd-recuperar-ok">
                            <span className="vyd-recuperar-icon">✅</span>
                            <h2>Ticket enviado</h2>
                            <p>
                                Tu solicitud fue registrada correctamente. El administrador recibirá una notificación
                                y te asignará una nueva contraseña. Una vez resuelta, el administrador te la enviará
                                por un medio seguro.
                            </p>
                            <button type="button" className="vyd-btn" onClick={volverAlLogin}>
                                Volver al inicio de sesión
                            </button>
                        </div>
                    )}

                    <div className="vyd-auth-meta">
                        Euro Supermercados · Gestión Humana · Lambda Analytics
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
