import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Calculator, Users2, ChevronDown, ChevronUp } from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

function AssignEvaluatorsPanel({ target, allPlayers, onSaved }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(new Set(target.assigned_voter_ids));
  const [saving, setSaving] = useState(false);

  const candidates = allPlayers.filter((p) => p.id !== target.id);

  const toggle = (userId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.assignEvaluators(target.id, Array.from(selected));
      await onSaved();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg border border-pitch-700 px-3 py-1.5 text-xs font-semibold text-floodlight-300/60"
      >
        <span className="flex items-center gap-1.5">
          <Users2 size={13} /> Asignar evaluadores ({target.assigned_voters_count})
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-pitch-900 border border-pitch-700 p-3 space-y-1.5">
          {candidates.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-floodlight-300/80">
              <input
                type="checkbox"
                checked={selected.has(p.user.id)}
                onChange={() => toggle(p.user.id)}
                className="accent-gold-500"
              />
              {p.username}
            </label>
          ))}
          <button
            onClick={save}
            disabled={saving}
            className="mt-2 w-full rounded-lg bg-gold-500 py-2 text-xs font-semibold text-pitch-900 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar asignación"}
          </button>
        </div>
      )}
    </div>
  );
}

// Un objetivo está "totalmente resuelto" (fuera de cualquier lista) solo cuando
// ya está calibrado Y, si tiene evaluadores asignados, todos ellos han votado
// ya. Así un evaluador rezagado puede seguir votando aunque el admin haya
// pulsado "Calcular carta" con los votos que hubiera hasta ese momento.
const isFullyResolved = (p) =>
  p.calibrated && (p.assigned_voters_count === 0 || p.initial_votes_count >= p.assigned_voters_count);

export default function CalibrationList() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [pending, setPending] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(null);

  const isAdmin = user?.is_staff;

  const load = async () => {
    const res = await api.listPlayers();
    setAllPlayers(res.data);
    const notMe = res.data.filter((p) => p.id !== profile?.id && !isFullyResolved(p));

    if (isAdmin) {
      // El admin gestiona todo lo que quede por resolver, esté o no calibrado.
      setPending(notMe);
      return;
    }

    // Un jugador normal solo ve lo que el admin le asignó explícitamente
    // valorar, y solo mientras no lo haya votado ya (el voto es inmutable).
    const assignedToMe = notMe.filter((p) => p.assigned_voter_ids.includes(user?.id));
    const votes = await Promise.all(assignedToMe.map((t) => api.listInitialVotes(t.id)));
    const notVotedYet = assignedToMe.filter((_, i) => !votes[i].data.some((v) => v.voter === user?.id));
    setPending(notVotedYet);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.id]);

  const runCalibration = async (id) => {
    setCalculating(id);
    try {
      await api.calibratePlayer(id);
      await load();
    } finally {
      setCalculating(null);
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
            Valoración inicial
          </div>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">Cartas por calibrar</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-xl bg-pitch-850 animate-pulse" />
            <div className="h-16 rounded-xl bg-pitch-850 animate-pulse" />
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pitch-700 p-5 text-center text-sm text-floodlight-300/50">
            {isAdmin
              ? "No hay cartas pendientes de calibrar."
              : "No tienes evaluaciones pendientes. Cuando el admin te asigne un jugador para valorar, aparecerá aquí."}
          </div>
        ) : (
          pending.map((p) => {
            const totalExpected = p.assigned_voters_count > 0 ? p.assigned_voters_count : null;
            return (
              <div key={p.id} className="rounded-2xl bg-pitch-850 border border-pitch-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-floodlight-500/10 flex items-center justify-center text-floodlight-400 font-display text-lg overflow-hidden">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.username} className="h-full w-full object-cover" />
                    ) : (
                      p.username?.[0]?.toUpperCase() ?? "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg text-floodlight-300 leading-none truncate">
                      {p.username}
                    </div>
                    <div className="text-xs text-floodlight-300/50 mt-1">
                      {p.initial_votes_count}
                      {totalExpected ? `/${totalExpected}` : ""} voto
                      {p.initial_votes_count === 1 ? "" : "s"} recibido
                      {p.initial_votes_count === 1 ? "" : "s"}
                    </div>
                    {p.preview_rating && (
                      <div className="text-xs font-semibold text-gold-400 mt-0.5">
                        Media provisional: {p.preview_rating.overall_rating} OVR
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Link
                      to={`/calibracion/${p.id}`}
                      className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-pitch-900 text-center flex items-center gap-1 justify-center"
                    >
                      <ClipboardCheck size={13} /> Votar
                    </Link>
                    {isAdmin && p.initial_votes_count > 0 && (
                      <button
                        onClick={() => runCalibration(p.id)}
                        disabled={calculating === p.id}
                        className="rounded-lg border border-totw-purple bg-totw-purple/20 px-3 py-1.5 text-xs font-semibold text-gold-300 flex items-center gap-1 justify-center disabled:opacity-50"
                      >
                        <Calculator size={13} />
                        {calculating === p.id ? "Calculando..." : "Calcular carta"}
                      </button>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <AssignEvaluatorsPanel target={p} allPlayers={allPlayers} onSaved={load} />
                )}
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
