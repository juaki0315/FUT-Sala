import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, KeyRound, User as UserIcon } from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

function extractError(err, fallback) {
  const detail = err.response?.data;
  const msg =
    (typeof detail === "object" && detail && Object.values(detail)[0]) ||
    err.friendlyMessage ||
    fallback;
  return Array.isArray(msg) ? msg[0] : String(msg);
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const saveUsername = async (e) => {
    e.preventDefault();
    setUsernameMsg("");
    setUsernameError("");
    setUsernameSaving(true);
    try {
      const res = await api.updateAccount({ username });
      setUser(res.data);
      setUsernameMsg("Nombre de usuario actualizado.");
    } catch (err) {
      setUsernameError(extractError(err, "No se pudo actualizar el usuario."));
    } finally {
      setUsernameSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordMsg("Contraseña actualizada.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(extractError(err, "No se pudo actualizar la contraseña."));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Cuenta
          </div>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">Ajustes</h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-8">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
            <UserIcon size={13} /> Nombre de usuario
          </h2>
          <form onSubmit={saveUsername} className="space-y-2">
            <input
              className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 outline-none focus:border-gold-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
            />
            {usernameMsg && (
              <p className="text-xs text-floodlight-300/70 flex items-center gap-1.5">
                <Check size={13} className="text-gold-400" /> {usernameMsg}
              </p>
            )}
            {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
            <button
              type="submit"
              disabled={usernameSaving || !username}
              className="w-full rounded-xl bg-gold-500 py-2.5 text-sm font-semibold text-pitch-900 disabled:opacity-60"
            >
              {usernameSaving ? "Guardando..." : "Guardar usuario"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
            <KeyRound size={13} /> Cambiar contraseña
          </h2>
          <form onSubmit={savePassword} className="space-y-2">
            <input
              type="password"
              className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 outline-none focus:border-gold-500"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 outline-none focus:border-gold-500"
              placeholder="Contraseña nueva (mín. 6 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 outline-none focus:border-gold-500"
              placeholder="Repite la contraseña nueva"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {passwordMsg && (
              <p className="text-xs text-floodlight-300/70 flex items-center gap-1.5">
                <Check size={13} className="text-gold-400" /> {passwordMsg}
              </p>
            )}
            {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
            <button
              type="submit"
              disabled={passwordSaving || !currentPassword || !newPassword}
              className="w-full rounded-xl bg-gold-500 py-2.5 text-sm font-semibold text-pitch-900 disabled:opacity-60"
            >
              {passwordSaving ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
