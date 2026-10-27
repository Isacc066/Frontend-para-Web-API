// crud.js
// Pantalla CRUD genérica. Cada catálogo (productos, categorías, proveedores) solo
// describe sus columnas y campos; aquí vive la lógica común:
//   listado paginado (limit/offset), consulta por ID, alta, edición completa,
//   eliminación con confirmación y manejo de 400/401/403/404/409/red.

import { api } from "./api.js";
import { PAGE_SIZE } from "./config.js";
import {
    esc, toast, showAlert, spinnerHtml, openModal, confirmDialog,
    handleError, errorMessage
} from "./ui.js";

const celdaVacia = `<span class="text-muted">—</span>`;

export function formatValue(nombre, valor) {
    if (valor === null || valor === undefined || valor === "") return celdaVacia;
    if (typeof valor === "boolean") return valor ? "Sí" : "No";
    if (nombre === "picture") return `Imagen guardada (base64, ${esc(String(valor).length)} caracteres)`;
    if (nombre === "homePage") {
        // Solo se enlaza si es http/https; en otro caso se muestra como texto.
        return /^https?:\/\//i.test(valor)
            ? `<a href="${esc(valor)}" target="_blank" rel="noopener noreferrer">${esc(valor)}</a>`
            : esc(valor);
    }
    return esc(valor);
}

function error(mensaje) { return { error: mensaje }; }

// Lee y valida el valor de un campo del formulario.
function parseField(f, input) {
    if (f.type === "checkbox") return { value: input.checked };

    const raw = String(input.value ?? "");
    const vacio = raw.trim() === "";

    if (vacio) {
        return f.required ? error("Este campo es obligatorio.") : { value: null };
    }

    switch (f.type) {
        case "select": {
            const n = Number(raw);
            return Number.isInteger(n) && n > 0 ? { value: n } : error("Selección no válida.");
        }
        case "int": {
            const n = Number(raw);
            if (!Number.isFinite(n) || !Number.isInteger(n)) return error("Escribe un número entero.");
            const min = f.min ?? 0, max = f.max ?? 32767;
            if (n < min || n > max) return error(`Debe estar entre ${min} y ${max}.`);
            return { value: n };
        }
        case "decimal": {
            if (!/^\d+(\.\d{1,4})?$/.test(raw.trim())) {
                return error("Número no negativo con máximo 4 decimales.");
            }
            const n = Number(raw);
            if (!Number.isFinite(n) || n > 999999999.9999) return error("Valor demasiado grande.");
            return { value: n };
        }
        default: {
            const t = raw.trim();
            if (f.max && t.length > f.max) return error(`Máximo ${f.max} caracteres.`);
            return { value: t };
        }
    }
}

function setFieldError(form, f, mensaje) {
    const input = form.elements[f.name];
    const feedback = input.closest("[data-field]").querySelector(".invalid-feedback");
    input.classList.toggle("is-invalid", Boolean(mensaje));
    if (feedback) feedback.textContent = mensaje ?? "";
}

function fieldHtml(f, registro, opciones) {
    const id = `f_${f.name}`;
    const valor = registro ? registro[f.name] : null;
    const col = f.col ?? "col-md-6";
    const obligatorio = f.required ? ` <span class="text-danger">*</span>` : "";
    const ayuda = f.hint ? `<div class="form-text">${esc(f.hint)}</div>` : "";
    let control;

    switch (f.type) {
        case "textarea":
            control = `<textarea class="form-control" id="${id}" name="${f.name}" rows="3"
                        ${f.max ? `maxlength="${f.max}"` : ""}>${esc(valor ?? "")}</textarea>`;
            break;
        case "int":
            control = `<input type="number" class="form-control" id="${id}" name="${f.name}"
                        step="1" min="${f.min ?? 0}" max="${f.max ?? 32767}" value="${esc(valor ?? "")}">`;
            break;
        case "decimal":
            control = `<input type="number" class="form-control" id="${id}" name="${f.name}"
                        step="0.0001" min="0" value="${esc(valor ?? "")}">`;
            break;
        case "checkbox":
            return `<div class="${col}" data-field>
                        <div class="form-check form-switch mt-2">
                            <input class="form-check-input" type="checkbox" role="switch" id="${id}"
                                   name="${f.name}" ${valor ? "checked" : ""}>
                            <label class="form-check-label" for="${id}">${esc(f.label)}</label>
                        </div>
                        <div class="invalid-feedback"></div>${ayuda}
                    </div>`;
        case "select": {
            const items = (opciones ?? []).map((o) =>
                `<option value="${esc(o.value)}" ${String(o.value) === String(valor) ? "selected" : ""}>${esc(o.label)}</option>`);
            control = `<select class="form-select" id="${id}" name="${f.name}">
                            <option value="">— Sin asignar —</option>${items.join("")}
                       </select>`;
            break;
        }
        default:
            control = `<input type="text" class="form-control" id="${id}" name="${f.name}"
                        ${f.max ? `maxlength="${f.max}"` : ""} value="${esc(valor ?? "")}">`;
    }

    return `<div class="${col}" data-field>
                <label for="${id}" class="form-label">${esc(f.label)}${obligatorio}</label>
                ${control}
                <div class="invalid-feedback"></div>${ayuda}
            </div>`;
}

export function createCrudView(cfg) {
    const recurso = api[cfg.key];
    const puedeEscribir = (sesion) => ["Editor", "Admin"].includes(sesion?.user?.role);

    return async function render(container, sesion) {
        const escribe = puedeEscribir(sesion);
        let limit = PAGE_SIZE;
        let offset = 0;
        let filas = [];

        // Contenedor propio: así los eventos no se acumulan al volver a esta pantalla.
        container.innerHTML = "";
        const root = document.createElement("div");
        container.appendChild(root);

        root.innerHTML = `
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                    <h2 class="h3 mb-0">${esc(cfg.title)}</h2>
                    <small class="text-muted">/api/${esc(cfg.key)}${escribe ? "" : " · solo lectura (rol " + esc(sesion?.user?.role) + ")"}</small>
                </div>
                <div class="d-flex flex-wrap gap-2">
                    <form data-role="byid" class="input-group" style="width:240px" novalidate>
                        <input type="number" min="1" step="1" class="form-control" placeholder="Consultar por ID" aria-label="ID">
                        <button class="btn btn-outline-secondary" type="submit">Ver</button>
                    </form>
                    ${escribe ? `<button type="button" class="btn btn-primary" data-role="new">+ Nuevo</button>` : ""}
                </div>
            </div>
            <div data-role="alerts"></div>
            <div data-role="table"></div>
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3" data-role="pager"></div>`;

        const $ = (sel) => root.querySelector(sel);
        const alertas = $('[data-role="alerts"]');
        const tabla = $('[data-role="table"]');
        const pager = $('[data-role="pager"]');

        // ---------- Dibujo ----------
        function dibujarTabla() {
            if (!filas.length) {
                tabla.innerHTML = `<div class="state-box">No hay registros en esta página.</div>`;
                return;
            }
            const encabezado = cfg.columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
            const cuerpo = filas.map((r) => {
                const id = esc(r[cfg.idField]);
                const celdas = cfg.columns
                    .map((c) => `<td>${c.render ? c.render(r) : formatValue(c.key, r[c.key])}</td>`)
                    .join("");
                return `<tr>${celdas}
                    <td class="text-end text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary" data-act="view" data-id="${id}">Ver</button>
                        ${escribe ? `
                        <button class="btn btn-sm btn-outline-primary" data-act="edit" data-id="${id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" data-act="delete" data-id="${id}">Eliminar</button>` : ""}
                    </td></tr>`;
            }).join("");
            tabla.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light"><tr>${encabezado}<th></th></tr></thead>
                        <tbody>${cuerpo}</tbody>
                    </table>
                </div>`;
        }

        function dibujarPager() {
            const pagina = Math.floor(offset / limit) + 1;
            pager.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <label class="small text-muted mb-0" for="limitSel">Filas por página</label>
                    <select id="limitSel" class="form-select form-select-sm w-auto" data-role="limit">
                        ${[10, 20, 50].map((n) => `<option ${n === limit ? "selected" : ""}>${n}</option>`).join("")}
                    </select>
                </div>
                <div class="small text-muted">Página ${pagina} · ${filas.length} registro(s)</div>
                <div class="btn-group">
                    <button class="btn btn-outline-secondary btn-sm" data-act="prev" ${offset === 0 ? "disabled" : ""}>« Anterior</button>
                    <button class="btn btn-outline-secondary btn-sm" data-act="next" ${filas.length < limit ? "disabled" : ""}>Siguiente »</button>
                </div>`;
        }

        // ---------- Carga ----------
        // Si la página queda vacía y offset > 0, retrocede una página.
        async function cargar({ aviso = null, conservarAlertas = false } = {}) {
            if (!conservarAlertas) alertas.innerHTML = "";
            tabla.innerHTML = spinnerHtml();
            try {
                let pagina = await recurso.list(limit, offset);
                let retrocedio = false;
                while (pagina.length === 0 && offset > 0) {
                    offset = Math.max(0, offset - limit);
                    pagina = await recurso.list(limit, offset);
                    retrocedio = true;
                }
                filas = pagina;
                dibujarTabla();
                dibujarPager();
                if (retrocedio && aviso) toast(aviso, "info");
            } catch (err) {
                tabla.innerHTML = `<div class="state-box">No se pudo cargar la lista.
                    <div class="mt-3"><button class="btn btn-outline-primary btn-sm" data-act="retry">Reintentar</button></div></div>`;
                handleError(err, { container: alertas });
            }
        }

        // ---------- Detalle (consulta por ID) ----------
        async function verDetalle(id) {
            try {
                const registro = await recurso.get(id);
                const etiquetas = [[cfg.idLabel ?? "ID", cfg.idField]]
                    .concat(cfg.fields.map((f) => [f.label, f.name]))
                    .concat((cfg.preserve ?? []).map((k) => [cfg.preserveLabels?.[k] ?? k, k]));
                const filasDl = etiquetas.map(([etiqueta, clave]) => `
                    <dt class="col-sm-4">${esc(etiqueta)}</dt>
                    <dd class="col-sm-8 pre-wrap">${formatValue(clave, registro[clave])}</dd>`).join("");
                openModal({
                    title: `${cfg.singular[0].toUpperCase() + cfg.singular.slice(1)} #${id}`,
                    bodyHtml: `<dl class="row mb-0">${filasDl}</dl>`,
                    footerHtml: `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>`,
                    size: "modal-lg"
                });
            } catch (err) {
                if (err.status === 404) {
                    showAlert(alertas, `No existe ${cfg.singular} con ID ${id}.`, "warning");
                } else {
                    handleError(err, { container: alertas });
                }
            }
        }

        // ---------- Alta y edición ----------
        async function abrirFormulario(id = null) {
            const editando = id !== null;
            const m = openModal({
                title: editando ? `Editar ${cfg.singular} #${id}` : `${cfg.nuevo ?? "Nuevo"} ${cfg.singular}`,
                bodyHtml: spinnerHtml(),
                size: "modal-lg",
                estatico: true
            });

            let registro = null;
            const opciones = {};
            try {
                const tareas = [];
                // PUT reemplaza todo: primero se carga el registro completo.
                if (editando) tareas.push(recurso.get(id).then((r) => { registro = r; }));
                for (const f of cfg.fields.filter((x) => x.type === "select")) {
                    tareas.push(f.options().then((o) => { opciones[f.name] = o; }));
                }
                await Promise.all(tareas);
            } catch (err) {
                m.close();
                handleError(err, { container: alertas });
                if (err.status === 404) cargar({ conservarAlertas: true });
                return;
            }

            m.body.innerHTML = `
                <form id="crud-form" novalidate>
                    <div data-role="formAlerts"></div>
                    <div class="row g-3">
                        ${cfg.fields.map((f) => fieldHtml(f, registro, opciones[f.name])).join("")}
                    </div>
                </form>`;
            m.footer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" form="crud-form" class="btn btn-primary" data-role="save">Guardar</button>`;

            const form = m.body.querySelector("#crud-form");
            const avisosForm = m.body.querySelector('[data-role="formAlerts"]');
            const botonGuardar = m.footer.querySelector('[data-role="save"]');

            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                avisosForm.innerHTML = "";

                // Validación en el cliente
                const cuerpo = {};
                let valido = true;
                for (const f of cfg.fields) {
                    const r = parseField(f, form.elements[f.name]);
                    setFieldError(form, f, r.error);
                    if (r.error) valido = false; else cuerpo[f.name] = r.value;
                }
                if (!valido) {
                    form.querySelector(".is-invalid")?.focus();
                    return;
                }
                // Campos que no se editan (p. ej. picture) se conservan tal cual.
                for (const k of cfg.preserve ?? []) cuerpo[k] = registro ? (registro[k] ?? null) : null;

                botonGuardar.disabled = true;
                botonGuardar.innerHTML = `<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…`;
                try {
                    if (editando) {
                        await recurso.update(id, cuerpo);
                        toast("Cambios guardados.");
                    } else {
                        const creado = await recurso.create(cuerpo);
                        toast(`Registro creado con ID ${creado?.[cfg.idField] ?? "?"}.`);
                    }
                    m.close();
                    await cargar();
                } catch (err) {
                    if (err.status === 401) { m.close(); handleError(err); return; }
                    let mensaje = errorMessage(err);
                    if (err.status === 0) {
                        mensaje += " Si estabas guardando, consulta la lista antes de reintentar para no duplicar el registro.";
                    }
                    showAlert(avisosForm, mensaje, err.status === 409 ? "warning" : "danger");
                    if (err.status === 404) cargar({ conservarAlertas: true });
                } finally {
                    botonGuardar.disabled = false;
                    botonGuardar.textContent = "Guardar";
                }
            });
        }

        // ---------- Eliminación ----------
        function cuerpoEditable(registro) {
            const cuerpo = {};
            for (const f of cfg.fields) {
                cuerpo[f.name] = f.type === "checkbox" ? Boolean(registro[f.name]) : (registro[f.name] ?? null);
            }
            for (const k of cfg.preserve ?? []) cuerpo[k] = registro[k] ?? null;
            return cuerpo;
        }

        async function eliminar(id) {
            const registro = filas.find((r) => String(r[cfg.idField]) === String(id));
            const ok = await confirmDialog({
                title: "Confirmar eliminación",
                message: `¿Eliminar ${cfg.singular} "${cfg.describe(registro)}" (ID ${id})? Esta acción no se puede deshacer.`,
                confirmText: "Eliminar",
                danger: true
            });
            if (!ok) return;

            try {
                await recurso.remove(id);   // 204: solo se quita la fila cuando el servidor confirma
                toast("Registro eliminado.");
                await cargar();
            } catch (err) {
                if (err.status === 409) {
                    const detalle = /^HTTP \d+$/.test(err.message) ? "" : ` (Servidor: ${err.message})`;
                    const accion = cfg.conflictAction ? {
                        label: cfg.conflictAction.label,
                        onClick: async () => {
                            try {
                                const completo = await recurso.get(id);
                                await recurso.update(id, { ...cuerpoEditable(completo), ...cfg.conflictAction.patch });
                                toast("Registro actualizado.");
                                await cargar();
                            } catch (e2) {
                                handleError(e2, { container: alertas });
                            }
                        }
                    } : null;
                    showAlert(alertas, cfg.conflictMessage + detalle, "warning", accion);
                } else if (err.status === 404) {
                    toast("El registro ya no existe; se actualizó la lista.", "info");
                    await cargar();
                } else {
                    handleError(err, { container: alertas });
                }
            }
        }

        // ---------- Eventos ----------
        root.addEventListener("click", (e) => {
            const boton = e.target.closest("[data-act]");
            if (!boton) return;
            const id = boton.dataset.id;
            switch (boton.dataset.act) {
                case "view": verDetalle(id); break;
                case "edit": abrirFormulario(Number(id)); break;
                case "delete": eliminar(id); break;
                case "retry": cargar(); break;
                case "prev": offset = Math.max(0, offset - limit); cargar(); break;
                case "next": offset += limit; cargar({ aviso: "No hay más registros." }); break;
            }
        });

        root.addEventListener("change", (e) => {
            if (e.target.matches('[data-role="limit"]')) {
                limit = Number(e.target.value);
                offset = 0;
                cargar();
            }
        });

        $('[data-role="new"]')?.addEventListener("click", () => abrirFormulario());

        $('[data-role="byid"]').addEventListener("submit", (e) => {
            e.preventDefault();
            const entrada = e.currentTarget.querySelector("input");
            const id = Number(entrada.value);
            if (!Number.isInteger(id) || id < 1) {
                showAlert(alertas, "Escribe un ID entero positivo.", "warning");
                return;
            }
            verDetalle(id);
        });

        // ---------- Arranque ----------
        if (cfg.prepare) await cfg.prepare();   // p. ej. nombres de categorías/proveedores
        await cargar();
    };
}
