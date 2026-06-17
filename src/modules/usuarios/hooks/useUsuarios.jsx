import { useState, useEffect } from 'react';
import swal from '../../../utils/swal';
import api from '../../../services/api';

const useUsuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({
        cedula: '', correo: '', nombres: '', apellidos: '',
        telefono: '', genero: '', password: '', grupos: [],
    });
    const [erroresCampos, setErroresCampos] = useState({});

    const cargar = async () => {
        try {
            setLoading(true);
            const [usrRes, rolRes] = await Promise.all([
                api.get('usuarios/'),
                api.get('roles/'),
            ]);
            setUsuarios(usrRes.data);
            setRoles(rolRes.data);
        } catch (err) {
            const msg = err.response?.status === 403 ? 'Acceso denegado' : 'Error al cargar usuarios';
            swal({ title: 'Error', text: msg, icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const usuariosFiltrados = usuarios.filter((u) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            u.nombre_completo?.toLowerCase().includes(q) ||
            u.correo?.toLowerCase().includes(q) ||
            u.cedula?.includes(q)
        );
    });

    const abrirModalCrear = () => {
        setEditing(null);
        setFormData({ cedula: '', correo: '', nombres: '', apellidos: '', telefono: '', genero: '', password: '', grupos: [] });
        setModalOpen(true);
    };

    const abrirModalEditar = (usuario) => {
        setEditing(usuario);
        setFormData({
            cedula: usuario.cedula || '',
            correo: usuario.correo || '',
            nombres: usuario.nombres || '',
            apellidos: usuario.apellidos || '',
            telefono: usuario.telefono || '',
            genero: usuario.genero || '',
            password: '',
            grupos: usuario.grupos || [],
        });
        setModalOpen(true);
    };

    const cerrarModal = () => { setModalOpen(false); setEditing(null); setErroresCampos({}); };

    const validarCampos = () => {
        const errs = {};
        const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.nombres.trim())
            errs.nombres = 'El nombre es obligatorio.';
        else if (formData.nombres.trim().length < 2)
            errs.nombres = 'Minimo 2 caracteres.';
        else if (formData.nombres.trim().length > 80)
            errs.nombres = 'Maximo 80 caracteres.';
        if (!formData.apellidos.trim())
            errs.apellidos = 'Los apellidos son obligatorios.';
        else if (formData.apellidos.trim().length < 2)
            errs.apellidos = 'Minimo 2 caracteres.';
        else if (formData.apellidos.trim().length > 80)
            errs.apellidos = 'Maximo 80 caracteres.';
        if (!editing) {
            if (!formData.cedula.trim())
                errs.cedula = 'La cedula es obligatoria.';
            else if (!/^\d{5,20}$/.test(formData.cedula.trim()))
                errs.cedula = 'Solo numeros, entre 5 y 20 digitos.';
            if (!formData.correo.trim())
                errs.correo = 'El correo es obligatorio.';
            else if (!emailReg.test(formData.correo.trim()))
                errs.correo = 'Formato de correo invalido.';
            if (!formData.password)
                errs.password = 'La contrasena es obligatoria al crear.';
            else if (formData.password.length < 8)
                errs.password = 'Minimo 8 caracteres.';
        } else if (formData.password && formData.password.length < 8) {
            errs.password = 'Si cambias la contrasena debe tener minimo 8 caracteres.';
        }
        if (formData.telefono && !/^\d{7,15}$/.test(formData.telefono.trim()))
            errs.telefono = 'Solo numeros, entre 7 y 15 digitos.';
        setErroresCampos(errs);
        return Object.keys(errs).length === 0;
    };

    const _detectarCambios = () => {
        if (!editing) return [];
        const LABELS = {
            nombres:   'Nombres',
            apellidos: 'Apellidos',
            correo:    'Correo electrónico',
            cedula:    'Cédula',
            telefono:  'Teléfono',
            genero:    'Género',
        };
        const GENERO_LABEL = { M: 'Masculino', F: 'Femenino', O: 'Otro', '': 'Sin especificar' };
        const cambios = [];

        Object.entries(LABELS).forEach(([campo, label]) => {
            const original = String(editing[campo] || '').trim();
            const nuevo    = String(formData[campo] || '').trim();
            if (original !== nuevo) {
                const display = campo === 'genero' ? (GENERO_LABEL[nuevo] || nuevo) : nuevo;
                cambios.push({ campo: label, nuevo: display || '(vacío)' });
            }
        });

        // Roles
        const rolesOrig = [...(editing.grupos || [])].sort().join(',');
        const rolesNuev = [...(formData.grupos  || [])].sort().join(',');
        if (rolesOrig !== rolesNuev) {
            cambios.push({ campo: 'Roles', nuevo: formData.grupos.join(', ') || 'Sin roles' });
        }

        if (formData.password?.trim()) {
            cambios.push({ campo: 'Contraseña', nuevo: '(nueva contraseña establecida)' });
        }
        return cambios;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validarCampos()) return;

        try {
            if (editing) {
                // Detectar cambios y pedir confirmación
                const cambios = _detectarCambios();
                if (cambios.length === 0) {
                    swal({ title: 'Sin cambios', text: 'No modificaste ningún campo.', icon: 'info', timer: 2000, showConfirmButton: false });
                    return;
                }

                const { swalColors } = await import('../../../utils/swal');
                const c = swalColors();
                const filas = cambios.map(ch =>
                    `<div style="display:flex;justify-content:space-between;align-items:center;
                                 padding:6px 10px;border-radius:7px;margin-bottom:5px;
                                 background:${c.bgWarning};border:1px solid ${c.bdWarning};">
                        <span style="font-weight:700;font-size:12px;color:${c.text}">${ch.campo}</span>
                        <span style="font-size:12px;color:${ch.campo === 'Contraseña' ? c.muted : c.warning}">${ch.campo === 'Contraseña' ? ch.nuevo : `→ ${ch.nuevo}`}</span>
                    </div>`
                ).join('');

                const confirm = await swal({
                    icon: 'question',
                    title: 'Confirmar cambios',
                    html: `<p style="color:${c.text};font-size:13px;margin-bottom:12px;">
                               Se modificarán <strong>${cambios.length}</strong> campo(s):
                           </p>${filas}`,
                    showCancelButton: true,
                    confirmButtonText: 'Sí, guardar',
                    cancelButtonText:  'Revisar',
                    width: 480,
                });
                if (!confirm.isConfirmed) return;

                const payload = {
                    nombres:          formData.nombres,
                    apellidos:        formData.apellidos,
                    correo:           formData.correo,
                    cedula:           formData.cedula,
                    genero:           formData.genero,
                    telefono:         formData.telefono,
                    fecha_nacimiento: formData.fecha_nacimiento || null,
                    estado:           true,
                    is_active:        true,
                    grupos:           formData.grupos,
                };
                if (formData.password?.trim()) payload.password = formData.password;
                await api.put(`usuarios/${editing.id}/`, payload);
                swal({ title: 'Actualizado', text: 'Usuario actualizado correctamente.', icon: 'success', timer: 2000, showConfirmButton: false });
            } else {
                const payload = { ...formData };
                if (!payload.password) delete payload.password;
                await api.post('usuarios/', payload);
                swal({ title: 'Creado', text: 'Usuario creado correctamente.', icon: 'success', timer: 2000, showConfirmButton: false });
            }
            cerrarModal();
            cargar();
        } catch (err) {
            const errData = err.response?.data;
            if (errData && typeof errData === 'object') {
                // Mapear errores del servidor a campos del formulario
                const serverErrs = {};
                Object.entries(errData).forEach(([campo, msgs]) => {
                    serverErrs[campo] = Array.isArray(msgs) ? msgs[0] : msgs;
                });
                setErroresCampos(serverErrs);
                const primerMsg = Object.values(serverErrs)[0];
                swal({ title: 'Error al guardar', text: primerMsg, icon: 'error' });
            } else {
                swal({ title: 'Error', text: 'Error al guardar el usuario.', icon: 'error' });
            }
        }
    };

    const desactivar = async (usuario) => {
        if (!usuario.is_active) {
            swal({ title: 'Usuario ya inactivo', text: 'Este usuario ya está desactivado.', icon: 'info', timer: 2000, showConfirmButton: false });
            return;
        }
        const result = await swal({
            title: `¿Desactivar a "${usuario.nombre_completo}"?`,
            text: 'El usuario no podrá iniciar sesión, pero sus datos se conservarán. Puedes reactivarlo editando el usuario.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, desactivar', cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b'
        });
        if (!result.isConfirmed) return;
        try {
            await api.patch(`usuarios/${usuario.id}/`, { is_active: false });
            swal({ title: 'Desactivado', text: 'El usuario ha sido desactivado.', icon: 'success', timer: 1800, showConfirmButton: false });
            cargar();
        } catch {
            swal({ title: 'Error', text: 'No se pudo desactivar el usuario.', icon: 'error' });
        }
    };

    const eliminar = async (usuario) => {
        const result = await swal({
            title: `¿Eliminar permanentemente a "${usuario.nombre_completo}"?`,
            html: '<p style="font-size:13px;color:var(--fg3)">Esta acción <strong style="color:#ef4444">no se puede deshacer</strong>. Todos los datos del usuario serán eliminados del sistema.</p>',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });
        if (!result.isConfirmed) return;
        try {
            await api.delete(`usuarios/${usuario.id}/`);
            swal({ title: 'Eliminado', icon: 'success', timer: 1800, showConfirmButton: false });
            cargar();
        } catch {
            swal({ title: 'Error', text: 'No se pudo eliminar el usuario.', icon: 'error' });
        }
    };

    return {
        usuarios: usuariosFiltrados, roles, loading, modalOpen, editing,
        search, setSearch, formData, setFormData, erroresCampos,
        abrirModalCrear, abrirModalEditar, cerrarModal, handleSubmit, desactivar, eliminar,
    };
};

export default useUsuarios;
