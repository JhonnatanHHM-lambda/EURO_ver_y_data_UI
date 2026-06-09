import { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiSearch, FiUser, FiPlus, FiArrowLeft, FiSave, FiAlertCircle } from 'react-icons/fi';
import api from '../../../services/api';
import swal from '../../../utils/swal';
import './ModalAgregarRegistro.scss';

const TIPOS_DOC  = ['CC', 'CE', 'TI', 'PA', 'PEP', 'NIT', 'OTRO'];
const ESTADOS    = [
    { value: 'REGISTRADO',                 label: 'Registrado' },
    { value: 'HABILITADO',                 label: 'Habilitado' },
    { value: 'INHABILITADO',              label: 'Inhabilitado' },
    { value: 'VERIFICACION_PARCIAL',       label: 'Verificación parcial' },
    { value: 'REVISION_MANUAL_AUTORIZADA', label: 'Revisión manual autorizada' },
    { value: 'REVISION_MANUAL_RECHAZADA',  label: 'Revisión manual rechazada' },
];
const PROCESOS   = [
    { value: '',            label: '— Sin especificar —' },
    { value: 'EMPLEADO',    label: 'Empleado' },
    { value: 'RETIRADO',    label: 'Retirado' },
    { value: 'SELECCIONADO',label: 'Seleccionado' },
    { value: 'CANDIDATO',   label: 'Candidato' },
    { value: 'ENTREVISTADO',label: 'Entrevistado' },
    { value: 'APRENDIZ',    label: 'Aprendiz' },
    { value: 'PASANTE',     label: 'Pasante' },
];

const FORM_VACIO = {
    documento_id: '', tipo_documento: 'CC', nombre_completo: '',
    tipo_proceso: '', estado_candidato: 'REGISTRADO',
    sede_id: '', cargo: '',
    fecha_ingreso: '', fecha_retiro: '', motivo_retiro: '',
    celular: '', email: '',
    fecha_nacimiento: '', sexo: '', tipo_sangre: '', nivel_escolaridad: '',
    direccion: '', barrio_municipio: '', expedida_en: '',
    eps: '', pensiones: '', arl: '',
    psicologa: '', fecha_entrevista: '',
    observaciones: '',
};

const Field = ({ label, required, children, span2 = false }) => (
    <div className={`mar-field${span2 ? ' mar-field--span2' : ''}`}>
        <label className="mar-label">
            {label}{required && <span className="mar-required"> *</span>}
        </label>
        {children}
    </div>
);

// ── Paso 1: Búsqueda ─────────────────────────────────────────────────────────
const PasoBusqueda = ({ onSeleccionarExistente, onNuevaPersona }) => {
    const [query,       setQuery]       = useState('');
    const [resultados,  setResultados]  = useState([]);
    const [buscando,    setBuscando]    = useState(false);
    const timerRef = useRef(null);

    const buscar = useCallback((q) => {
        if (!q.trim() || q.trim().length < 2) { setResultados([]); return; }
        setBuscando(true);
        api.get('trazabilidad/empleados/', { params: { search: q, page_size: 6 } })
            .then(r => setResultados(Array.isArray(r.data?.results) ? r.data.results : []))
            .catch(() => setResultados([]))
            .finally(() => setBuscando(false));
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => buscar(val), 350);
    };

    return (
        <div className="mar-busqueda">
            <p className="mar-busqueda-hint">
                Busca si la persona ya existe para agregarle una nueva casilla,
                o crea un registro completamente nuevo.
            </p>

            <div className="mar-search-wrap">
                <FiSearch size={14} className="mar-search-icon" />
                <input
                    className="mar-search-input"
                    placeholder="Cédula o nombre completo…"
                    value={query}
                    onChange={handleChange}
                    autoFocus
                />
                {buscando && <div className="mar-search-spinner" />}
            </div>

            {resultados.length > 0 && (
                <div className="mar-resultados">
                    {resultados.map(r => (
                        <button
                            key={r.id}
                            className="mar-resultado-item"
                            onClick={() => onSeleccionarExistente(r)}
                        >
                            <div className="mar-resultado-main">
                                <FiUser size={13} />
                                <span className="mar-resultado-nombre">{r.nombre_completo}</span>
                                <span className="mar-resultado-doc">{r.tipo_documento} {r.documento_id}</span>
                            </div>
                            <div className="mar-resultado-meta">
                                {r.sede_nombre && <span>{r.sede_nombre}</span>}
                                <span className="mar-resultado-pill">{r.tipo_proceso || 'Sin proceso'}</span>
                                <span className="mar-add-label"><FiPlus size={10} /> Agregar casilla</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {query.trim().length >= 2 && !buscando && resultados.length === 0 && (
                <div className="mar-no-resultados">
                    Sin resultados para <strong>"{query}"</strong>
                </div>
            )}

            <button className="mar-btn-nueva" onClick={() => onNuevaPersona()}>
                <FiPlus size={14} /> Crear registro para nueva persona
            </button>
        </div>
    );
};

// ── Paso 2: Formulario ───────────────────────────────────────────────────────
const PasoFormulario = ({ personaBase, sedes, onGuardado, onVolver }) => {
    const esCasilla  = !!personaBase;
    const [form,     setForm]     = useState({
        ...FORM_VACIO,
        ...(personaBase ? {
            documento_id:   personaBase.documento_id   || '',
            tipo_documento: personaBase.tipo_documento  || 'CC',
            nombre_completo:personaBase.nombre_completo || '',
        } : {}),
    });
    const [guardando, setGuardando] = useState(false);

    const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

    const handleGuardar = async () => {
        if (!form.documento_id.trim()) {
            swal({ icon: 'warning', title: 'Campo requerido', text: 'El número de documento es obligatorio.' });
            return;
        }
        if (!form.nombre_completo.trim()) {
            swal({ icon: 'warning', title: 'Campo requerido', text: 'El nombre completo es obligatorio.' });
            return;
        }

        setGuardando(true);
        try {
            const res = await api.post('trazabilidad/registros/crear/', form);
            await swal({
                icon: 'success',
                title: esCasilla ? 'Casilla agregada' : 'Registro creado',
                text: esCasilla
                    ? `Nueva casilla agregada a ${res.data.nombre_completo}.`
                    : `Registro de ${res.data.nombre_completo} creado correctamente.`,
                timer: 2000,
                showConfirmButton: false,
            });
            onGuardado(res.data.documento_id);
        } catch (err) {
            swal({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'No se pudo guardar el registro.' });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
            <div className="mar-form-header">
                <button className="mar-volver" onClick={onVolver}>
                    <FiArrowLeft size={13} /> Volver a búsqueda
                </button>
                {esCasilla && (
                    <div className="mar-casilla-badge">
                        Nueva casilla para <strong>{personaBase.nombre_completo}</strong>
                    </div>
                )}
            </div>

            <div className="mar-body">
                {/* ── Identificación ──────────────────────────────────── */}
                <div className="mar-section-title">Identificación</div>
                <div className="mar-grid">
                    <Field label="Número de documento" required>
                        <input className="mar-input" value={form.documento_id}
                            onChange={set('documento_id')}
                            readOnly={esCasilla}
                            style={esCasilla ? { opacity: .6, cursor: 'default' } : {}} />
                    </Field>
                    <Field label="Tipo de documento" required>
                        <select className="mar-input mar-select" value={form.tipo_documento}
                            onChange={set('tipo_documento')} disabled={esCasilla}>
                            {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Nombre completo" required span2>
                        <input className="mar-input" value={form.nombre_completo}
                            onChange={set('nombre_completo')}
                            readOnly={esCasilla}
                            style={esCasilla ? { opacity: .6, cursor: 'default' } : {}} />
                    </Field>
                    <Field label="Expedida en">
                        <input className="mar-input" placeholder="Ciudad de expedición de la cédula"
                            value={form.expedida_en} onChange={set('expedida_en')} />
                    </Field>
                </div>

                {/* ── Clasificación ────────────────────────────────────── */}
                <div className="mar-section-title" style={{ marginTop: 22 }}>Clasificación</div>
                <div className="mar-grid">
                    <Field label="Tipo de proceso">
                        <select className="mar-input mar-select" value={form.tipo_proceso} onChange={set('tipo_proceso')}>
                            {PROCESOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Estado candidato">
                        <select className="mar-input mar-select" value={form.estado_candidato} onChange={set('estado_candidato')}>
                            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Sede">
                        <select className="mar-input mar-select" value={form.sede_id} onChange={set('sede_id')}>
                            <option value="">Sin sede</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>)}
                        </select>
                    </Field>
                    <Field label="Cargo">
                        <input className="mar-input" value={form.cargo} onChange={set('cargo')} />
                    </Field>
                </div>

                {/* ── Fechas y retiro ──────────────────────────────────── */}
                <div className="mar-section-title" style={{ marginTop: 22 }}>Fechas</div>
                <div className="mar-grid">
                    <Field label="Fecha de ingreso">
                        <input className="mar-input" type="date" value={form.fecha_ingreso} onChange={set('fecha_ingreso')} />
                    </Field>
                    <Field label="Fecha de retiro">
                        <input className="mar-input" type="date" value={form.fecha_retiro} onChange={set('fecha_retiro')} />
                    </Field>
                    <Field label="Motivo de retiro" span2>
                        <input className="mar-input" value={form.motivo_retiro} onChange={set('motivo_retiro')} />
                        <span className="mar-field-note">
                            Este es el texto que se muestra en la casilla del detalle de trazabilidad
                        </span>
                    </Field>
                    <Field label="Fecha de entrevista">
                        <input className="mar-input" type="date" value={form.fecha_entrevista} onChange={set('fecha_entrevista')} />
                    </Field>
                    <Field label="Psicóloga / Evaluador">
                        <input className="mar-input" value={form.psicologa} onChange={set('psicologa')} />
                    </Field>
                </div>

                {/* ── Contacto ─────────────────────────────────────────── */}
                <div className="mar-section-title" style={{ marginTop: 22 }}>Contacto y datos personales</div>
                <div className="mar-grid">
                    <Field label="Celular">
                        <input className="mar-input" value={form.celular} onChange={set('celular')} />
                    </Field>
                    <Field label="Correo electrónico">
                        <input className="mar-input" type="email" value={form.email} onChange={set('email')} />
                    </Field>
                    <Field label="Fecha de nacimiento">
                        <input className="mar-input" type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} />
                    </Field>
                    <Field label="Sexo">
                        <select className="mar-input mar-select" value={form.sexo} onChange={set('sexo')}>
                            <option value="">—</option>
                            <option value="MASCULINO">Masculino</option>
                            <option value="FEMENINO">Femenino</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </Field>
                    <Field label="Tipo de sangre">
                        <select className="mar-input mar-select" value={form.tipo_sangre} onChange={set('tipo_sangre')}>
                            {['','O+','O-','A+','A-','B+','B-','AB+','AB-'].map(t => <option key={t} value={t}>{t || '—'}</option>)}
                        </select>
                    </Field>
                    <Field label="Nivel de escolaridad">
                        <input className="mar-input" value={form.nivel_escolaridad} onChange={set('nivel_escolaridad')} />
                    </Field>
                </div>

                {/* ── Seguridad social ─────────────────────────────────── */}
                <div className="mar-section-title" style={{ marginTop: 22 }}>Seguridad social</div>
                <div className="mar-grid">
                    <Field label="EPS">
                        <input className="mar-input" value={form.eps} onChange={set('eps')} />
                    </Field>
                    <Field label="Pensiones">
                        <input className="mar-input" value={form.pensiones} onChange={set('pensiones')} />
                    </Field>
                    <Field label="ARL">
                        <input className="mar-input" value={form.arl} onChange={set('arl')} />
                    </Field>
                    <Field label="Centro de costos">
                        <input className="mar-input" value={form.centro_costos} onChange={set('centro_costos')} />
                    </Field>
                </div>

                {/* ── Ubicación ────────────────────────────────────────── */}
                <div className="mar-section-title" style={{ marginTop: 22 }}>Ubicación</div>
                <div className="mar-grid">
                    <Field label="Dirección" span2>
                        <input className="mar-input" value={form.direccion} onChange={set('direccion')} />
                    </Field>
                    <Field label="Barrio / Municipio">
                        <input className="mar-input" value={form.barrio_municipio} onChange={set('barrio_municipio')} />
                    </Field>
                </div>

                {/* ── Observaciones ────────────────────────────────────── */}
                <div className="mar-section-title" style={{ marginTop: 22 }}>Observaciones</div>
                <div className="mar-grid">
                    <Field label="Observaciones" span2>
                        <textarea className="mar-input mar-textarea" rows={3}
                            value={form.observaciones} onChange={set('observaciones')} />
                    </Field>
                </div>
            </div>

            {/* Footer */}
            <div className="mar-footer">
                <button className="mar-btn mar-btn--secondary" onClick={onVolver} disabled={guardando}>
                    Cancelar
                </button>
                <button className="mar-btn mar-btn--primary" onClick={handleGuardar} disabled={guardando}>
                    {guardando
                        ? <><span className="mar-spinner" /> Guardando…</>
                        : <><FiSave size={13} /> {esCasilla ? 'Agregar casilla' : 'Crear registro'}</>
                    }
                </button>
            </div>
        </>
    );
};

// ── Modal principal ──────────────────────────────────────────────────────────
const ModalAgregarRegistro = ({ onClose, onGuardado }) => {
    const [paso,          setPaso]          = useState('busqueda');  // 'busqueda' | 'formulario'
    const [personaBase,   setPersonaBase]   = useState(null);
    const [sedes,         setSedes]         = useState([]);

    useEffect(() => {
        api.get('admin/sedes/')
            .then(r => setSedes(Array.isArray(r.data) ? r.data : r.data?.sedes || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const h = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const irFormulario = (persona = null) => {
        setPersonaBase(persona);
        setPaso('formulario');
    };

    const handleGuardado = (documentoId) => {
        onGuardado?.(documentoId);
        onClose();
    };

    return (
        <div className="mar-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="mar-modal">
                {/* Header */}
                <div className="mar-header">
                    <div>
                        <div className="mar-title">
                            {paso === 'busqueda' ? 'Agregar registro' : (personaBase ? 'Nueva casilla' : 'Nuevo registro')}
                        </div>
                        <div className="mar-subtitle">
                            {paso === 'busqueda'
                                ? 'Busca una persona existente o crea un registro nuevo'
                                : 'Completa los datos del registro'}
                        </div>
                    </div>
                    <button className="mar-close" onClick={onClose}><FiX size={15} /></button>
                </div>

                {paso === 'busqueda' ? (
                    <PasoBusqueda
                        onSeleccionarExistente={(p) => irFormulario(p)}
                        onNuevaPersona={() => irFormulario(null)}
                    />
                ) : (
                    <PasoFormulario
                        personaBase={personaBase}
                        sedes={sedes}
                        onGuardado={handleGuardado}
                        onVolver={() => setPaso('busqueda')}
                    />
                )}
            </div>
        </div>
    );
};

export default ModalAgregarRegistro;
