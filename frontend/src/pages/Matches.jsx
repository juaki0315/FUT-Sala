import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");

  const load = async () => {
    const res = await api.listMatches();
    setMatches(res.data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const createMatch = async (e) => {
    e.preventDefault();
    if (!date) return;
    await api.createMatch({ date_played: new Date(date).toISOString() });
    setDate("");
    setShowForm(false);
    load();
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="Historial"
        title="Partidos"
        action={
          user?.is_staff && (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="h-9 w-9 rounded-full bg-gold-500 flex items-center justify-center text-pitch-900"
            >
              <Plus size={18} />
            </button>
          )
        }
      />

      {showForm && (
        <form onSubmit={createMatch} className="px-5 py-4 border-b border-pitch-800 flex gap-2">
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-xl bg-pitch-850 border border-pitch-700 px-3 py-2.5 text-sm text-floodlight-300 outline-none focus:border-gold-500"
          />
          <button className="rounded-xl bg-gold-500 px-4 text-sm font-semibold text-pitch-900">
            Crear
          </button>
        </form>
      )}

      <div className="px-5 py-4 space-y-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-pitch-850 animate-pulse" />
          ))
        ) : matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pitch-700 p-6 text-center text-sm text-floodlight-300/50">
            Todavía no hay partidos creados.
          </div>
        ) : (
          matches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/partidos/${m.id}`}
                className="flex items-center gap-3 rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 hover:border-gold-500/40 transition-colors"
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    m.is_finished ? "bg-gold-500/15 text-gold-400" : "bg-floodlight-500/10 text-floodlight-400"
                  }`}
                >
                  {m.is_finished ? <CheckCircle2 size={17} /> : <Clock size={17} />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-floodlight-300">
                    {new Date(m.date_played).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-floodlight-300/50">
                    {m.is_finished ? `${m.team_a_score} - ${m.team_b_score}` : `${m.participants.length} convocados`}
                  </div>
                </div>
                <ChevronRight size={16} className="text-floodlight-300/30" />
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </Layout>
  );
}
