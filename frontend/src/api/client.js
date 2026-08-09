import axios from "axios";

// Configurable vía .env: VITE_API_URL=http://localhost:8000/api
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const access = localStorage.getItem("fs_access");
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshing = null;

// Endpoints públicos: un 401 aquí es "credenciales incorrectas", NO una sesión
// expirada, así que nunca deben disparar el flujo de refresh/logout global.
const PUBLIC_ENDPOINTS = ["/auth/token/", "/register/"];
const isPublicEndpoint = (url) => PUBLIC_ENDPOINTS.some((p) => url?.startsWith(p));

function forceLogout() {
  localStorage.removeItem("fs_access");
  localStorage.removeItem("fs_refresh");
  // Aviso a AuthContext (si está montado) para que limpie su estado sin
  // recargar toda la página; si no hay nadie escuchando, el fallback de abajo
  // sigue funcionando gracias al rewrite SPA configurado en Vercel.
  window.dispatchEvent(new CustomEvent("auth:logout"));
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!error.response) {
      // Sin respuesta del servidor: red caída, CORS, o backend dormido/caído.
      error.friendlyMessage = "No se pudo conectar con el servidor. Inténtalo de nuevo en unos segundos.";
      return Promise.reject(error);
    }
    if (error.response.status === 401 && !isPublicEndpoint(original.url) && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("fs_refresh");
      if (!refresh) {
        forceLogout();
        return Promise.reject(error);
      }
      try {
        if (!refreshing) {
          refreshing = axios
            .post(`${BASE_URL}/auth/token/refresh/`, { refresh })
            .then((r) => {
              localStorage.setItem("fs_access", r.data.access);
              return r.data.access;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const newAccess = await refreshing;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return client(original);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
export { BASE_URL };
