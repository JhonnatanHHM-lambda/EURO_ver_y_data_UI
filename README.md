# Euro VER & DATA — Frontend UI

> Interfaz web de la plataforma de trazabilidad, verificación y gestión de candidatos y empleados para **Euro Supermercados**. Desarrollada por **Lambda Analytics**.

---

## Tabla de contenido

1. [Descripción del proyecto](#1-descripción-del-proyecto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Requisitos previos](#3-requisitos-previos)
4. [Instalación y configuración local](#4-instalación-y-configuración-local)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Estructura de carpetas](#6-estructura-de-carpetas)
7. [Scripts disponibles](#7-scripts-disponibles)
8. [Módulos, rutas y permisos](#8-módulos-rutas-y-permisos)
9. [Flujo de datos](#9-flujo-de-datos)
10. [Convenciones de código](#10-convenciones-de-código)
11. [Testing](#11-testing)
12. [Despliegue](#12-despliegue)
13. [Troubleshooting / FAQ](#13-troubleshooting--faq)
14. [Contacto del equipo](#14-contacto-del-equipo)
15. [Changelog](#15-changelog)
16. [Licencia](#16-licencia)

---

## 1. Descripción del proyecto

**Euro VER & DATA** es una plataforma web SPA (Single Page Application) construida con React 19 y Vite. Consume la API REST del repositorio [`EURO_ver_y_data_API`](https://github.com/JhonnatanHHM-lambda/EURO_ver_y_data_API).

Funcionalidades principales de la UI:

- **Login con OTP:** Autenticación en dos pasos (correo + código de un solo uso).
- **Trazabilidad:** Tabla central de candidatos/empleados con filtros, paginación y drawer de detalle por persona.
- **Carga de Excel:** Subida de archivos con previsualización de errores antes de confirmar.
- **BD Centralizada (Hist. Cargas):** Historial de todos los archivos cargados con acciones de firma y reversión.
- **Administración de Registros:** CRUD individual de registros con historial de auditoría.
- **Gestión de Usuarios / Roles / Sedes:** Paneles administrativos con control por permisos.
- **Temas claro/oscuro:** Sistema de design tokens con cambio en tiempo real.
- **Responsive:** Layout adaptable a mobile, tablet y desktop.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework UI | React | 19.2.0 |
| Bundler | Vite | 7.x |
| Routing | React Router | 7.9.6 |
| HTTP client | Axios | 1.13.2 |
| Estilos | SASS (SCSS) | 1.94.2 |
| Alertas | SweetAlert2 | 11.26.3 |
| Iconografía | react-icons (Feather) | 5.5.0 |
| Firma digital | react-signature-canvas | 1.1.0-alpha |
| Auth | jwt-decode + localStorage | 4.0.0 |
| Linting | ESLint | 9.x |

---

## 3. Requisitos previos

| Requisito | Versión mínima | Notas |
|-----------|---------------|-------|
| Node.js | 18+ | Usar `node --version` para verificar |
| npm | 9+ | Incluido con Node.js |
| Git | 2.40+ | Para clonar el repositorio |
| API backend | corriendo en `http://127.0.0.1:8000` | Ver [`EURO_ver_y_data_API`](https://github.com/JhonnatanHHM-lambda/EURO_ver_y_data_API) |

> Recomendamos Node.js LTS. Descarga desde [nodejs.org](https://nodejs.org).

---

## 4. Instalación y configuración local

```bash
# 1. Clonar el repositorio
git clone https://github.com/JhonnatanHHM-lambda/EURO_ver_y_data_UI.git
cd EURO_ver_y_data_UI

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env si la API no corre en http://127.0.0.1:8000 (ver sección 5)

# 4. Levantar el servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173/ver-y-data/`

> Asegúrate de tener el backend corriendo antes de iniciar. Ver instalación del API en [`EURO_ver_y_data_API`](https://github.com/JhonnatanHHM-lambda/EURO_ver_y_data_API).

---

## 5. Variables de entorno

| Variable | Descripción | Default | Obligatoria |
|----------|-------------|---------|-------------|
| `VITE_API_URL` | URL base de la API Django (incluir `/api/` al final) | `http://127.0.0.1:8000/api/` | No (usa el default) |

> Las variables de Vite deben tener el prefijo `VITE_` para ser accesibles en el cliente.

---

## 6. Estructura de carpetas

```
EURO_ver_y_data_UI/
│
├── index.html                         # HTML raíz (punto de entrada Vite)
├── vite.config.js                     # Configuración de Vite (base: /ver-y-data/)
├── package.json                       # Dependencias y scripts
├── .env.example                       # Plantilla de variables de entorno
│
└── src/
    ├── main.jsx                       # Punto de entrada React — monta <App />
    ├── App.jsx                        # Árbol de rutas principal (React Router)
    ├── index.scss                     # Estilos globales + reset CSS
    │
    ├── assets/
    │   └── euro-logo.png              # Logo de Euro Supermercados
    │
    ├── context/
    │   ├── ThemeContext.jsx           # Proveedor de tema claro/oscuro
    │   ├── SedeContext.jsx            # Proveedor de sede activa (multi-sede)
    │   └── UserContext.jsx            # Proveedor de usuario en sesión
    │
    ├── services/
    │   └── api.js                     # Instancia Axios + interceptores JWT
    │
    ├── utils/
    │   └── swal.js                    # Wrapper de SweetAlert2 con tema automático
    │
    ├── styles/
    │   └── _variables.scss            # Design tokens: colores, tipografía, breakpoints
    │
    └── modules/                       # Módulos por feature (ver sección 8)
        ├── core/
        │   ├── Layout/                # Estructura principal (Sidebar + Navbar + contenido)
        │   ├── Login/                 # Pantalla de login + flujo OTP
        │   ├── Navbar/                # Barra superior con sede, tema, usuario, logout
        │   ├── Sidebar/               # Menú lateral colapsable con grupos
        │   ├── ProtectedRoute/        # HOC para rutas que requieren autenticación
        │   ├── TienePermiso/          # HOC para rutas que requieren permiso específico
        │   ├── Modal/                 # Componente modal reutilizable
        │   ├── Tabla/                 # Componente de tabla reutilizable
        │   └── RedireccionarDash/     # Redirección inteligente según permisos
        ├── dashboard/                 # Panel de inicio (KPIs generales)
        ├── trazabilidad/              # Tabla de trazabilidad + drawer de detalle
        ├── carga/                     # Subida y previsualización de Excel
        ├── bd_centralizada/           # Historial de cargas (Hist. Cargas)
        ├── adminRegistros/            # Administración de registros individuales
        ├── usuarios/                  # Gestión de usuarios
        ├── roles/                     # Gestión de roles y permisos
        └── administracion/            # Gestión de sedes y orígenes
```

Cada módulo sigue la estructura interna:
```
modules/<nombre>/
    components/      # Componentes JSX del módulo
    hooks/           # Custom hooks (lógica de negocio, llamadas a API)
    utils/           # Estilos SCSS y utilidades del módulo
```

---

## 7. Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo con HMR en `http://localhost:5173` |
| `npm run build` | Compila la app para producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente para pruebas |

---

## 8. Módulos, rutas y permisos

| Ruta | Módulo | Permiso requerido |
|------|--------|------------------|
| `/` | Login | Público |
| `/app/dashboard` | Dashboard | Autenticado |
| `/app/trazabilidad` | Trazabilidad | `can_view_trazabilidad` |
| `/app/carga` | Carga de Excel | `can_upload_excel` |
| `/app/bd-centralizada` | Hist. Cargas | `can_manage_cargas` |
| `/app/registros` | Adm. Registros | `can_edit_registros` |
| `/app/usuarios` | Usuarios | `can_manage_users` |
| `/app/roles` | Roles y permisos | `can_manage_roles` |
| `/app/administracion` | Sedes y Orígenes | `can_manage_sedes` |

### Permisos disponibles

| Permiso | Descripción |
|---------|-------------|
| `can_view_trazabilidad` | Ver tabla y detalle de trazabilidad |
| `can_upload_excel` | Cargar archivos Excel |
| `can_manage_cargas` | Ver historial, firmar y revertir cargas |
| `can_edit_registros` | Editar, crear y eliminar registros individuales |
| `can_manage_users` | CRUD de usuarios |
| `can_manage_roles` | CRUD de roles y permisos |
| `can_manage_sedes` | CRUD de sedes y orígenes |

> Los superusuarios (`is_superuser: true`) tienen acceso a todo sin importar permisos.

### Reglas de alertas
**Todas las alertas deben usar SweetAlert2 a través de `src/utils/swal.js`.**  
Nunca usar `window.alert()` ni `window.confirm()` directamente.

```js
import swal from '../../../utils/swal';

// Confirmación
const result = await swal({
    title: '¿Estás seguro?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
});
if (result.isConfirmed) { /* ... */ }
```

---

## 9. Flujo de datos

```
Usuario ingresa credenciales
    │
    ▼
POST /api/auth/login/          ← Envía OTP al correo
    │
    ▼
POST /api/auth/verificar-otp/  ← Retorna { access, refresh, user }
    │                              localStorage: access_token, refresh_token, user
    ▼
src/services/api.js (Axios)
    ├── Interceptor Request: inyecta Authorization: Bearer <token>
    └── Interceptor Response 401: intenta refresh → si falla → logout()
    │
    ▼
Componente llama a custom hook (useXxx)
    │  ├── Hook llama a api.get/post/put/delete(...)
    │  ├── Maneja loading, error, data con useState
    │  └── Retorna { data, loading, error, handlers }
    ▼
Componente renderiza UI con los datos
    ├── ThemeContext: aplica data-theme al <html>
    ├── SedeContext: filtra datos por sede activa
    └── TienePermiso: oculta/bloquea según permisos del user
```

---

## 10. Convenciones de código

### Commits
Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     nueva funcionalidad o componente
fix:      corrección de bug visual o lógico
refactor: reorganización sin cambio funcional
style:    cambios de CSS/SCSS únicamente
docs:     documentación
chore:    dependencias, configuración Vite
```

### Branching

```
main         → producción estable
develop      → integración
feat/<name>  → nuevas funcionalidades
fix/<name>   → correcciones
```

### Estilo de código

- Componentes en `PascalCase.jsx`, hooks en `useNombre.jsx`
- Un componente por archivo
- Custom hooks en `hooks/` con lógica de API y estado
- SCSS con BEM-like: `.modulo-elemento--modificador`
- Variables CSS via `var(--token)` para soporte de temas
- Sin `window.alert` / `window.confirm` — siempre `swal()`

---

## 11. Testing

> El proyecto no tiene suite de tests automatizados en Fase 1. Se recomienda implementar con:

```bash
# Instalar Vitest + Testing Library
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# vitest.config.js
export default {
    test: { environment: 'jsdom', globals: true }
}

# Correr tests
npm run test

# Con cobertura
npm run test -- --coverage
```

**Cobertura objetivo:** Hooks críticos de `trazabilidad` y `carga` como prioridad.

---

## 12. Despliegue

### Build de producción

```bash
npm run build
# Genera dist/ con los archivos compilados y minificados
```

### Servidor estático (Nginx)

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    root /var/www/euro-ver-y-data/dist;
    index index.html;

    # SPA: redirigir todas las rutas al index.html
    location /ver-y-data/ {
        try_files $uri $uri/ /ver-y-data/index.html;
    }
}
```

### Variables de entorno en producción

```bash
# .env para producción
VITE_API_URL=https://api.tu-dominio.com/api/
```

> Recordar que `VITE_API_URL` se inyecta en tiempo de build, no en runtime. Cada cambio requiere un nuevo `npm run build`.

---

## 13. Troubleshooting / FAQ

**¿La app no carga y aparece pantalla en blanco?**  
Verifica que la base URL en el navegador incluya `/ver-y-data/` (ej: `http://localhost:5173/ver-y-data/`).

**¿Error de CORS al llamar al backend?**  
Verifica que el backend tenga `CORS_ALLOWED_ORIGINS=http://localhost:5173` en su `.env`.

**¿El login no avanza al ingresar el OTP?**  
Verifica que el worker Celery del backend esté corriendo (necesario para enviar el correo OTP).

**¿El tema oscuro/claro no persiste al recargar?**  
El tema se guarda en `localStorage.vyd-theme`. Si está vacío, usa oscuro por default.

**¿Cambios en SCSS no se reflejan?**  
Vite tiene HMR para SCSS. Si no actualiza, reinicia `npm run dev`.

**¿Error `VITE_API_URL` is undefined?**  
Asegúrate de que el archivo `.env` existe en la raíz del proyecto (no en `src/`).

**¿No aparecen las sedes en el selector?**  
Verifica que el backend tenga sedes cargadas: `python manage.py seed_sedes`.

---

## 14. Contacto del equipo

| Nombre | Rol | Correo |
|--------|-----|--------|
| Michel David Rojas | Project Manager | michel.rojas@lambdaanalytics.co |
| Ricardo González | Business Analyst / Aprobador README | ricardo.gonzalez@lambdaanalytics.co |
| Jonnathan Henao | Tech Lead / Dev | jonnathan.henao@lambdaanalytics.co |
| Manuela Valentina Palacio | Product Owner (Euro) | — |
| Henry Alonso Cadavid Ríos | TI Euro Supermercados | — |

---

## 15. Changelog

### v1.0.0 — Fase 1 (junio 2026)

**Nuevas funcionalidades:**
- Login con OTP (correo + código temporal)
- Dashboard con KPIs globales
- Tabla de trazabilidad paginada con filtros por origen, estado, proceso y búsqueda
- Cards responsive para mobile en tabla de trazabilidad
- Drawer lateral de detalle por persona con todas sus casillas/registros
- Casillas con pestaña expandible de fuente y fecha de carga
- Indicador de nombres inconsistentes para la misma cédula
- Modal de edición de registros (8 secciones, todos los campos del modelo)
- Modal para agregar registros manuales (búsqueda + formulario)
- Módulo de carga de Excel con previsualización de errores
- BD Centralizada (Hist. Cargas) con firma de actas y reversión
- Cards responsive para mobile en Hist. Cargas
- Administración de registros individuales con edición y eliminación controlada
- Gestión de usuarios, roles y permisos
- Gestión de sedes y orígenes de datos
- Sistema de notificaciones para admins (recuperación de contraseñas)
- Sidebar reorganizado con grupos colapsables: BD Centralizada / Gestión Humana / Administración
- Navbar con dropdown de usuario y opción Cerrar sesión
- Soporte completo de temas claro / oscuro
- Responsive mobile/tablet en todas las vistas principales

---

## 16. Licencia

Uso interno — Lambda Analytics SAS para Euro Supermercados.  
No distribuir sin autorización expresa de Lambda Analytics SAS.

---

*Documento generado por Lambda Analytics SAS · v1.0 · Fase 1 · Junio 2026*
