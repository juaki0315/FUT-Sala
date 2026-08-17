import { Fragment, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Trophy, Vote, Flag, BarChart3, Goal, Trash2, Scale } from "lucide-react";
import Layout from "../components/Layout";
import PitchLineup from "../components/PitchLineup";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

function ConvocadosList({ participants }) {
  if (participants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-pitch-700 p-5 text-center text-sm text-floodlight-300/40">
        Todavía no hay convocados.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {participants.map((mp) => (
        <Link
          key={mp.id}
          to={`/jugadores/${mp.player}`}
          className="surface surface-interactive flex items-center gap-2 rounded-xl px-3 py-2 hover:border-gold-500/40"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-pitch-900 border border-gold-500/60 overflow-hidden flex items-center justify-center text-floodlight-200 font-display text-sm">
            {mp.player_detail?.photo_url ? (
              <img src={mp.player_detail.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              mp.player_detail?.username?.[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <span className="text-sm text-floodlight-300">{mp.player_detail?.username}</span>
        </Link>
      ))}
    </div>
  );
}

const REVIEW_ATTRS = [
  { key: "ritmo", label: "RIT" },
  { key: "tiro", label: "TIR" },
  { key: "pase", label: "PAS" },
  { key: "regate", label: "REG" },
  { key: "defensa", label: "DEF" },
  { key: "fisico", label: "FIS" },
];
const REVIEW_ATTR_LABEL = Object.fromEntries(REVIEW_ATTRS.map((f) => [f.key, f.label]));
const REVIEW_BUDGET = 3;

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [playerStats, setPlayerStats] = useState({});
  const [selectedTop5, setSelectedTop5] = useState([]);
  const [totw, setTotw] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [myVotes, setMyVotes] = useState(null);
  const [allVotes, setAllVotes] = useState([]);
  const [votingSaving, setVotingSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState({});
  const [reviewStatus, setReviewStatus] = useState(null);
  const [reviewSelections, setReviewSelections] = useState({});
  const [reviewSaving, setReviewSaving] = useState(false);

  const isAdmin = user?.is_staff;

  const load = async () => {
    const [mRes, pRes] = await Promise.all([api.getMatch(id), api.listPlayers()]);
    setMatch(mRes.data);
    setAllPlayers(pRes.data);
    if (mRes.data.is_finished) {
      const t = await api.currentTotw(id);
      setTotw(t.data);
      const vRes = await api.listMatchVotes(id);
      const mine = vRes.data.filter((v) => v.voter === user?.id);
      setMyVotes(mine.length > 0 ? mine : null);
      setAllVotes(vRes.data);
      const rev = await api.getPerformanceReview(id);
      setReviewStatus(rev.data);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const unassigned = allPlayers.filter(
    (p) => !match?.participants.some((mp) => mp.player === p.id)
  );

  const callUp = async (playerId) => {
    await api.addPlayersToMatch(id, [{ player: playerId }]);
    load();
  };

  const setTeam = (playerId, team) => {
    setTeamAssignments((prev) => ({ ...prev, [playerId]: team }));
  };

  const setStat = (playerId, field, value) => {
    setPlayerStats((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
  };

  const allTeamsAssigned =
    match?.participants.length > 0 &&
    match.participants.every((mp) => mp.team || teamAssignments[mp.player]);

  const finish = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const teams = match.participants.map((mp) => ({
        player: mp.player,
        team: mp.team || teamAssignments[mp.player],
      }));
      const stats = match.participants.map((mp) => ({
        player: mp.player,
        goals: Number(playerStats[mp.player]?.goals || 0),
        assists: Number(playerStats[mp.player]?.assists || 0),
      }));
      await api.finishMatch(id, {
        team_a_score: Number(scoreA),
        team_b_score: Number(scoreB),
        teams,
        stats,
      });
      setMsg("Partido cerrado y medias actualizadas.");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || "No se pudo cerrar el partido.");
    }
  };

  const toggleTop5 = (playerId) => {
    setSelectedTop5((prev) => {
      if (prev.includes(playerId)) return prev.filter((p) => p !== playerId);
      if (prev.length >= 5) return prev;
      return [...prev, playerId];
    });
  };

  const submitVotes = async () => {
    setError("");
    setVotingSaving(true);
    try {
      const points = [5, 4, 3, 2, 1];
      const votes = selectedTop5.map((playerId, i) => ({ voted_player: playerId, points: points[i] }));
      const res = await api.submitMatchVotes(id, votes);
      setMyVotes(res.data);
      setMsg("¡Voto registrado!");
      setSelectedTop5([]);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.detail ||
        (typeof data === "object" && data && Object.values(data)[0]) ||
        err.friendlyMessage;
      setError(Array.isArray(msg) ? msg[0] : msg || "No se pudo registrar el voto.");
    } finally {
      setVotingSaving(false);
    }
  };

  const deleteMatch = async () => {
    const confirmed = window.confirm(
      "¿Eliminar este partido para siempre?\n\n" +
        "Desaparecerá del historial y de las estadísticas (partidos, goles, asistencias, TOTJ) de todos los jugadores convocados. " +
        "Los atributos de las cartas que ya hayan subido por este partido no se revierten."
    );
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteMatch(id);
      navigate("/partidos");
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || "No se pudo eliminar el partido.");
      setDeleting(false);
    }
  };

  const runTotw = async () => {
    setError("");
    try {
      await api.generateTotw(id);
      setMsg("TOTJ generado.");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || "No se pudo generar el TOTJ.");
    }
  };

  const reviewBudgetUsed = (playerId) =>
    Object.values(reviewSelections[playerId] || {}).reduce((sum, d) => sum + Math.abs(d), 0);

  const toggleReviewAttribute = (playerId, attribute) => {
    setReviewSelections((prev) => {
      const playerSel = { ...(prev[playerId] || {}) };
      if (attribute in playerSel) {
        delete playerSel[attribute];
      } else {
        const used = Object.values(playerSel).reduce((sum, d) => sum + Math.abs(d), 0);
        if (used >= REVIEW_BUDGET) return prev;
        playerSel[attribute] = 0;
      }
      return { ...prev, [playerId]: playerSel };
    });
  };

  const adjustReviewDelta = (playerId, attribute, diff) => {
    setReviewSelections((prev) => {
      const playerSel = { ...(prev[playerId] || {}) };
      const current = playerSel[attribute] || 0;
      const next = current + diff;
      const otherUsed = Object.entries(playerSel)
        .filter(([a]) => a !== attribute)
        .reduce((sum, [, d]) => sum + Math.abs(d), 0);
      if (otherUsed + Math.abs(next) > REVIEW_BUDGET) return prev;
      playerSel[attribute] = Math.max(-3, Math.min(3, next));
      return { ...prev, [playerId]: playerSel };
    });
  };

  const submitReview = async () => {
    setError("");
    setReviewSaving(true);
    try {
      const votes = Object.entries(reviewSelections).flatMap(([playerId, attrs]) =>
        Object.entries(attrs)
          .filter(([, delta]) => delta !== 0)
          .map(([attribute, delta]) => ({ target: Number(playerId), attribute, delta }))
      );
      const res = await api.submitPerformanceReview(id, votes);
      setReviewStatus(res.data);
      setMsg("Revisión de Lloros enviada.");
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || "No se pudo enviar la Revisión de Lloros.");
    } finally {
      setReviewSaving(false);
    }
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

  const voteTally = (() => {
    const tally = new Map();
    for (const v of allVotes) {
      const entry = tally.get(v.voted_player) || { points: 0, count: 0 };
      entry.points += v.points;
      entry.count += 1;
      tally.set(v.voted_player, entry);
    }
    return Array.from(tally.entries())
      .map(([playerId, { points, count }]) => ({
        player: allPlayers.find((p) => p.id === playerId),
        points,
        count,
      }))
      .sort((a, b) => b.points - a.points);
  })();
  const distinctVoters = new Set(allVotes.map((v) => v.voter)).size;

  // Nunca te puedes votar a ti mismo (el backend ya lo rechaza, pero si se
  // cuela en el Top 5 elegido revienta el envío entero de las 5 elecciones
  // a la vez). Más simple y robusto: quitarte directamente de la lista.
  const voteCandidates = match.participants.filter((mp) => mp.player_detail?.user?.id !== user?.id);
  const isParticipant = match.participants.some((mp) => mp.player_detail?.user?.id === user?.id);

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

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Convocados / Alineaciones */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
            <Users size={13} /> {match.is_finished ? "Alineaciones" : "Convocados"}
          </h2>
          {match.is_finished ? (
            <PitchLineup teamA={teamA} teamB={teamB} />
          ) : (
            <ConvocadosList participants={match.participants} />
          )}

          {isAdmin && !match.is_finished && unassigned.length > 0 && (
            <div className="mt-3 rounded-xl bg-pitch-850 border border-dashed border-pitch-700 p-3">
              <div className="text-xs font-semibold text-floodlight-300/50 mb-2">Convocar jugador</div>
              <div className="space-y-2">
                {unassigned.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-floodlight-300 truncate">{p.username}</span>
                    <button
                      onClick={() => callUp(p.id)}
                      className="rounded-lg bg-pitch-800 px-3 py-1.5 text-xs font-semibold text-floodlight-300/70 hover:text-gold-400"
                    >
                      Convocar
                    </button>
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
            <form onSubmit={finish} className="space-y-4">
              {match.participants.length > 0 && (
                <div className="surface rounded-xl p-3">
                  <div className="text-xs font-semibold text-floodlight-300/50 mb-2">Asignar equipos</div>
                  <div className="space-y-2">
                    {match.participants.map((mp) => {
                      const current = mp.team || teamAssignments[mp.player];
                      return (
                        <div key={mp.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-floodlight-300 truncate">
                            {mp.player_detail?.username}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setTeam(mp.player, "A")}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                current === "A"
                                  ? "bg-gold-500 text-pitch-900"
                                  : "bg-pitch-800 text-floodlight-300/70 hover:text-gold-400"
                              }`}
                            >
                              Equipo A
                            </button>
                            <button
                              type="button"
                              onClick={() => setTeam(mp.player, "B")}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                current === "B"
                                  ? "bg-gold-500 text-pitch-900"
                                  : "bg-pitch-800 text-floodlight-300/70 hover:text-gold-400"
                              }`}
                            >
                              Equipo B
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
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
              </div>

              {match.participants.length > 0 && (
                <div className="surface rounded-xl p-3">
                  <div className="text-xs font-semibold text-floodlight-300/50 mb-2 flex items-center gap-1.5">
                    <Goal size={13} /> Goles y asistencias (opcional)
                  </div>
                  <div className="grid grid-cols-[1fr_3.5rem_3.5rem] gap-x-2 gap-y-2 items-center">
                    <span className="text-[10px] font-semibold text-floodlight-300/40 uppercase" />
                    <span className="text-[10px] font-semibold text-floodlight-300/40 uppercase text-center">
                      Goles
                    </span>
                    <span className="text-[10px] font-semibold text-floodlight-300/40 uppercase text-center">
                      Asist.
                    </span>
                    {match.participants.map((mp) => (
                      <Fragment key={mp.id}>
                        <span className="text-sm text-floodlight-300 truncate">
                          {mp.player_detail?.username}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={playerStats[mp.player]?.goals ?? ""}
                          onChange={(e) => setStat(mp.player, "goals", e.target.value)}
                          className="w-14 text-center rounded-lg bg-pitch-900 border border-pitch-700 py-1.5 text-sm text-floodlight-300 outline-none focus:border-gold-500"
                        />
                        <input
                          type="number"
                          min="0"
                          value={playerStats[mp.player]?.assists ?? ""}
                          onChange={(e) => setStat(mp.player, "assists", e.target.value)}
                          className="w-14 text-center rounded-lg bg-pitch-900 border border-pitch-700 py-1.5 text-sm text-floodlight-300 outline-none focus:border-gold-500"
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled={!allTeamsAssigned}
                className="w-full rounded-xl bg-gold-500 py-2.5 text-sm font-semibold text-pitch-900 disabled:opacity-40"
              >
                Finalizar partido
              </button>
              {!allTeamsAssigned && (
                <p className="text-[11px] text-floodlight-300/40 text-center">
                  Asigna un equipo a todos los convocados para poder cerrar el partido.
                </p>
              )}
            </form>
          </section>
        )}

        {/* Estado de la votación (solo admin) */}
        {isAdmin && match.is_finished && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
              <BarChart3 size={13} /> Estado de la votación
            </h2>
            <div className="surface rounded-xl p-3">
              <div className="text-xs text-floodlight-300/50 mb-2">
                {distinctVoters} persona{distinctVoters === 1 ? "" : "s"} han votado ·{" "}
                {allVotes.length} voto{allVotes.length === 1 ? "" : "s"} en total
              </div>
              {voteTally.length === 0 ? (
                <div className="text-sm text-floodlight-300/40 py-2 text-center">
                  Todavía nadie ha votado.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {voteTally.map((entry, i) => (
                    <div
                      key={entry.player?.id ?? i}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                        i < 5
                          ? "bg-totw-purple/15 border border-totw-purple/30 text-gold-200"
                          : "text-floodlight-300/70"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {i < 5 && <Trophy size={12} className="text-gold-400 shrink-0" />}#{i + 1}{" "}
                        {entry.player?.username ?? "Jugador eliminado"}
                      </span>
                      <span className="font-display text-base">
                        {entry.points} pts <span className="text-xs opacity-60">({entry.count})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Votación post-partido */}
        {match.is_finished && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
              <Vote size={13} /> Vota tu Top 5 de la jornada
            </h2>

            {myVotes ? (
              <div className="surface rounded-xl p-3 space-y-1.5">
                <div className="text-xs text-floodlight-300/50 mb-1">
                  Ya has votado en este partido. Los votos no se pueden editar.
                </div>
                {myVotes
                  .slice()
                  .sort((a, b) => b.points - a.points)
                  .map((v) => {
                    const mp = match.participants.find((p) => p.player === v.voted_player);
                    return (
                      <div key={v.id} className="flex items-center justify-between text-sm text-floodlight-300">
                        <span>{mp?.player_detail?.username ?? "?"}</span>
                        <span className="font-display text-base text-gold-400">{v.points} pts</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {voteCandidates.map((mp) => {
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
                  disabled={selectedTop5.length === 0 || votingSaving}
                  className="mt-3 w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-pitch-900 disabled:opacity-40"
                >
                  {votingSaving ? "Enviando..." : `Enviar voto (${selectedTop5.length}/5)`}
                </button>
              </>
            )}

            {isAdmin && !match.totw_generated && (
              <button
                onClick={runTotw}
                className="mt-2 w-full rounded-xl border border-totw-purple bg-totw-purple/20 py-3 text-sm font-semibold text-gold-300"
              >
                Generar Equipo de la Jornada
              </button>
            )}
          </section>
        )}

        {/* Revisión de Lloros */}
        {match.is_finished && reviewStatus && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3 flex items-center gap-1.5">
              <Scale size={13} /> Revisión de Lloros
            </h2>

            {reviewStatus.results.length > 0 && (
              <div className="surface rounded-xl p-3 space-y-1.5 mb-3">
                {reviewStatus.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-floodlight-300">
                      {r.username} <span className="text-floodlight-300/40">· {REVIEW_ATTR_LABEL[r.attribute]}</span>
                    </span>
                    <span
                      className={`font-display text-lg ${
                        r.delta > 0 ? "text-floodlight-400" : "text-red-300"
                      }`}
                    >
                      {r.delta > 0 ? `+${r.delta}` : r.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!isParticipant ? (
              <div className="rounded-xl border border-dashed border-pitch-700 p-4 text-center text-sm text-floodlight-300/40">
                Solo pueden participar los convocados a este partido.
              </div>
            ) : reviewStatus.has_submitted ? (
              <div className="surface rounded-xl p-3 text-sm text-floodlight-300/60 text-center">
                Ya has enviado tu Revisión de Lloros. Los cambios se aplican al instante conforme van votando (
                {reviewStatus.submitted_count}/{reviewStatus.total_participants} han votado).
              </div>
            ) : (
              <>
                <p className="text-xs text-floodlight-300/40 mb-3">
                  Para cada compañero, reparte hasta {REVIEW_BUDGET} puntos (subir o bajar) entre sus atributos —
                  p.ej. +2 regate y +1 físico. Es opcional por jugador. Se aplica al instante, sin esperar a que
                  voten los demás.
                </p>
                <div className="space-y-2">
                  {voteCandidates.map((mp) => {
                    const sel = reviewSelections[mp.player] || {};
                    const used = reviewBudgetUsed(mp.player);
                    const activeAttrs = REVIEW_ATTRS.filter((f) => f.key in sel);
                    return (
                      <div key={mp.id} className="surface rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-floodlight-300">
                            {mp.player_detail?.username}
                          </span>
                          <span className="text-[11px] text-floodlight-300/40">
                            {used}/{REVIEW_BUDGET} puntos
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1 mb-2">
                          {REVIEW_ATTRS.map((f) => {
                            const active = f.key in sel;
                            const current = mp.player_detail?.[f.key];
                            return (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => toggleReviewAttribute(mp.player, f.key)}
                                disabled={!active && used >= REVIEW_BUDGET}
                                className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-semibold disabled:opacity-30 ${
                                  active ? "bg-gold-500 text-pitch-900" : "bg-pitch-800 text-floodlight-300/60"
                                }`}
                              >
                                <span>{f.label}</span>
                                <span
                                  className={`text-[9px] font-normal ${
                                    active ? "text-pitch-900/60" : "text-floodlight-300/30"
                                  }`}
                                >
                                  {current}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {activeAttrs.length > 0 && (
                          <div className="space-y-1.5">
                            {activeAttrs.map((f) => {
                              const delta = sel[f.key];
                              const current = mp.player_detail?.[f.key] ?? 0;
                              return (
                                <div key={f.key} className="flex items-center justify-between">
                                  <span className="text-xs text-floodlight-300/50 w-16">
                                    {f.label} <span className="text-floodlight-300/30">({current})</span>
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => adjustReviewDelta(mp.player, f.key, -1)}
                                      className="h-7 w-7 rounded-full bg-pitch-800 text-floodlight-300 font-bold"
                                    >
                                      −
                                    </button>
                                    <span
                                      className={`font-display text-lg w-8 text-center ${
                                        delta > 0
                                          ? "text-floodlight-400"
                                          : delta < 0
                                            ? "text-red-300"
                                            : "text-floodlight-300/40"
                                      }`}
                                    >
                                      {delta > 0 ? `+${delta}` : delta}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => adjustReviewDelta(mp.player, f.key, 1)}
                                      className="h-7 w-7 rounded-full bg-pitch-800 text-floodlight-300 font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={submitReview}
                  disabled={reviewSaving}
                  className="mt-3 w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-pitch-900 disabled:opacity-50"
                >
                  {reviewSaving ? "Enviando..." : "Enviar Revisión de Lloros"}
                </button>
              </>
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

        {isAdmin && (
          <section>
            <button
              onClick={deleteMatch}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 size={16} /> {deleting ? "Eliminando..." : "Eliminar partido"}
            </button>
          </section>
        )}
      </div>
    </Layout>
  );
}
