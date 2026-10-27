// views/login.js — pantalla de inicio de sesión
import { api } from "../api.js";
import { esc, errorMessage, showAlert } from "../ui.js";

export function renderLogin(container, { onSuccess, aviso = null }) {
    container.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5 col-xl-4">
                <div class="card shadow-sm mt-4">
                    <div class="card-body p-4">
                        <h1 class="h4 mb-1">Iniciar sesión</h1>
                        <p class="text-muted small mb-3">Catálogos Northwind · API del Equipo 5</p>
                        <div data-role="alert"></div>
                        <form novalidate>
                            <div class="mb-3">
                                <label for="usuario" class="form-label">Usuario</label>
                                <input id="usuario" class="form-control" autocomplete="username" autofocus>
                                <div class="invalid-feedback">Escribe tu usuario.</div>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Contraseña</label>
                                <input id="password" type="password" class="form-control" autocomplete="current-password">
                                <div class="invalid-feedback">Escribe tu contraseña.</div>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Entrar</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

    const alerta = container.querySelector('[data-role="alert"]');
    const form = container.querySelector("form");
    const usuario = form.querySelector("#usuario");
    const password = form.querySelector("#password");
    const boton = form.querySelector("button");

    if (aviso) showAlert(alerta, aviso, "warning");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        alerta.innerHTML = "";

        const u = usuario.value.trim();
        const p = password.value;
        usuario.classList.toggle("is-invalid", !u);
        password.classList.toggle("is-invalid", !p);
        if (!u || !p) return;

        boton.disabled = true;
        boton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Entrando…`;
        try {
            const sesion = await api.login(u, p);
            password.value = "";
            onSuccess(sesion);
        } catch (err) {
            let mensaje;
            if (err.status === 401) mensaje = "Usuario o contraseña incorrectos.";
            else if (err.status === 429) mensaje = "Demasiados intentos de inicio de sesión. Espera un minuto.";
            else mensaje = errorMessage(err);
            showAlert(alerta, mensaje, "danger");
            password.value = "";
            password.focus();
        } finally {
            boton.disabled = false;
            boton.textContent = "Entrar";
        }
    });
}
