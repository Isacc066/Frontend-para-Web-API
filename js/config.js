// config.js
// ÚNICO lugar donde vive la dirección del servidor.
// No agregues :8085, /api ni /swagger: api.js ya añade /api a cada ruta.
// Solo cámbiala si el Equipo 5 avisa que la dirección cambió.
export const API_BASE_URL = "https://porridge-plank-pager.ngrok-free.dev";

// Filas por página que se piden al abrir un catálogo (la API permite de 1 a 100).
export const PAGE_SIZE = 10;
