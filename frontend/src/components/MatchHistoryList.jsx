import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

const RESULT_STYLE = {
  win: { label: "V", className: "bg-floodlight-500/15 text-floodlight-400" },
  draw: { label: "E", className: "bg-pitch-700 text-floodlight-300/70" },
  loss: { label: "D", className: "bg-red-500/15 text-red-300" },
};

/** Historial partido a partido: resultado, marcador y goles/asistencias de ese día. */
export default function MatchHistoryList({ history }) {
  if (!history || history.length === 0) {
    return (
      <section className="w-full">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
          Historial de partidos
        </h2>
        <div className="rounded-xl border border-dashed border-pitch-700 p-5 text-center text-sm text-floodlight-300/40">
          Todavía no ha disputado ningún partido.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
        Historial de partidos
      </h2>
      <div className="space-y-1.5">
        {history.map((h) => {
          const r = RESULT_STYLE[h.result];
          return (
            <Link
              key={h.match_id}
              to={`/partidos/${h.match_id}`}
              className="flex items-center gap-3 rounded-xl bg-pitch-850 border border-pitch-700 px-3.5 py-2.5 hover:border-gold-500/40 transition-colors"
            >
              <span
                className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center font-display text-xs font-bold ${r.className}`}
              >
                {r.label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-floodlight-300 flex items-center gap-1.5">
                  {h.own_score} - {h.rival_score}
                  {h.is_totw && <Trophy size={12} className="text-gold-400 shrink-0" />}
                </div>
                <div className="text-[11px] text-floodlight-300/40">
                  {new Date(h.date_played).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              {(h.goals > 0 || h.assists > 0) && (
                <div className="text-xs font-semibold text-gold-400 shrink-0 text-right">
                  {h.goals > 0 && <div>{h.goals}G</div>}
                  {h.assists > 0 && <div>{h.assists}A</div>}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
