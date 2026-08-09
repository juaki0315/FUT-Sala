import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Trophy, Vote, Flag } from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const TEAM_LABEL = { A: "Equipo A", B: "Equipo B" };

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [selectedTop5, setSelectedTop5] = useState([]);
  const [totw, setTotw] = useState([]);
  const [msg, setMsg] = useState("");

  const isAdmin = user?.is_staff;

  const load = async () => {
    const [mRes, pRes] = await Promise.all([api.getMatch(id), api.listPlayers()]);
    setMatch(mRes.data);
    setAllPlayers(pRes.data);
    if (mRes.data.is_finished) {
      const t = await api.currentTotw(id);
      setTotw(t.data);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const unassigned = allPlayers.filter(
    (p) => !match?.participants.some((mp) => mp.player === p.id)
  );

  const assign = async (playerId, team) => {
    await api.addPlayersToMatch(id, [{ player: playerId, team }]);
    load();
  };

  const finish = async (e) => {
    e.preventDefault();
    await api.finishMatch(id, { team_a_score: Number(scoreA), team_b_score: Number(scoreB) });
    setMsg("Partido cerrado y medias actualizadas.");
    load();
  };

  const toggleTop5 = (playerId) => {
    setSelectedTop5((prev) => {
      if (prev.includes(playerId)) return prev.filter((p) => p !== playerId);
      if (prev.length >= 5) return prev;
      return [...prev, playerId];
    });
  };

  const submitVotes = async () => {
    const points = [5, 4, 3, 2, 1];
    for (let i = 0; i < selectedTop5.length; i++) {
      await api.castMatchVote({ match: Number(id), voted_player: selectedTop5[i], points: points[i] });
    }
    setMsg("¡Voto registrado!");
    setSelectedTop5([]);
  };

  const runTotw = async () => {
    await api.generateTotw(id);
    setMsg("TOTJ generado.");
    load();
  };

  if (loading || !match) {
    return (
      <Layout>
        <div className="p-5 space-y-3">
          <div className="h-8 w-40 rounded bg-pitch-850 animate-pulse" />
          <div className="h-32 rounded-xl bg-pitch-850 animate-pulse" />
        </div>
      </Layout>
    );
  }

  const teamA = match.participants.filter((p) => p.team === "A");
  const teamB = match.participants.filter((p) => p.team === "B");

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            {match.is_finished ? "Finalizado" : "Programado"}
          </div>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">
            {new Date(match.date_played).toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        {match.is_finished && (
          <div className="text-center">
            <div className="font-display text-5xl text-gold-400">
              {match.team_a_score} - {match.team_b_score}
            </div>
          </div>
        )}

        {msg && (
          <div className="rounded-lg bg-floodlight-500/10 border border-floodlight-500/30 px-3 py-2 text-xs text-floodlight-300/80">
            {msg}
          </div>
        )}

        {/* Alineaciones */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
            <Users size={13} /> Alineaciones
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {["A", "B"].map((team) => (
              <div key={team} className="rounded-xl bg-pitch-850 border border-pitch-700 p-3">
                <div className="text-xs font-semibold text-floodlight-300/60 mb-2">{TEAM_LABEL[team]}</div>
                <div className="space-y-1.5">
                  {(team === "A" ? teamA : teamB).map((mp) => (
                    <div key={mp.id} className="text-sm text-floodlight-300 flex items-center justify-between">
                      <span className="truncate">{mp.player_detail?.username}</span>
                      {mp.is_totw && <Trophy size={12} className="text-gold-400 shrink-0" />}
                    </div>
                  ))}
                  {(team === "A" ? teamA : teamB).length === 0 && (
                    <div className="text-xs text-floodlight-300/30">Sin jugadores</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isAdmin && !match.is_finished && unassigned.length > 0 && (
            <div className="mt-3 rounded-xl bg-pitch-850 border border-dashed border-pitch-700 p-3">
              <div className="text-xs font-semibold text-floodlight-300/50 mb-2">Añadir jugador</div>
              <div className="space-y-2">
                {unassigned.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-floodlight-300 truncate">{p.username}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => assign(p.id, "A")}
                        className="rounded-lg bg-pitch-800 px-2.5 py-1 text-xs font-semibold text-floodlight-300/70 hover:text-gold-400"
                      >
                        Equipo A
                      </button>
                      <button
                        onClick={() => assign(p.id, "B")}
                        className="rounded-lg bg-pitch-800 px-2.5 py-1 text-xs font-semibold text-floodlight-300/70 hover:text-gold-400"
                      >
                        Equipo B
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Cierre de partido (admin) */}
        {isAdmin && !match.is_finished && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
              <Flag size={13} /> Cerrar partido
            </h2>
            <form onSubmit={finish} className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="A"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                className="w-16 text-center rounded-xl bg-pitch-850 border border-pitch-700 py-2.5 text-floodlight-300 outline-none focus:border-gold-500"
              />
              <span className="text-floodlight-300/40 font-display text-xl">-</span>
              <input
                type="number"
                min="0"
                placeholder="B"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                className="w-16 text-center rounded-xl bg-pitch-850 border border-pitch-700 py-2.5 text-floodlight-300 outline-none focus:border-gold-500"
              />
              <button className="flex-1 rounded-xl bg-gold-500 py-2.5 text-sm font-semibold text-pitch-900">
                Finalizar partido
              </button>
            </form>
          </section>
        )}

        {/* Votación post-partido */}
        {match.is_finished && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
              <Vote size={13} /> Vota tu Top 5 de la jornada
            </h2>
            <div className="space-y-1.5">
              {match.participants.map((mp) => {
                const rank = selectedTop5.indexOf(mp.player);
                return (
                  <button
                    key={mp.id}
                    onClick={() => toggleTop5(mp.player)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                      rank >= 0
                        ? "border-gold-500 bg-gold-500/10 text-gold-300"
                        : "border-pitch-700 bg-pitch-850 text-floodlight-300"
                    }`}
                  >
                    <span>{mp.player_detail?.username}</span>
                    {rank >= 0 && (
                      <span className="font-display text-lg">{[5, 4, 3, 2, 1][rank]} pts</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={submitVotes}
              disabled={selectedTop5.length === 0}
              className="mt-3 w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-pitch-900 disabled:opacity-40"
            >
              Enviar voto ({selectedTop5.length}/5)
            </button>

            {isAdmin && (
              <button
                onClick={runTotw}
                className="mt-2 w-full rounded-xl border border-totw-purple bg-totw-purple/20 py-3 text-sm font-semibold text-gold-300"
              >
                Generar Equipo de la Jornada
              </button>
            )}
          </section>
        )}

        {/* TOTJ resultante */}
        <AnimatePresence>
          {totw.length > 0 && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
                <Trophy size={13} /> Equipo de la Jornada
              </h2>
              <div className="space-y-1.5">
                {totw.map((mp) => (
                  <div
                    key={mp.id}
                    className="flex items-center justify-between rounded-xl bg-gradient-to-r from-totw-purple/25 to-transparent border border-totw-purple/40 px-3.5 py-2.5"
                  >
                    <span className="text-sm text-gold-200">
                      #{mp.totw_rank} {mp.player_detail?.username}
                    </span>
                    <span className="font-display text-base text-gold-400">+{mp.totw_boost} OVR</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
