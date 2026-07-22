import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("access_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err?.response?.status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      const url = err.config?.url || "";
      if (refresh && !url.endsWith("/auth/refresh")) {
        try {
          const r = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", r.data.access_token);
          err.config.headers.Authorization = `Bearer ${r.data.access_token}`;
          return api.request(err.config);
        } catch (_) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    }
    return Promise.reject(err);
  }
);

export const BRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

export const maskCPF = (v) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const maskPhone = (v) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 9);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};
