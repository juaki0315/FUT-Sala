import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user?.is_staff ? "/calibracion" : "/");
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-pitch-950 pitch-texture px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-gold-500 flex items-center justify-center font-display text-2xl text-pitch-900 font-bold">
            FS
          </div>
          <h1 className="font-display text-4xl text-floodlight-300 font-semibold">FUT-Sala Tracker</h1>
          <p className="text-sm text-floodlight-300/50 mt-1">Tu carta. Tu jornada. Tu equipo.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 placeholder:text-floodlight-300/30 outline-none focus:border-gold-500"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
          />
          <input
            type="password"
            className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 placeholder:text-floodlight-300/30 outline-none focus:border-gold-500"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gold-500 hover:bg-gold-400 transition-colors py-3 font-display text-lg font-semibold text-pitch-900 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-floodlight-300/50">
          ¿Aún no tienes carta?{" "}
          <Link to="/registro" className="text-gold-400 font-semibold">
            Crea tu cuenta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
