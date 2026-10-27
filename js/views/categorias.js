// views/categorias.js — CRUD de /api/categorias
import { createCrudView } from "../crud.js";
import { esc } from "../ui.js";

export const renderCategorias = createCrudView({
    key: "categorias",
    title: "Categorías",
    singular: "categoría",
    nuevo: "Nueva",
    idField: "categoryId",
    describe: (r) => r?.categoryName ?? "",

    columns: [
        { key: "categoryId", label: "ID" },
        { key: "categoryName", label: "Nombre" },
        {
            key: "description",
            label: "Descripción",
            render: (r) => r.description
                ? `<div class="cell-truncate" title="${esc(r.description)}">${esc(r.description)}</div>`
                : `<span class="text-muted">—</span>`
        }
    ],

    fields: [
        { name: "categoryName", label: "Nombre", type: "text", required: true, max: 15, col: "col-12" },
        { name: "description", label: "Descripción", type: "textarea", max: 10000, col: "col-12" }
    ],

    // picture (base64) no se edita en esta versión: se envía null al crear
    // y se conserva el valor recibido al editar (no se borra por accidente).
    preserve: ["picture"],
    preserveLabels: { picture: "Imagen" },

    conflictMessage: "No se puede eliminar: la categoría tiene productos asociados. Reasígnalos o elimínalos primero."
});
