/**
 * Wrapper de SweetAlert2 que aplica automáticamente los colores
 * del tema activo (light / dark) sin necesidad de pasarlos en cada llamada.
 *
 * Uso básico:
 *   import swal, { swalColors } from 'utils/swal';
 *   swal({ title: '...', icon: 'error' });
 *
 * Para HTML con colores adaptativos:
 *   const c = swalColors();
 *   swal({ html: `<p style="color:${c.text}">...</p>` });
 */
import Swal from 'sweetalert2';

export const isLight = () =>
    document.documentElement.getAttribute('data-theme') === 'light';

/** Paleta de colores para usar en HTML inline dentro de alertas */
export const swalColors = () => isLight()
    ? {
        text:       '#334155',   // texto principal
        muted:      '#64748b',   // texto secundario / notas
        strong:     '#0f172a',   // énfasis
        accent:     '#6366f1',   // acento / links
        warning:    '#b45309',   // texto sobre fondo amarillo
        danger:     '#dc2626',   // texto de error
        success:    '#15803d',   // texto de éxito
        bgWarning:  'rgba(245,158,11,.10)',
        bdWarning:  'rgba(245,158,11,.35)',
        bgDanger:   'rgba(239,68,68,.08)',
        bdDanger:   'rgba(239,68,68,.25)',
      }
    : {
        text:       '#cbd5e1',
        muted:      '#94a3b8',
        strong:     '#f1f5f9',
        accent:     '#818cf8',
        warning:    '#fbbf24',
        danger:     '#f87171',
        success:    '#4ade80',
        bgWarning:  'rgba(245,158,11,.08)',
        bdWarning:  'rgba(245,158,11,.30)',
        bgDanger:   'rgba(239,68,68,.07)',
        bdDanger:   'rgba(239,68,68,.22)',
      };

const getThemeDefaults = () => isLight()
    ? {
        background:          '#f7f5ef',
        color:               '#1a1a1f',
        confirmButtonColor:  '#6366f1',
        cancelButtonColor:   '#94a3b8',
      }
    : {
        background:          '#1e293b',
        color:               '#ffffff',
        confirmButtonColor:  '#6366f1',
        cancelButtonColor:   '#475569',
      };

const swal = (opts) => Swal.fire({ ...getThemeDefaults(), ...opts });

export default swal;
