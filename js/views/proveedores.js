// views/proveedores.js — CRUD de /api/proveedores
import { createCrudView } from "../crud.js";

export const renderProveedores = createCrudView({
    key: "proveedores",
    title: "Proveedores",
    singular: "proveedor",
    idField: "supplierId",
    describe: (r) => r?.companyName ?? "",

    columns: [
        { key: "supplierId", label: "ID" },
        { key: "companyName", label: "Empresa" },
        { key: "contactName", label: "Contacto" },
        { key: "city", label: "Ciudad" },
        { key: "country", label: "País" },
        { key: "phone", label: "Teléfono" }
    ],

    // Teléfono, fax y código postal son TEXTO (no se convierten a número).
    fields: [
        { name: "companyName", label: "Empresa", type: "text", required: true, max: 40, col: "col-12" },
        { name: "contactName", label: "Contacto", type: "text", max: 30 },
        { name: "contactTitle", label: "Cargo del contacto", type: "text", max: 30 },
        { name: "address", label: "Dirección", type: "text", max: 60, col: "col-12" },
        { name: "city", label: "Ciudad", type: "text", max: 15, col: "col-md-4" },
        { name: "region", label: "Región", type: "text", max: 15, col: "col-md-4" },
        { name: "postalCode", label: "Código postal", type: "text", max: 10, col: "col-md-4" },
        { name: "country", label: "País", type: "text", max: 15 },
        { name: "phone", label: "Teléfono", type: "text", max: 24 },
        { name: "fax", label: "Fax", type: "text", max: 24 },
        { name: "homePage", label: "Página web", type: "text", max: 2000, hint: "Solo se mostrará como enlace si empieza con http:// o https://" }
    ],

    conflictMessage: "No se puede eliminar: el proveedor tiene productos asociados. Reasigna esos productos a otro proveedor antes de eliminarlo."
});
