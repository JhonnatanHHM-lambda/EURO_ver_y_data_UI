import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

const logout = () => {
    localStorage.clear();
    window.location.href = '/ver-y-data/';
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // No interceptar endpoints de autenticación
        if (original?.url?.includes('auth/')) return Promise.reject(error);

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true; // evitar bucle infinito

            const refresh = localStorage.getItem('refresh_token');
            if (!refresh) { logout(); return Promise.reject(error); }

            try {
                // Intentar renovar el access token con el refresh token
                const res = await axios.post(`${BASE_URL}auth/refresh/`, { refresh });
                const newToken = res.data.access;
                localStorage.setItem('access_token', newToken);
                // Reintentar la petición original con el nuevo token
                original.headers['Authorization'] = `Bearer ${newToken}`;
                return api(original);
            } catch {
                // El refresh token también expiró → cerrar sesión
                logout();
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
