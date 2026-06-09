import { useState, useEffect } from 'react';
import swal from '../../../utils/swal';
import api from '../../../services/api';

const useRoles = () => {
    const [roles, setRoles] = useState([]);
    const [permisos, setPermisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', permisos: [] });

    const cargar = async () => {
        try {
            setLoading(true);
            const [rolRes, permRes] = await Promise.all([
                api.get('roles/'),
                api.get('permisos/'),
            ]);
            setRoles(rolRes.data);
            setPermisos(permRes.data);
        } catch {
            swal({ title: 'Error', text: 'No se pudieron cargar los roles.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const abrirModalCrear = () => {
        setEditing(null);
        setFormData({ name: '', permisos: [] });
        setModalOpen(true);
    };

    const abrirModalEditar = (rol) => {
        setEditing(rol);
        setFormData({ name: rol.name, permisos: rol.permisos || [] });
        setModalOpen(true);
    };

    const cerrarModal = () => { setModalOpen(false); setEditing(null); };

    const togglePermiso = (codename) => {
        setFormData((prev) => ({
            ...prev,
            permisos: prev.permisos.includes(codename)
                ? prev.permisos.filter((p) => p !== codename)
                : [...prev.permisos, codename],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`roles/${editing.id}/`, formData);
                swal({ title: 'Actualizado', icon: 'success', timer: 2000, showConfirmButton: false });
            } else {
                await api.post('roles/', formData);
                swal({ title: 'Rol creado', icon: 'success', timer: 2000, showConfirmButton: false });
            }
            cerrarModal();
            cargar();
        } catch (err) {
            const msg = err.response?.data?.name?.[0] || err.response?.data?.non_field_errors?.[0] || 'Error al guardar el rol.';
            swal({ title: 'Error', text: msg, icon: 'error' });
        }
    };

    const eliminar = async (rol) => {
        const result = await swal({
            title: `¿Eliminar rol "${rol.name}"?`,
            text: 'Los usuarios con este rol perderán sus permisos asociados.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });
        if (!result.isConfirmed) return;
        try {
            await api.delete(`roles/${rol.id}/`);
            swal({ title: 'Eliminado', icon: 'success', timer: 1800, showConfirmButton: false });
            cargar();
        } catch {
            swal({ title: 'Error', text: 'No se pudo eliminar el rol.', icon: 'error' });
        }
    };

    const permisosAgrupados = permisos.reduce((acc, p) => {
        const app = p.content_type?.app_label || 'otros';
        if (!acc[app]) acc[app] = [];
        acc[app].push(p);
        return acc;
    }, {});

    return {
        roles, loading, modalOpen, editing, formData, setFormData,
        permisos, permisosAgrupados,
        abrirModalCrear, abrirModalEditar, cerrarModal,
        handleSubmit, eliminar, togglePermiso,
    };
};

export default useRoles;
