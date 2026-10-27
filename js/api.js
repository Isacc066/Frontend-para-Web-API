// api.js
// Cliente HTTP compartido (basado en el módulo de la guía del Equipo 5).
// TODA llamada a la API pasa por aquí: URL, cabeceras, token y errores.
// El token vive solo en memoria: al recargar la página se vuelve a pedir login.

import { API_BASE_URL } from "./config.js";

let session = null;

export const getSession = () => session;

async function request(path, { method = "GET", body, auth = true } = {}) {
    if (!API_BASE_URL) {
        throw new Error("Falta configurar la URL de la API.");
    }
    if (auth && !session?.accessToken) {
        throw Object.assign(new Error("Inicia sesión."), { status: 401 });
    }

    const headers = {
        Accept: "application/json",
        // Evita el aviso HTML de ngrok en lugar del JSON (no sustituye al JWT).
        "ngrok-skip-browser-warning": "1"
    };
    if (auth) {
        headers.Authorization = "Bearer " + session.accessToken;
    }
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    let response;
    try {
        response = await fetch(API_BASE_URL.replace(/\/+$/, "") + path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch {
        // status 0 = no hubo respuesta HTTP (red, URL, CORS, HTTPS...)
        throw Object.assign(new Error("No se pudo conectar con la API."), { status: 0 });
    }

    // PUT y DELETE devuelven 204 sin cuerpo: no se interpreta como JSON.
    if (response.status === 204) return null;

    // La respuesta de error puede ser JSON, HTML de IIS o estar vacía.
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* no era JSON */ }

    if (!response.ok) {
        if (response.status === 401) session = null;
        throw Object.assign(
            new Error(data?.detail || data?.message || data?.title || ("HTTP " + response.status)),
            { status: response.status, details: data }
        );
    }
    return data;
}

// Operaciones comunes de los tres catálogos.
function crud(resource) {
    const path = "/api/" + resource;
    return {
        list: (limit = 20, offset = 0) =>
            request(path + "?" + new URLSearchParams({ limit, offset })),
        get: id => request(path + "/" + encodeURIComponent(id)),
        create: body => request(path, { method: "POST", body }),
        update: (id, body) =>
            request(path + "/" + encodeURIComponent(id), { method: "PUT", body }),
        remove: id =>
            request(path + "/" + encodeURIComponent(id), { method: "DELETE" })
    };
}

const catalogos = {
    productos: crud("productos"),
    categorias: crud("categorias"),
    proveedores: crud("proveedores")
};

// Recorre todas las páginas (para los selectores). limit=100 no garantiza traer todo.
async function listAll(nombre) {
    const todos = [];
    const limit = 100;
    for (let i = 0, offset = 0; i < 200; i++, offset += limit) {
        const pagina = await catalogos[nombre].list(limit, offset);
        todos.push(...pagina);
        if (pagina.length < limit) break;
    }
    return todos;
}

export const api = {
    async login(username, password) {
        session = null;
        const result = await request("/api/auth/login", {
            method: "POST",
            auth: false,
            body: { username, password }
        });
        if (!result?.accessToken) {
            throw new Error("Respuesta de login inválida.");
        }
        session = result;
        return result;
    },

    me: () => request("/api/auth/me"),

    async logout() {
        try {
            if (session) {
                await request("/api/auth/logout", { method: "POST" });
            }
        } finally {
            session = null;
        }
    },

    ...catalogos,
    listAll
};
