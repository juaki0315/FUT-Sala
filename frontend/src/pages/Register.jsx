import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate("/");
    } catch (err) {
      const detail = err.response?.data;
      setError(detail ? JSON.stringify(detail) : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-pitch-950 pitch-texture px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl text-floodlight-300 font-semibold">Crea tu carta</h1>
          <p className="text-sm text-floodlight-300/50 mt-1">
            Empieza en gris — el grupo calibrará tus atributos con sus votos.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 placeholder:text-floodlight-300/30 outline-none focus:border-gold-500"
            placeholder="Usuario"
            value={form.username}
            onChange={set("username")}
            autoCapitalize="none"
          />
          <input
            type="email"
            className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 placeholder:text-floodlight-300/30 outline-none focus:border-gold-500"
            placeholder="Email"
            value={form.email}
            onChange={set("email")}
          />
          <input
            type="password"
            className="w-full rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 text-sm text-floodlight-300 placeholder:text-floodlight-300/30 outline-none focus:border-gold-500"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={form.password}
            onChange={set("password")}
          />
          {error && <p className="text-xs text-red-400 break-words">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gold-500 hover:bg-gold-400 transition-colors py-3 font-display text-lg font-semibold text-pitch-900 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-floodlight-300/50">
          ¿Ya tienes carta?{" "}
          <Link to="/login" className="text-gold-400 font-semibold">
            Inicia sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
