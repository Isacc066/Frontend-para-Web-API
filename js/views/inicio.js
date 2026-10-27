// views/inicio.js — pantalla de bienvenida: consulta el perfil con GET /api/auth/me
import { api } from "../api.js";
import { esc, handleError, spinnerHtml } from "../ui.js";

export async function renderInicio(container, sesion, { navigate }) {
    container.innerHTML = `
        <h2 class="h3 mb-3">Inicio</h2>
        <div data-role="alerts"></div>
        <div data-role="perfil" class="mb-4">${spinnerHtml("Verificando sesión…")}</div>
        <div class="row g-3">
            ${[
                ["productos", "Productos", "Alta, edición, baja y consulta de productos."],
                ["categorias", "Categorías", "Catálogo de categorías de producto."],
                ["proveedores", "Proveedores", "Empresas que surten los productos."]
            ].map(([vista, titulo, texto]) => `
                <div class="col-md-4">
                    <div class="card h-100">
                        <div class="card-body d-flex flex-column">
                            <h3 class="h5">${esc(titulo)}</h3>
                            <p class="text-muted flex-grow-1">${esc(texto)}</p>
                            <button class="btn btn-outline-primary" data-go="${vista}">Abrir</button>
                        </div>
                    </div>
                </div>`).join("")}
        </div>`;

    container.querySelectorAll("[data-go]").forEach((b) =>
        b.addEventListener("click", () => navigate(b.dataset.go)));

    const perfilBox = container.querySelector('[data-role="perfil"]');
    try {
        const perfil = await api.me();
        const rol = perfil.role ?? sesion.user?.role;
        perfilBox.innerHTML = `
            <div class="alert alert-success mb-0">
                Sesión activa como <strong>${esc(perfil.username)}</strong> · rol <strong>${esc(rol)}</strong>.
                ${["Editor", "Admin"].includes(rol)
                    ? "Puedes consultar, crear, editar y eliminar."
                    : "Tu rol es de solo lectura."}
            </div>`;
    } catch (err) {
        perfilBox.innerHTML = "";
        handleError(err, { container: container.querySelector('[data-role="alerts"]') });
    }
}
