import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { useUser } from '../../../../context/UserContext';

/*
  Pasos del flujo:
  'login'          → paso 1: correo + contraseña
  'otp'            → paso 2: código OTP del login
  'recuperar'      → ingresa correo para recuperación
  'recuperar-otp'  → código OTP de recuperación
  'recuperar-ok'   → confirmación de ticket enviado
*/

const useAuth = () => {
    const [paso,      setPaso]      = useState('login');
    const [correo,    setCorreo]    = useState('');
    const [password,  setPassword]  = useState('');
    const [otp,       setOtp]       = useState(['', '', '', '', '', '']);
    const [cargando,  setCargando]  = useState(false);
    const [error,     setError]     = useState('');
    const [timerSegundos, setTimerSegundos] = useState(0);
    const otpRefs = useRef([]);
    const navigate  = useNavigate();
    const { setUser } = useUser();

    // Timer OTP
    useEffect(() => {
        if (timerSegundos <= 0) return;
        const interval = setInterval(() => {
            setTimerSegundos(s => { if (s <= 1) { clearInterval(interval); return 0; } return s - 1; });
        }, 1000);
        return () => clearInterval(interval);
    }, [timerSegundos]);

    const formatTimer = (s) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ── Paso 1: correo + contraseña ─────────────────────────────────────────
    const handleLogin = async (e) => {
        e?.preventDefault();
        if (!correo.trim()) { setError('Ingresa tu correo electrónico.'); return; }
        if (!password.trim()) { setError('Ingresa tu contraseña.'); return; }

        setError('');
        setCargando(true);
        try {
            await api.post('auth/login/', {
                correo: correo.trim().toLowerCase(),
                password,
            });
            setOtp(['', '', '', '', '', '']);
            setTimerSegundos(10 * 60);
            setPaso('otp');
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            setError(err.response?.data?.error || 'Credenciales incorrectas.');
        } finally {
            setCargando(false);
        }
    };

    // ── Paso 2: verificar OTP del login ────────────────────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const nuevo = [...otp];
        nuevo[index] = value.slice(-1);
        setOtp(nuevo);
        setError('');
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
        if (nuevo.every(d => d !== '')) handleVerificarOTP(nuevo.join(''));
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0)
            otpRefs.current[index - 1]?.focus();
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const nuevo = pasted.split('');
            setOtp(nuevo);
            otpRefs.current[5]?.focus();
            handleVerificarOTP(pasted);
        }
    };

    const handleVerificarOTP = async (codigoCompleto) => {
        const codigo = codigoCompleto || otp.join('');
        if (codigo.length < 6) return;

        setCargando(true);
        setError('');
        try {
            const response = await api.post('auth/verificar-otp/', {
                correo: correo.trim().toLowerCase(),
                codigo,
            });

            localStorage.setItem('access_token',  response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);

            const userData = {
                user_id:        response.data.user.id,
                cedula:         response.data.user.cedula,
                nombres:        response.data.user.nombres,
                apellidos:      response.data.user.apellidos,
                nombre_completo: response.data.user.nombre_completo,
                correo:         response.data.user.correo,
                rol:            response.data.user.rol,
                permisos_rol:   response.data.user.permisos_rol,
                estado:         response.data.user.estado,
                is_superuser:   response.data.user.is_superuser,
            };

            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            navigate('/app/inicio', { replace: true });
        } catch (err) {
            setError(err.response?.data?.error || 'Código incorrecto o expirado.');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setCargando(false);
        }
    };

    const handleReenviarOTP = async () => {
        if (timerSegundos > 0) return;
        setError('');
        setCargando(true);
        try {
            await api.post('auth/login/', { correo: correo.trim().toLowerCase(), password });
            setOtp(['', '', '', '', '', '']);
            setTimerSegundos(10 * 60);
            otpRefs.current[0]?.focus();
        } catch {
            setError('No se pudo reenviar el código.');
        } finally {
            setCargando(false);
        }
    };

    // ── Recuperación de contraseña ──────────────────────────────────────────
    const handleRecuperarIniciar = async (e) => {
        e?.preventDefault();
        if (!correo.trim()) { setError('Ingresa tu correo electrónico.'); return; }

        setError('');
        setCargando(true);
        try {
            await api.post('auth/recuperar/', { correo: correo.trim().toLowerCase() });
            setOtp(['', '', '', '', '', '']);
            setTimerSegundos(10 * 60);
            setPaso('recuperar-otp');
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            setError(err.response?.data?.error || 'No se encontró esa cuenta.');
        } finally {
            setCargando(false);
        }
    };

    const handleRecuperarValidarOTP = async (codigoCompleto) => {
        const codigo = codigoCompleto || otp.join('');
        if (codigo.length < 6) return;

        setCargando(true);
        setError('');
        try {
            await api.post('auth/recuperar/validar/', {
                correo: correo.trim().toLowerCase(),
                codigo,
            });
            setPaso('recuperar-ok');
        } catch (err) {
            setError(err.response?.data?.error || 'Código incorrecto o expirado.');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setCargando(false);
        }
    };

    const handleRecuperarOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const nuevo = [...otp];
        nuevo[index] = value.slice(-1);
        setOtp(nuevo);
        setError('');
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
        if (nuevo.every(d => d !== '')) handleRecuperarValidarOTP(nuevo.join(''));
    };

    const volverAlLogin = () => {
        setPaso('login');
        setOtp(['', '', '', '', '', '']);
        setError('');
        setPassword('');
    };

    return {
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
    };
};

export default useAuth;
