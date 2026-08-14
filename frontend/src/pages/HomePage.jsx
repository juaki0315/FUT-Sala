import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, ChevronRight, Trophy, ClipboardCheck, Search, Medal, Users2 } from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import PlayerCard from "../components/PlayerCard";
import ActivityFeed from "../components/ActivityFeed";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

// Debe coincidir con la regla de CalibrationList.jsx: un objetivo desaparece
// del todo solo si ya está calibrado y (si tenía evaluadores asignados) todos
// ellos ya han votado.
const isFullyResolved = (p) =>
  p.calibrated && (p.assigned_voters_count === 0 || p.initial_votes_count >= p.assigned_voters_count);

export default function HomePage() {
  const { user, profile } = useAuth();
  const [matches, setMatches] = useState([]);
  const [totw, setTotw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCalibration, setPendingCalibration] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.listMatches();
        const list = res.data;
        setMatches(list);
        const lastFinished = list.find((m) => m.is_finished);
        if (lastFinished) {
          const t = await api.currentTotw(lastFinished.id);
          setTotw(t.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await api.listPlayers();
      const notMe = res.data.filter((p) => p.id !== profile?.id && !isFullyResolved(p));

      if (user?.is_staff) {
        setPendingCalibration(notMe.length);
        return;
      }

      const assignedToMe = notMe.filter((p) => p.assigned_voter_ids.includes(user?.id));
      const votes = await Promise.all(assignedToMe.map((t) => api.listInitialVotes(t.id)));
      const notVotedYet = assignedToMe.filter((_, i) => !votes[i].data.some((v) => v.voter === user?.id));
      setPendingCalibration(notVotedYet.length);
    })();
  }, [user?.id, profile?.id]);

  const upcoming = matches.find((m) => !m.is_finished);

  return (
    <Layout>
      <PageHeader
        eyebrow="Jornada actual"
        title="Inicio"
        action={
          <Link
            to="/jugadores"
            className="h-9 w-9 rounded-full bg-pitch-850 border border-pitch-700 flex items-center justify-center text-floodlight-300/70 hover:text-gold-400 hover:border-gold-500/40 transition-colors"
          >
            <Search size={16} />
          </Link>
        }
      />

      <div className="px-5 py-5 space-y-6">
        {/* Cartas por calibrar */}
        {pendingCalibration > 0 && (
          <Link
            to="/calibracion"
            className="block rounded-2xl bg-gold-500/10 border border-gold-500/40 p-4 hover:border-gold-500/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gold-500/15 flex items-center justify-center text-gold-400">
                <ClipboardCheck size={20} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gold-300">
                  {pendingCalibration} jugador{pendingCalibration === 1 ? "" : "es"} nuevo
                  {pendingCalibration === 1 ? "" : "s"} esperando tu voto
                </div>
                <div className="text-xs text-floodlight-300/50 mt-0.5">Cartas por calibrar</div>
              </div>
              <ChevronRight size={18} className="text-gold-400/70" />
            </div>
          </Link>
        )}

        <ActivityFeed />

        {/* Próximo partido */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2">
            Próximo partido
          </h2>
          {loading ? (
            <div className="h-24 rounded-2xl bg-pitch-850 animate-pulse" />
          ) : upcoming ? (
            <Link
              to="/partidos"
              className="surface surface-interactive block rounded-2xl p-4 hover:border-gold-500/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-floodlight-500/10 flex items-center justify-center text-floodlight-400">
                  <CalendarClock size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-xl text-floodlight-300 leading-none">
                    {new Date(upcoming.date_played).toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </div>
                  <div className="text-xs text-floodlight-300/50 mt-1">
                    {upcoming.participants.length} jugadores convocados
                  </div>
                </div>
                <ChevronRight size={18} className="text-floodlight-300/40" />
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-pitch-700 p-5 text-center text-sm text-floodlight-300/50">
              No hay partidos programados todavía.
            </div>
          )}
        </section>

        {/* Banner TOTJ */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2 flex items-center gap-1.5">
            <Trophy size={13} /> Equipo de la Jornada vigente
          </h2>
          {totw.length > 0 ? (
            <div className="rounded-2xl bg-gradient-to-br from-totw-purple/40 via-pitch-850 to-pitch-850 border border-totw-purple/40 p-4">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {totw.map((mp, i) => (
                  <motion.div
                    key={mp.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="shrink-0"
                  >
                    <PlayerCard player={mp.player_detail} size="sm" />
                  </motion.div>
                ))}
              </div>
              <Link to="/totj" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold-400">
                Ver galería completa <ChevronRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-pitch-700 p-5 text-center text-sm text-floodlight-300/50">
              Aún no se ha generado el TOTJ de esta jornada.
            </div>
          )}
        </section>

        {/* Récords y comparativa */}
        <section>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/records"
              className="surface surface-interactive flex flex-col items-center gap-2 rounded-2xl p-4 text-center hover:border-gold-500/50"
            >
              <div className="glow-gold h-10 w-10 rounded-xl bg-gold-500/15 flex items-center justify-center text-gold-400">
                <Medal size={19} />
              </div>
              <span className="text-sm font-semibold text-floodlight-300">Muro de récords</span>
            </Link>
            <Link
              to="/comparar"
              className="surface surface-interactive flex flex-col items-center gap-2 rounded-2xl p-4 text-center hover:border-gold-500/50"
            >
              <div className="h-10 w-10 rounded-xl bg-floodlight-500/10 flex items-center justify-center text-floodlight-400">
                <Users2 size={19} />
              </div>
              <span className="text-sm font-semibold text-floodlight-300">Comparar jugadores</span>
            </Link>
          </div>
        </section>

        {/* Mi carta resumida */}
        {profile && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2">
              Tu carta
            </h2>
            <Link to="/mi-carta" className="flex items-center gap-4">
              <PlayerCard player={profile} size="sm" />
              <div className="text-sm text-floodlight-300/60">
                Toca para ver el detalle completo y personalizar tu estilo.
              </div>
            </Link>
          </section>
        )}
      </div>
    </Layout>
  );
}
