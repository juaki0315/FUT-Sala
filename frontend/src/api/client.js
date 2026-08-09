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

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("fs_refresh");
      if (!refresh) {
        localStorage.removeItem("fs_access");
        window.location.href = "/login";
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
        localStorage.removeItem("fs_access");
        localStorage.removeItem("fs_refresh");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
export { BASE_URL };
