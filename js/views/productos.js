// views/productos.js — CRUD de /api/productos
import { api } from "../api.js";
import { createCrudView } from "../crud.js";
import { esc } from "../ui.js";

// Nombres para mostrar en la tabla (la API de productos solo devuelve IDs).
let nombresCategorias = new Map();
let nombresProveedores = new Map();

const guion = `<span class="text-muted">—</span>`;
const nombreDe = (mapa, id) => (id == null ? guion : esc(mapa.get(id) ?? `ID ${id}`));

// Opciones de los selectores: se recorren TODAS las páginas de la API.
const opcionesCategorias = async () =>
    (await api.listAll("categorias")).map((c) => ({ value: c.categoryId, label: `${c.categoryName} (ID ${c.categoryId})` }));
const opcionesProveedores = async () =>
    (await api.listAll("proveedores")).map((s) => ({ value: s.supplierId, label: `${s.companyName} (ID ${s.supplierId})` }));

export const renderProductos = createCrudView({
    key: "productos",
    title: "Productos",
    singular: "producto",
    idField: "productId",
    describe: (r) => r?.productName ?? "",

    async prepare() {
        try {
            const [cats, provs] = await Promise.all([api.listAll("categorias"), api.listAll("proveedores")]);
            nombresCategorias = new Map(cats.map((c) => [c.categoryId, c.categoryName]));
            nombresProveedores = new Map(provs.map((s) => [s.supplierId, s.companyName]));
        } catch {
            // Si falla, la tabla muestra los IDs; el error real saldrá al cargar la lista.
        }
    },

    columns: [
        { key: "productId", label: "ID" },
        { key: "productName", label: "Producto" },
        { key: "categoryId", label: "Categoría", render: (r) => nombreDe(nombresCategorias, r.categoryId) },
        { key: "supplierId", label: "Proveedor", render: (r) => nombreDe(nombresProveedores, r.supplierId) },
        {
            key: "unitPrice",
            label: "Precio",
            render: (r) => r.unitPrice == null
                ? guion
                : "$ " + Number(r.unitPrice).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
        },
        { key: "unitsInStock", label: "En stock" },
        {
            key: "discontinued",
            label: "Estado",
            render: (r) => r.discontinued
                ? `<span class="badge text-bg-secondary">Descontinuado</span>`
                : `<span class="badge text-bg-success">Activo</span>`
        }
    ],

    fields: [
        { name: "productName", label: "Nombre del producto", type: "text", required: true, max: 40, col: "col-12" },
        { name: "categoryId", label: "Categoría", type: "select", options: opcionesCategorias },
        { name: "supplierId", label: "Proveedor", type: "select", options: opcionesProveedores },
        { name: "quantityPerUnit", label: "Cantidad por unidad", type: "text", max: 20 },
        { name: "unitPrice", label: "Precio unitario", type: "decimal", hint: "Hasta 4 decimales." },
        { name: "unitsInStock", label: "Unidades en stock", type: "int", col: "col-md-4" },
        { name: "unitsOnOrder", label: "Unidades en pedido", type: "int", col: "col-md-4" },
        { name: "reorderLevel", label: "Nivel de reorden", type: "int", col: "col-md-4" },
        { name: "discontinued", label: "Descontinuado", type: "checkbox", col: "col-12" }
    ],

    conflictMessage: "No se puede eliminar: el producto tiene pedidos relacionados. Puedes conservarlo y marcarlo como descontinuado.",
    conflictAction: { label: "Marcar como descontinuado", patch: { discontinued: true } }
});
