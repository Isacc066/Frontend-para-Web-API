// ui.js
// Utilidades de interfaz compartidas: escape de HTML, avisos, modales y errores.
// `bootstrap` es global (lo carga bootstrap.bundle.min.js en index.html).

// Escapa texto de la API antes de insertarlo en HTML (nunca inyectar datos crudos).
export const esc = (valor) =>
    String(valor ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// "" o null -> null; en otro caso Number. Mantiene el 0 como 0.
export const numeroONull = (value) =>
    value === "" || value == null ? null : Number(value);

// ---------- Sesión vencida ----------
let unauthorizedHandler = () => {};
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

// ---------- Mensajes de error ----------
export function validationMessages(err) {
    return Object.values(err?.details?.errors ?? {}).flat().map(String);
}

export function errorMessage(err) {
    const generico = !err?.message || /^HTTP \d+$/.test(err.message);
    switch (err?.status) {
        case 0:
            return "No se pudo conectar con la API. Revisa tu Internet, la URL de config.js y que el Equipo 5 tenga la API y ngrok encendidos.";
        case 400: {
            const lista = validationMessages(err);
            if (lista.length) return "Datos no válidos: " + lista.join(" · ");
            return generico ? "Solicitud no válida (400)." : err.message;
        }
        case 401:
            return "Tu sesión venció. Inicia sesión de nuevo.";
        case 403:
            return "Tu cuenta no tiene permiso para esta operación.";
        case 404:
            return "El registro no existe (pudo haberse eliminado) o la ruta es incorrecta.";
        case 409:
            return generico ? "Conflicto: el registro tiene relaciones o está duplicado." : err.message;
        case 429:
            return "Demasiadas solicitudes. Espera un minuto antes de volver a intentar.";
        case 502:
        case 504:
            return "El túnel respondió pero la API no. Puede que la computadora del Equipo 5 esté apagada o suspendida.";
        case 500:
        case 503:
            return `Problema en el servidor o en la base de datos (HTTP ${err.status}). Repórtalo al Equipo 5.`;
        default:
            return generico ? "Error inesperado." : err.message;
    }
}

// Maneja un error de la API: 401 -> login; lo demás se muestra en `container` o en un aviso.
export function handleError(err, { container } = {}) {
    if (err?.status === 401) {
        unauthorizedHandler();
        return;
    }
    const mensaje = errorMessage(err);
    if (container) {
        showAlert(container, mensaje, err?.status === 409 ? "warning" : "danger");
    } else {
        toast(mensaje, "danger");
    }
}

// ---------- Avisos ----------
export function toast(mensaje, tipo = "success") {
    const host = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = `toast align-items-center text-bg-${tipo} border-0`;
    el.setAttribute("role", "alert");
    el.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"></div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>`;
    el.querySelector(".toast-body").textContent = mensaje;
    host.appendChild(el);
    el.addEventListener("hidden.bs.toast", () => el.remove());
    new bootstrap.Toast(el, { delay: 4500 }).show();
}

// Alerta dentro de un contenedor, con botón de acción opcional.
export function showAlert(container, mensaje, tipo = "danger", accion = null) {
    container.innerHTML = `
        <div class="alert alert-${tipo} d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3" role="alert">
            <div data-role="msg"></div>
            ${accion ? `<button type="button" class="btn btn-sm btn-outline-dark" data-role="action"></button>` : ""}
        </div>`;
    container.querySelector('[data-role="msg"]').textContent = mensaje;
    if (accion) {
        const boton = container.querySelector('[data-role="action"]');
        boton.textContent = accion.label;
        boton.addEventListener("click", accion.onClick);
    }
}

export const spinnerHtml = (texto = "Cargando…") => `
    <div class="state-box">
        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>${esc(texto)}
    </div>`;

// ---------- Modales ----------
export function openModal({ title, bodyHtml = "", footerHtml = "", size = "", estatico = false }) {
    const el = document.createElement("div");
    el.className = "modal fade";
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog ${size}">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer"></div>
            </div>
        </div>`;
    el.querySelector(".modal-title").textContent = title;
    el.querySelector(".modal-body").innerHTML = bodyHtml;
    el.querySelector(".modal-footer").innerHTML = footerHtml;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el, estatico ? { backdrop: "static" } : {});
    el.addEventListener("hidden.bs.modal", () => { modal.dispose(); el.remove(); });
    modal.show();

    return {
        el,
        body: el.querySelector(".modal-body"),
        footer: el.querySelector(".modal-footer"),
        close: () => modal.hide()
    };
}

// Confirmación (devuelve una promesa con true/false).
export function confirmDialog({ title, message, confirmText = "Aceptar", danger = false }) {
    return new Promise((resolve) => {
        const m = openModal({
            title,
            bodyHtml: `<p class="mb-0"></p>`,
            footerHtml: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-${danger ? "danger" : "primary"}" data-ok></button>`
        });
        m.body.querySelector("p").textContent = message;
        m.footer.querySelector("[data-ok]").textContent = confirmText;
        let aceptado = false;
        m.footer.querySelector("[data-ok]").addEventListener("click", () => {
            aceptado = true;
            m.close();
        });
        m.el.addEventListener("hidden.bs.modal", () => resolve(aceptado));
    });
}
