import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/endpoints";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [pendingReveal, setPendingReveal] = useState(null);

  const checkPendingReveal = async () => {
    try {
      const res = await api.pendingReveal();
      setPendingReveal(res.data);
    } catch {
      setPendingReveal(null);
    }
  };

  const dismissPendingReveal = async () => {
    if (!pendingReveal) return;
    const matchId = pendingReveal.match_id;
    setPendingReveal(null);
    try {
      await api.dismissReveal(matchId);
    } catch {
      // Si falla, se le volverá a mostrar en la próxima apertura de la app.
    }
  };

  const reloadProfile = async () => {
    try {
      const res = await api.myProfile();
      setProfile(res.data);
      checkPendingReveal();
    } catch {
      setProfile(null);
    }
  };

  const loadSession = async () => {
    let currentUser = null;
    try {
      const res = await api.currentUser();
      currentUser = res.data;
    } catch {
      currentUser = null;
    }
    setUser(currentUser);
    if (currentUser) {
      await reloadProfile();
    } else {
      setProfile(null);
    }
    return currentUser;
  };

  useEffect(() => {
    const access = localStorage.getItem("fs_access");
    if (access) {
      loadSession().finally(() => {
        setLoading(false);
        setReady(true);
      });
    } else {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // Disparado por client.js cuando el refresh token también expiró/falló:
    // limpiamos sesión sin recargar la página (evita el flash de un 404 en
    // hostings estáticos y mantiene la app como SPA).
    const onForcedLogout = () => {
      setUser(null);
      setProfile(null);
    };
    window.addEventListener("auth:logout", onForcedLogout);
    return () => window.removeEventListener("auth:logout", onForcedLogout);
  }, []);

  const login = async (username, password) => {
    const res = await client.post("/auth/token/", { username, password });
    localStorage.setItem("fs_access", res.data.access);
    localStorage.setItem("fs_refresh", res.data.refresh);
    return loadSession();
  };

  const register = async (username, email, password) => {
    await api.register({ username, email, password });
    return login(username, password);
  };

  const logout = () => {
    localStorage.removeItem("fs_access");
    localStorage.removeItem("fs_refresh");
    setUser(null);
    setProfile(null);
    setPendingReveal(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        profile,
        setProfile,
        loading,
        ready,
        login,
        register,
        logout,
        refreshProfile: reloadProfile,
        pendingReveal,
        dismissPendingReveal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
