import { useEffect } from 'react';
import swal from '../../../../utils/swal';
import api from '../../../../services/api';

const INACTIVITY_LIMIT  = 15 * 60 * 1000;  // 15 min sin actividad → mostrar alerta
const ALERT_DURATION    =  2 * 60 * 1000;  // 2 min para responder antes de cerrar sesión
const REFRESH_THRESHOLD =  5 * 60 * 1000;  // si quedan ≤5 min → refrescar silencioso
const CHECK_INTERVAL    = 20 * 1000;        // verificar cada 20 s

const useTokenRefresh = () => {
    useEffect(() => {
        let lastActivity  = Date.now();
        let alertShowing  = false;

        const logout = () => {
            localStorage.clear();
            window.location.href = '/ver-y-data/';
        };

        const silentRefresh = async () => {
            const refresh = localStorage.getItem('refresh_token');
            if (!refresh) { logout(); return false; }
            try {
                const res = await api.post('auth/refresh/', { refresh });
                localStorage.setItem('access_token', res.data.access);
                return true;
            } catch {
                logout();
                return false;
            }
        };

        // Cualquier interacción del usuario actualiza lastActivity
        const onActivity = () => { lastActivity = Date.now(); };
        const EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
        EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

        const check = async () => {
            if (alertShowing) return;

            const access  = localStorage.getItem('access_token');
            const refresh = localStorage.getItem('refresh_token');
            if (!access || !refresh) return;

            // Parsear tiempo restante del access token
            let timeLeft;
            try {
                const payload = JSON.parse(atob(access.split('.')[1]));
                timeLeft = payload.exp * 1000 - Date.now();
            } catch { return; }

            // Token ya expiró → el interceptor de api.js lo maneja (401 → logout)
            if (timeLeft <= 0) return;

            const inactive = Date.now() - lastActivity;

            // Usuario activo + token próximo a vencer → refrescar silenciosamente
            if (inactive < INACTIVITY_LIMIT && timeLeft <= REFRESH_THRESHOLD) {
                await silentRefresh();
                return;
            }

            // 15 min de inactividad → mostrar alerta con cuenta regresiva de 2 min
            if (inactive >= INACTIVITY_LIMIT) {
                alertShowing = true;
                const result = await swal({
                    icon:  'warning',
                    title: '¿Sigues ahí?',
                    text:  'Llevas 15 minutos inactivo. ¿Deseas continuar en la sesión?',
                    showCancelButton:    true,
                    confirmButtonText:   'Sí, continuar',
                    cancelButtonText:    'Cerrar sesión',
                    timer:               ALERT_DURATION,
                    timerProgressBar:    true,
                    allowOutsideClick:   false,
                    allowEscapeKey:      false,
                });
                alertShowing = false;

                if (result.isConfirmed) {
                    // Usuario confirmó → refrescar token y reiniciar temporizador
                    const ok = await silentRefresh();
                    if (ok) lastActivity = Date.now();
                } else {
                    // Sin respuesta (timer agotado) o eligió cerrar sesión
                    logout();
                }
            }
        };

        const interval = setInterval(check, CHECK_INTERVAL);
        check();

        return () => {
            clearInterval(interval);
            EVENTS.forEach(e => window.removeEventListener(e, onActivity));
        };
    }, []);
};

export default useTokenRefresh;
