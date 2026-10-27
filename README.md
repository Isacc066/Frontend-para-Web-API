# Frontend Equipo 2 · Login JWT y CRUD de Productos, Categorías y Proveedores

Aplicación web en **HTML + JavaScript (módulos ES) + Bootstrap 5** que consume la API del Equipo 5.
No necesita instalar nada (ni Node, ni .NET, ni base de datos): solo Visual Studio Code y la extensión *Live Server*.

## Cómo ejecutarlo en Visual Studio Code

1. Descomprime el ZIP y en VS Code usa **Archivo → Abrir carpeta…** y elige la carpeta `frontend-equipo2`.
2. Instala la extensión **Live Server** (autor Ritwick Dey). VS Code la sugiere al abrir la carpeta.
3. Clic derecho sobre `index.html` → **Open with Live Server** (o el botón *Go Live* abajo a la derecha).
4. Se abre `http://127.0.0.1:5500`. Inicia sesión con la **cuenta de pruebas que viene en la guía del Equipo 5**.
   (La contraseña no está escrita en el código a propósito: se teclea en el formulario.)

> No abras `index.html` con doble clic: los módulos ES (`import`) no funcionan con `file://`.

Antes de probar, coordina con el Equipo 5 que su computadora esté encendida y sin suspensión, con IIS, MySQL y ngrok activos.

## Configuración

Toda la conexión está en **`js/config.js`**:

```js
export const API_BASE_URL = "https://porridge-plank-pager.ngrok-free.dev";
```

- No agregues `:8085`, `/api` ni `/swagger`.
- Solo cámbiala si el Equipo 5 avisa que la dirección cambió.
- No se usa `localhost` para llegar a su API.

## Estructura

```
frontend-equipo2/
├─ index.html            Página única: menú, contenedor de pantallas y avisos
├─ css/styles.css        Retoques mínimos sobre Bootstrap
└─ js/
   ├─ config.js          URL de la API (único lugar)
   ├─ api.js             Cliente HTTP: cabeceras, JWT en memoria, errores, login/logout y CRUD
   ├─ ui.js              Avisos, modales, escape de HTML y mensajes de error
   ├─ crud.js            Pantalla CRUD genérica (listado, ID, alta, edición, baja, paginación)
   ├─ main.js            Sesión, menú y navegación
   └─ views/
      ├─ login.js        Pantalla de login
      ├─ inicio.js       Bienvenida + GET /api/auth/me
      ├─ categorias.js   Configuración de columnas/campos de /api/categorias
      ├─ proveedores.js  Configuración de /api/proveedores
      └─ productos.js    Configuración de /api/productos (con selectores)
```

**Idea clave:** toda llamada HTTP pasa por `api.js`. Las pantallas solo piden datos y los muestran.
`crud.js` contiene la lógica común; cada catálogo solo declara sus columnas y campos.

## Qué cumple de la guía

- Login con indicador de carga y mensaje de error; token **solo en memoria** (al recargar se pide login de nuevo).
- Cabecera `ngrok-skip-browser-warning: 1` en **todas** las peticiones, incluido el login.
- Menú: Productos, Categorías, Proveedores y Cerrar sesión (`POST /api/auth/logout`).
- Por catálogo: listado paginado (`limit`/`offset`), consulta por ID, alta, edición completa y eliminación con confirmación.
- `PUT` carga primero el registro completo y envía todos los campos; `picture` de categorías se conserva al editar.
- `204` no se interpreta como JSON; después de crear, editar o borrar se vuelve a consultar la lista.
- Selectores de categoría y proveedor en productos, recorriendo **todas** las páginas; se envía el ID, no el nombre.
- Tipos correctos: números como número, `discontinued` como booleano, texto vacío opcional → `null`, el `0` se conserva.
- Errores: 400 (validaciones), 401 (vuelve al login), 403, 404, 409 (con opción de marcar un producto como descontinuado), 429, 5xx y sin conexión.
- Datos de la API siempre escapados (nunca se inyectan como HTML); `homePage` solo es enlace si es http/https.
- El rol **Lector** no ve botones de escritura (la autorización real la decide el servidor).

## Fuera de alcance (según la guía)

Registro y administración de usuarios, y el cargador de imágenes de categorías (opcional).
Tampoco hay buscador global: la API no tiene endpoint de búsqueda. Solo hay consulta por ID.

## Prueba de aceptación sugerida (para la exposición)

1. Login incorrecto → debe mostrar error. Login correcto → pantalla de Inicio con el perfil (`/api/auth/me`).
2. Recorrer los tres catálogos y cambiar de página.
3. Crear una **categoría** y un **proveedor** de prueba (anota los ID).
4. Crear un **producto** vinculado a esos dos registros.
5. Consultar por ID y editar los tres; volver a consultar para confirmar que persisten.
6. Intentar borrar la categoría y el proveedor mientras el producto los usa → debe salir un **409**.
7. Borrar primero el producto, luego la categoría y el proveedor → **204**.
8. Cerrar sesión → vuelve al login.

Usa solo registros nuevos para borrar; no pruebes eliminaciones con datos históricos de Northwind.
No muestres contraseñas ni tokens en la exposición, y recuerda que *logout* revoca todas las sesiones de la cuenta compartida.
