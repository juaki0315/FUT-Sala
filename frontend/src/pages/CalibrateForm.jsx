import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Target, Compass, Sparkles, Shield, Dumbbell, Star, Check } from "lucide-react";
import Layout from "../components/Layout";
import PlayerCard from "../components/PlayerCard";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const ATTRS = [
  { key: "ritmo", label: "Ritmo", icon: Zap },
  { key: "tiro", label: "Tiro", icon: Target },
  { key: "pase", label: "Pase", icon: Compass },
  { key: "regate", label: "Regate", icon: Sparkles },
  { key: "defensa", label: "Defensa", icon: Shield },
  { key: "fisico", label: "Físico", icon: Dumbbell },
];

const STAR_ATTRS = [
  { key: "pierna_mala", label: "Pierna mala" },
  { key: "filigranas", label: "Filigranas" },
];

const DEFAULT_VOTE = {
  ritmo: 50, tiro: 50, pase: 50, regate: 50, defensa: 50, fisico: 50,
  pierna_mala: 3, filigranas: 3,
};

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button key={i} type="button" onClick={() => onChange(i + 1)}>
          <Star
            size={22}
            className={i < value ? "fill-gold-400 text-gold-400" : "text-pitch-700"}
          />
        </button>
      ))}
    </div>
  );
}

export default function CalibrateForm() {
  const { targetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [target, setTarget] = useState(null);
  const [vote, setVote] = useState(DEFAULT_VOTE);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const [tRes, vRes] = await Promise.all([
        api.getPlayer(targetId),
        api.listInitialVotes(targetId),
      ]);
      setTarget(tRes.data);
      setAlreadyVoted(vRes.data.some((v) => v.voter === user?.id));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const setAttr = (key, value) => setVote((v) => ({ ...v, [key]: value }));

  const previewOvr = Math.round(
    ATTRS.reduce((sum, a) => sum + vote[a.key], 0) / ATTRS.length
  );

  const previewPlayer = target
    ? { ...target, ...vote, overall_rating: previewOvr, current_card_rating: previewOvr, is_totw_active: false }
    : null;

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await api.castInitialVote({ target: Number(targetId), ...vote });
      setSaved(true);
      setTimeout(() => navigate("/calibracion"), 900);
    } catch (err) {
      const detail = err.response?.data;
      const msg =
        (typeof detail === "object" && detail && Object.values(detail)[0]) ||
        err.friendlyMessage ||
        "No se pudo guardar el voto.";
      setError(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !target) {
    return (
      <Layout>
        <div className="p-5 space-y-3">
          <div className="h-8 w-40 rounded bg-pitch-850 animate-pulse" />
          <div className="h-64 rounded-xl bg-pitch-850 animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Nuevo voto
          </div>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">{target.username}</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        <div className="flex justify-center">
          <PlayerCard player={previewPlayer} size="md" animated={false} />
        </div>

        {alreadyVoted ? (
          <div className="rounded-lg bg-floodlight-500/10 border border-floodlight-500/30 px-4 py-3 text-sm text-floodlight-300/80 text-center">
            Ya has votado a este jugador. Los votos no se pueden editar.
          </div>
        ) : (
          <>
            {saved && (
              <div className="rounded-lg bg-floodlight-500/10 border border-floodlight-500/30 px-3 py-2 text-xs text-floodlight-300/80 flex items-center gap-1.5">
                <Check size={14} className="text-gold-400" /> Voto guardado.
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <section className="space-y-4">
              {ATTRS.map(({ key, label, icon: Icon }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-sm text-floodlight-300/70">
                      <Icon size={14} /> {label}
                    </span>
                    <span className="font-display text-lg text-gold-400">{vote[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={vote[key]}
                    onChange={(e) => setAttr(key, Number(e.target.value))}
                    className="w-full accent-gold-500"
                  />
                </div>
              ))}
            </section>

            <section className="space-y-3">
              {STAR_ATTRS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-floodlight-300/70">{label}</span>
                  <StarPicker value={vote[key]} onChange={(v) => setAttr(key, v)} />
                </div>
              ))}
            </section>

            <button
              onClick={submit}
              disabled={saving}
              className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-pitch-900 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Enviar voto"}
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}
