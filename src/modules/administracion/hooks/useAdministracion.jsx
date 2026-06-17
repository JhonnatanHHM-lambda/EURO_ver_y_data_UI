import { useState, useEffect, useCallback } from 'react';
import swal from '../../../utils/swal';
import api from '../../../services/api';

const FORM_SEDE_VACIO    = { nombre: '', ciudad: '', codigo: '' };
const FORM_ORIGEN_VACIO  = { nombre: '', descripcion: '' };

const useAdministracion = () => {
    const [tab,      setTab]      = useState('sedes');   // 'sedes' | 'origenes'
    const [sedes,    setSedes]    = useState([]);
    const [origenes, setOrigenes] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [modal,    setModal]    = useState(false);
    const [editing,  setEditing]  = useState(null);      // objeto en edición o null
    const [form,     setForm]     = useState({});
    const [errores,  setErrores]  = useState({});

    // ── Carga de datos ────────────────────────────────────────────────────────
    const cargarSedes = useCallback(async () => {
        try {
            const r = await api.get('admin/sedes/');
            setSedes(r.data);
        } catch (err) {
            if (err.response?.status !== 403)
                swal({ title: 'Error', text: 'No se pudieron cargar las sedes.', icon: 'error' });
        }
    }, []);

    const cargarOrigenes = useCallback(async () => {
        try {
            const r = await api.get('admin/origenes/');
            setOrigenes(r.data);
        } catch (err) {
            if (err.response?.status !== 403)
                swal({ title: 'Error', text: 'No se pudieron cargar los orígenes.', icon: 'error' });
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([cargarSedes(), cargarOrigenes()]).finally(() => setLoading(false));
    }, [cargarSedes, cargarOrigenes]);

    // ── Modal ─────────────────────────────────────────────────────────────────
    const abrirCrear = () => {
        setEditing(null);
        setForm(tab === 'sedes' ? { ...FORM_SEDE_VACIO } : { ...FORM_ORIGEN_VACIO });
        setErrores({});
        setModal(true);
    };

    const abrirEditar = (item) => {
        setEditing(item);
        setForm(
            tab === 'sedes'
                ? { nombre: item.nombre, ciudad: item.ciudad, codigo: item.codigo, dias_alerta_director: item.dias_alerta_director ?? 5 }
                : { nombre: item.nombre, descripcion: item.descripcion || '' }
        );
        setErrores({});
        setModal(true);
    };

    const cerrarModal = () => { setModal(false); setEditing(null); setErrores({}); };

    const cambiarForm = (campo, valor) => {
        setForm(prev => ({ ...prev, [campo]: valor }));
        if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: '' }));
    };

    // ── Validación local ──────────────────────────────────────────────────────
    const validar = () => {
        const errs = {};
        if (!form.nombre?.trim()) errs.nombre = 'El nombre es obligatorio.';
        if (tab === 'sedes') {
            if (!form.ciudad?.trim()) errs.ciudad = 'La ciudad es obligatoria.';
            if (!form.codigo?.trim()) errs.codigo = 'El código es obligatorio.';
            else if (!/^[A-Z0-9\-]{2,20}$/i.test(form.codigo.trim()))
                errs.codigo = 'Solo letras, números y guiones (2–20 caracteres).';
        }
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Guardar (crear o editar) ───────────────────────────────────────────────
    const guardar = async () => {
        if (!validar()) return;

        const esSede  = tab === 'sedes';
        const base    = esSede ? 'admin/sedes/' : 'admin/origenes/';
        const payload = esSede
            ? { nombre: form.nombre.trim(), ciudad: form.ciudad.trim(), codigo: form.codigo.trim().toUpperCase(), dias_alerta_director: form.dias_alerta_director ?? 5 }
            : { nombre: form.nombre.trim().toUpperCase(), descripcion: form.descripcion?.trim() || '' };

        try {
            if (editing) {
                await api.put(`${base}${editing.id}/`, payload);
                swal({ title: 'Actualizado', icon: 'success', timer: 1800, showConfirmButton: false });
            } else {
                await api.post(base, payload);
                swal({ title: esSede ? 'Sede creada' : 'Origen creado', icon: 'success', timer: 1800, showConfirmButton: false });
            }
            cerrarModal();
            esSede ? cargarSedes() : cargarOrigenes();
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const serverErrs = {};
                Object.entries(data).forEach(([k, v]) => { serverErrs[k] = Array.isArray(v) ? v[0] : v; });
                setErrores(serverErrs);
                const msg = Object.values(serverErrs)[0];
                if (msg) swal({ title: 'Error al guardar', text: String(msg), icon: 'error' });
            } else {
                swal({ title: 'Error', text: 'No se pudo guardar.', icon: 'error' });
            }
        }
    };

    // ── Eliminar ─────────────────────────────────────────────────────────────
    const eliminar = async (item) => {
        const esSede  = tab === 'sedes';
        const label   = esSede ? `la sede "${item.nombre}"` : `el origen "${item.nombre}"`;

        const confirm = await swal({
            icon: 'warning',
            title: `¿Eliminar ${label}?`,
            text: 'Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });
        if (!confirm.isConfirmed) return;

        const base = esSede ? 'admin/sedes/' : 'admin/origenes/';
        try {
            await api.delete(`${base}${item.id}/`);
            swal({ title: 'Eliminado', icon: 'success', timer: 1800, showConfirmButton: false });
            esSede ? cargarSedes() : cargarOrigenes();
        } catch (err) {
            const data = err.response?.data;
            if (data?.protegido) {
                swal({
                    icon: 'error',
                    title: 'No se puede eliminar',
                    text: data.error,
                    confirmButtonText: 'Entendido',
                });
            } else {
                swal({ title: 'Error', text: data?.error || 'No se pudo eliminar.', icon: 'error' });
            }
        }
    };

    // ── Toggle estado (activo/inactivo) ───────────────────────────────────────
    const toggleEstado = async (item) => {
        const esSede = tab === 'sedes';
        const base   = esSede ? 'admin/sedes/' : 'admin/origenes/';
        try {
            await api.put(`${base}${item.id}/`, { estado: !item.estado });
            esSede ? cargarSedes() : cargarOrigenes();
        } catch {
            swal({ title: 'Error', text: 'No se pudo cambiar el estado.', icon: 'error' });
        }
    };

    return {
        tab, setTab,
        sedes, origenes, loading,
        modal, editing, form, errores,
        abrirCrear, abrirEditar, cerrarModal, cambiarForm, guardar, eliminar, toggleEstado,
    };
};

export default useAdministracion;
