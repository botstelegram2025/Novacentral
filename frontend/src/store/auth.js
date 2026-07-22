import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

export const useAuth = create(
  persist(
    (set, get) => ({
      user: null,
      admin: null,
      login: async (cpf, password, remember = false) => {
        const r = await api.post("/auth/login", { cpf, password, remember });
        localStorage.setItem("access_token", r.data.access_token);
        localStorage.setItem("refresh_token", r.data.refresh_token);
        set({ user: r.data.user, admin: null });
        return r.data.user;
      },
      register: async (payload) => {
        const r = await api.post("/auth/register", payload);
        localStorage.setItem("access_token", r.data.access_token);
        localStorage.setItem("refresh_token", r.data.refresh_token);
        set({ user: r.data.user, admin: null });
        return r.data.user;
      },
      adminLogin: async (cpf, password) => {
        const r = await api.post("/admin/auth/login", { cpf, password });
        localStorage.setItem("access_token", r.data.access_token);
        localStorage.setItem("refresh_token", r.data.refresh_token);
        set({ admin: r.data.user, user: null });
        return r.data.user;
      },
      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, admin: null });
      },
      refreshMe: async () => {
        try {
          const r = await api.get("/auth/me");
          set({ user: r.data, admin: null });
        } catch {
          try {
            const r = await api.get("/admin/auth/me");
            set({ admin: r.data, user: null });
          } catch { set({ user: null, admin: null }); }
        }
      },
    }),
    { name: "ds-auth", partialize: (s) => ({ user: s.user, admin: s.admin }) }
  )
);
