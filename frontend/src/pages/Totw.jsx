import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import TotwPitch from "../components/TotwPitch";
import { api } from "../api/endpoints";

function HistoryAvatar({ entry }) {
  return (
    <Link
      to={`/jugadores/${entry.player_id}`}
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col items-center gap-1 w-12 shrink-0"
    >
      <div className="relative h-10 w-10 rounded-full bg-pitch-900 border-2 border-gold-500/60 overflow-hidden flex items-center justify-center text-floodlight-200 font-display text-sm">
        {entry.photo_url ? (
          <img src={entry.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          entry.username?.[0]?.toUpperCase() ?? "?"
        )}
        {entry.rank === 1 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold-500 text-pitch-900 flex items-center justify-center text-[9px] font-bold">
            1
          </span>
        )}
      </div>
      <span className="text-[9px] text-floodlight-300/50 truncate w-full text-center">{entry.username}</span>
    </Link>
  );
}

function HistoryEntry({ entry }) {
  return (
    <Link
      to={`/partidos/${entry.match_id}`}
      className="surface surface-interactive block rounded-xl p-3 hover:border-gold-500/40"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-floodlight-300/50">
          {new Date(entry.date_played).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className="text-xs font-semibold text-floodlight-300/70">
          {entry.team_a_score} - {entry.team_b_score}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {entry.totw.map((e) => (
          <HistoryAvatar key={e.player_id} entry={e} />
        ))}
      </div>
    </Link>
  );
}

export default function Totw() {
  const [totw, setTotw] = useState([]);
  const [matchDate, setMatchDate] = useState(null);
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.listMatches();
      const lastFinished = res.data.find((m) => m.is_finished);
      if (lastFinished) {
        setMatchDate(lastFinished.date_played);
        setCurrentMatchId(lastFinished.id);
        const t = await api.currentTotw(lastFinished.id);
        setTotw(t.data.sort((a, b) => a.totw_rank - b.totw_rank));
      }
      setLoading(false);
    })();

    api
      .totwHistory()
      .then((res) => setHistory(res.data))
      .finally(() => setHistoryLoading(false));
  }, []);

  const pastHistory = history.filter((h) => h.match_id !== currentMatchId);

  return (
    <Layout>
      <PageHeader eyebrow="Cartas especiales" title="TOTJ" />

      <div className="px-5 py-6">
        {matchDate && (
          <p className="text-xs text-floodlight-300/40 mb-5">
            Jornada del{" "}
            {new Date(matchDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}vigente hasta el próximo partido
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-pitch-850 animate-pulse" />
            ))}
          </div>
        ) : totw.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pitch-700 p-8 text-center">
            <Trophy size={28} className="mx-auto text-floodlight-300/20 mb-2" />
            <p className="text-sm text-floodlight-300/50">
              Todavía no se ha generado ningún Equipo de la Jornada.
            </p>
          </div>
        ) : (
          <TotwPitch entries={totw} />
        )}

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
            Jornadas anteriores
          </h2>
          {historyLoading ? (
            <div className="space-y-2">
              <div className="h-24 rounded-xl bg-pitch-850 animate-pulse" />
              <div className="h-24 rounded-xl bg-pitch-850 animate-pulse" />
            </div>
          ) : pastHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-pitch-700 p-5 text-center text-sm text-floodlight-300/40">
              Todavía no hay más jornadas en el histórico.
            </div>
          ) : (
            <div className="space-y-2">
              {pastHistory.map((entry) => (
                <HistoryEntry key={entry.match_id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
