import { useState, useEffect } from 'react';
import { FiX, FiSave, FiAlertCircle } from 'react-icons/fi';
import api from '../../../services/api';
import swal from '../../../utils/swal';
import './ModalEditarRegistro.scss';

const ESTADOS = [
    { value: 'REGISTRADO',                 label: 'Registrado' },
    { value: 'HABILITADO',                 label: 'Habilitado' },
    { value: 'INHABILITADO',              label: 'Inhabilitado' },
    { value: 'VERIFICACION_PARCIAL',       label: 'Verificación parcial' },
    { value: 'REVISION_MANUAL_AUTORIZADA', label: 'Revisión manual autorizada' },
    { value: 'REVISION_MANUAL_RECHAZADA',  label: 'Revisión manual rechazada' },
];

const PROCESOS = [
    { value: 'EMPLEADO',     label: 'Empleado' },
    { value: 'SELECCIONADO', label: 'Seleccionado' },
    { value: 'RETIRADO',     label: 'Retirado' },
    { value: 'CANDIDATO',    label: 'Candidato' },
    { value: 'ENTREVISTADO', label: 'Entrevistado' },
    { value: 'APRENDIZ',     label: 'Aprendiz' },
    { value: 'PASANTE',      label: 'Pasante' },
];

const TIPOS_DOC   = ['CC', 'CE', 'TI', 'PA', 'PEP', 'NIT', 'OTRO'];
const TIPOS_SANGRE = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const Field = ({ label, children, span2 = false }) => (
    <div className={`mer-field${span2 ? ' mer-field--span2' : ''}`}>
        <label className="mer-label">{label}</label>
        {children}
    </div>
);

const SectionTitle = ({ children, first = false }) => (
    <div className="mer-section-title" style={first ? {} : { marginTop: 26 }}>{children}</div>
);

const ModalEditarRegistro = ({ registro, sedes, onClose, onGuardado }) => {
    const [form, setForm] = useState({
        // Identificación
        nombre_completo:   registro.nombre_completo   || '',
        documento_id:      registro.documento_id      || '',
        tipo_documento:    registro.tipo_documento    || 'CC',
        expedida_en:       registro.expedida_en       || '',
        // Proceso
        cargo:             registro.cargo             || '',
        sede_id:           registro.sede              || '',
        // Fechas
        fecha_ingreso:     registro.fecha_ingreso     || '',
        fecha_retiro:      registro.fecha_retiro      || '',
        motivo_retiro:     registro.motivo_retiro     || '',
        fecha_entrevista:  registro.fecha_entrevista  || '',
        psicologa:         registro.psicologa         || '',
        // Contacto
        celular:           registro.celular           || '',
        email:             registro.email             || '',
        // Datos personales
        fecha_nacimiento:  registro.fecha_nacimiento  || '',
        sexo:              registro.sexo              || '',
        tipo_sangre:       registro.tipo_sangre       || '',
        nivel_escolaridad: registro.nivel_escolaridad || '',
        // Seguridad social
        eps:               registro.eps               || '',
        pensiones:         registro.pensiones         || '',
        arl:               registro.arl               || '',
        centro_costos:     registro.centro_costos     || '',
        // Ubicación
        direccion:         registro.direccion         || '',
        barrio_municipio:  registro.barrio_municipio  || '',
        // Notas
        observaciones:     registro.observaciones     || '',
        motivo_inhabilitacion: registro.motivo_inhabilitacion || '',
        // Clasificación
        estado_candidato:  registro.estado_candidato  || 'REGISTRADO',
        tipo_proceso:      registro.tipo_proceso      || '',
        justificacion:     '',
    });
    const [guardando, setGuardando] = useState(false);

    const cambioClasificacion =
        form.estado_candidato !== (registro.estado_candidato || 'REGISTRADO') ||
        form.tipo_proceso     !== (registro.tipo_proceso     || '');

    const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

    const handleGuardar = async () => {
        if (cambioClasificacion && !form.justificacion.trim()) {
            swal({ icon: 'warning', title: 'Justificación requerida',
                text: 'Debes justificar el cambio de estado o tipo de proceso.' });
            return;
        }

        setGuardando(true);
        try {
            const payload = { ...form, _doc_id_original: registro.documento_id };
            if (!payload.justificacion) delete payload.justificacion;
            const res = await api.put(`trazabilidad/registros/${registro.id}/editar/`, payload);
            const propagados = res.data?.propagados || 0;
            if (propagados > 0) {
                await swal({
                    icon: 'success', title: 'Cambios guardados',
                    text: `El registro fue actualizado. Nombre y/o cédula se propagaron a ${propagados} registro${propagados !== 1 ? 's' : ''} adicional${propagados !== 1 ? 'es' : ''} de la misma persona.`,
                    timer: 3000, showConfirmButton: false,
                });
            } else {
                await swal({ icon: 'success', title: 'Cambios guardados',
                    text: 'El registro fue actualizado correctamente.', timer: 1800, showConfirmButton: false });
            }
            onGuardado?.();
            onClose();
        } catch (err) {
            swal({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Error al guardar los cambios.' });
        } finally {
            setGuardando(false);
        }
    };

    useEffect(() => {
        const h = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    return (
        <div className="mer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="mer-modal">
                {/* Header */}
                <div className="mer-header">
                    <div>
                        <div className="mer-title">Editar registro</div>
                        <div className="mer-subtitle">
                            {registro.sede_nombre || registro.sede_ciudad || 'Sin sede'} &middot;{' '}
                            {registro.fecha_ingreso || '—'}
                        </div>
                    </div>
                    <button className="mer-close" onClick={onClose} title="Cerrar"><FiX size={15} /></button>
                </div>

                {/* Cuerpo */}
                <div className="mer-body">

                    {/* ── Identificación ─────────────────────────────── */}
                    <SectionTitle first>Identificación</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Nombre completo" span2>
                            <input className="mer-input" value={form.nombre_completo} onChange={set('nombre_completo')} />
                        </Field>
                        <Field label="Número de documento">
                            <input className="mer-input" value={form.documento_id} onChange={set('documento_id')} />
                        </Field>
                        <Field label="Tipo de documento">
                            <select className="mer-input mer-select" value={form.tipo_documento} onChange={set('tipo_documento')}>
                                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                        <Field label="Expedida en">
                            <input className="mer-input" placeholder="Ciudad de expedición"
                                value={form.expedida_en} onChange={set('expedida_en')} />
                        </Field>
                    </div>

                    {/* ── Proceso / Cargo ─────────────────────────────── */}
                    <SectionTitle>Proceso</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Cargo">
                            <input className="mer-input" value={form.cargo} onChange={set('cargo')} />
                        </Field>
                        <Field label="Sede">
                            <select className="mer-input mer-select" value={form.sede_id} onChange={set('sede_id')}>
                                <option value="">Sin sede</option>
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>)}
                            </select>
                        </Field>
                    </div>

                    {/* ── Fechas ──────────────────────────────────────── */}
                    <SectionTitle>Fechas</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Fecha de ingreso">
                            <input className="mer-input" type="date" value={form.fecha_ingreso} onChange={set('fecha_ingreso')} />
                        </Field>
                        <Field label="Fecha de retiro">
                            <input className="mer-input" type="date" value={form.fecha_retiro} onChange={set('fecha_retiro')} />
                        </Field>
                        <Field label="Motivo de retiro" span2>
                            <input className="mer-input" value={form.motivo_retiro} onChange={set('motivo_retiro')} />
                            <span className="mer-field-note">
                                Este es el texto que se muestra en la casilla del detalle de trazabilidad
                            </span>
                        </Field>
                        <Field label="Fecha de entrevista">
                            <input className="mer-input" type="date" value={form.fecha_entrevista} onChange={set('fecha_entrevista')} />
                        </Field>
                        <Field label="Psicóloga / Evaluador">
                            <input className="mer-input" value={form.psicologa} onChange={set('psicologa')} />
                        </Field>
                    </div>

                    {/* ── Contacto ────────────────────────────────────── */}
                    <SectionTitle>Contacto</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Celular">
                            <input className="mer-input" value={form.celular} onChange={set('celular')} />
                        </Field>
                        <Field label="Correo electrónico">
                            <input className="mer-input" type="email" value={form.email} onChange={set('email')} />
                        </Field>
                    </div>

                    {/* ── Datos personales ────────────────────────────── */}
                    <SectionTitle>Datos personales</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Fecha de nacimiento">
                            <input className="mer-input" type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} />
                        </Field>
                        <Field label="Sexo">
                            <select className="mer-input mer-select" value={form.sexo} onChange={set('sexo')}>
                                <option value="">—</option>
                                <option value="MASCULINO">Masculino</option>
                                <option value="FEMENINO">Femenino</option>
                                <option value="OTRO">Otro</option>
                            </select>
                        </Field>
                        <Field label="Tipo de sangre">
                            <select className="mer-input mer-select" value={form.tipo_sangre} onChange={set('tipo_sangre')}>
                                {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="Nivel de escolaridad">
                            <input className="mer-input" value={form.nivel_escolaridad} onChange={set('nivel_escolaridad')} />
                        </Field>
                    </div>

                    {/* ── Seguridad social ────────────────────────────── */}
                    <SectionTitle>Seguridad social</SectionTitle>
                    <div className="mer-grid">
                        <Field label="EPS">
                            <input className="mer-input" value={form.eps} onChange={set('eps')} />
                        </Field>
                        <Field label="Pensiones">
                            <input className="mer-input" value={form.pensiones} onChange={set('pensiones')} />
                        </Field>
                        <Field label="ARL">
                            <input className="mer-input" value={form.arl} onChange={set('arl')} />
                        </Field>
                        <Field label="Centro de costos">
                            <input className="mer-input" value={form.centro_costos} onChange={set('centro_costos')} />
                        </Field>
                    </div>

                    {/* ── Ubicación ───────────────────────────────────── */}
                    <SectionTitle>Ubicación</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Dirección" span2>
                            <input className="mer-input" value={form.direccion} onChange={set('direccion')} />
                        </Field>
                        <Field label="Barrio / Municipio">
                            <input className="mer-input" value={form.barrio_municipio} onChange={set('barrio_municipio')} />
                        </Field>
                    </div>

                    {/* ── Notas ───────────────────────────────────────── */}
                    <SectionTitle>Notas</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Observaciones" span2>
                            <textarea className="mer-input mer-textarea" rows={3}
                                value={form.observaciones} onChange={set('observaciones')} />
                        </Field>
                        <Field label="Motivo de inhabilitación" span2>
                            <input className="mer-input"
                                placeholder="Solo si el estado es INHABILITADO"
                                value={form.motivo_inhabilitacion} onChange={set('motivo_inhabilitacion')} />
                        </Field>
                    </div>

                    {/* ── Clasificación ───────────────────────────────── */}
                    <SectionTitle>Clasificación</SectionTitle>
                    <div className="mer-grid">
                        <Field label="Estado candidato">
                            <select className="mer-input mer-select" value={form.estado_candidato} onChange={set('estado_candidato')}>
                                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Tipo de proceso">
                            <select className="mer-input mer-select" value={form.tipo_proceso} onChange={set('tipo_proceso')}>
                                <option value="">Sin especificar</option>
                                {PROCESOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </Field>
                        <Field
                            label={
                                <span>
                                    Justificación{cambioClasificacion && <span className="mer-required"> *</span>}
                                </span>
                            }
                            span2
                        >
                            <textarea
                                className={`mer-input mer-textarea${cambioClasificacion && !form.justificacion.trim() ? ' mer-input--warn' : ''}`}
                                rows={3}
                                placeholder={cambioClasificacion
                                    ? 'Explica por qué se realiza este cambio de clasificación…'
                                    : 'Solo requerida si cambia el estado o el tipo de proceso'}
                                value={form.justificacion}
                                onChange={set('justificacion')}
                            />
                            {cambioClasificacion && !form.justificacion.trim() && (
                                <div className="mer-warn-hint">
                                    <FiAlertCircle size={11} /> La justificación es obligatoria al cambiar la clasificación
                                </div>
                            )}
                        </Field>
                    </div>
                </div>

                {/* Footer */}
                <div className="mer-footer">
                    <button className="mer-btn mer-btn--secondary" onClick={onClose} disabled={guardando}>
                        Cancelar
                    </button>
                    <button className="mer-btn mer-btn--primary" onClick={handleGuardar} disabled={guardando}>
                        {guardando
                            ? <><span className="mer-spinner" /> Guardando…</>
                            : <><FiSave size={13} /> Guardar cambios</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalEditarRegistro;
