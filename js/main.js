// main.js — punto de entrada: sesión, menú y navegación entre pantallas
import { api, getSession } from "./api.js";
import { setUnauthorizedHandler, toast } from "./ui.js";
import { renderLogin } from "./views/login.js";
import { renderInicio } from "./views/inicio.js";
import { renderProductos } from "./views/productos.js";
import { renderCategorias } from "./views/categorias.js";
import { renderProveedores } from "./views/proveedores.js";

const app = document.getElementById("app");
const navbar = document.getElementById("navbar");
const userBadge = document.getElementById("userBadge");
const btnLogout = document.getElementById("btnLogout");

const vistas = {
    inicio: renderInicio,
    productos: renderProductos,
    categorias: renderCategorias,
    proveedores: renderProveedores
};

function mostrarLogin(aviso = null) {
    navbar.classList.add("d-none");
    renderLogin(app, { onSuccess: entrarALaApp, aviso });
}

function entrarALaApp() {
    const sesion = getSession();
    userBadge.textContent = `${sesion.user.username} · ${sesion.user.role}`;
    navbar.classList.remove("d-none");
    navegar("inicio");
}

async function navegar(nombre) {
    const sesion = getSession();
    if (!sesion) { mostrarLogin(); return; }

    navbar.querySelectorAll("[data-view]").forEach((a) =>
        a.classList.toggle("active", a.dataset.view === nombre));
    // Cierra el menú en pantallas pequeñas
    document.getElementById("menu").classList.remove("show");

    app.innerHTML = "";
    await vistas[nombre](app, sesion, { navigate: navegar });
}

// 401 en cualquier consulta: se limpia la sesión y se vuelve al login.
setUnauthorizedHandler(() => mostrarLogin("Tu sesión venció o fue revocada. Inicia sesión de nuevo."));

navbar.querySelectorAll("[data-view]").forEach((a) =>
    a.addEventListener("click", (e) => {
        e.preventDefault();
        navegar(a.dataset.view);
    }));

btnLogout.addEventListener("click", async () => {
    btnLogout.disabled = true;
    try {
        await api.logout();
        toast("Sesión cerrada.", "info");
    } catch {
        toast("La sesión local se cerró, pero no se pudo confirmar la revocación en el servidor.", "warning");
    } finally {
        btnLogout.disabled = false;
        mostrarLogin();
    }
});

mostrarLogin();
