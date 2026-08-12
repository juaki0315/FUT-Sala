import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Flag, Trophy } from "lucide-react";
import { api } from "../api/endpoints";
import { BADGE_ICONS } from "../data/badges";

function timeAgo(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(timestamp).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function FeedItem({ event }) {
  if (event.type === "match_created") {
    return (
      <Link
        to={`/partidos/${event.match_id}`}
        className="surface surface-interactive flex items-center gap-3 rounded-xl px-3.5 py-3 hover:border-gold-500/40"
      >
        <div className="h-9 w-9 shrink-0 rounded-lg bg-floodlight-500/10 flex items-center justify-center text-floodlight-400">
          <CalendarPlus size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-floodlight-300">Nuevo partido convocado</div>
          <div className="text-[11px] text-floodlight-300/40">
            {new Date(event.date_played).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
          </div>
        </div>
        <span className="text-[10px] text-floodlight-300/30 shrink-0">{timeAgo(event.timestamp)}</span>
      </Link>
    );
  }

  if (event.type === "match_finished") {
    return (
      <Link
        to={`/partidos/${event.match_id}`}
        className="surface surface-interactive flex items-center gap-3 rounded-xl px-3.5 py-3 hover:border-gold-500/40"
      >
        <div className="h-9 w-9 shrink-0 rounded-lg bg-gold-500/15 flex items-center justify-center text-gold-400">
          <Flag size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-floodlight-300">
            Partido finalizado: {event.team_a_score} - {event.team_b_score}
          </div>
          <div className="text-[11px] text-floodlight-300/40">
            {new Date(event.date_played).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
          </div>
        </div>
        <span className="text-[10px] text-floodlight-300/30 shrink-0">{timeAgo(event.timestamp)}</span>
      </Link>
    );
  }

  if (event.type === "totw_generated") {
    const names = event.totw.slice(0, 2).map((p) => p.username).join(", ");
    const rest = event.totw.length - 2;
    return (
      <Link
        to={`/partidos/${event.match_id}`}
        className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-totw-purple/20 to-transparent border border-totw-purple/30 px-3.5 py-3 hover:border-totw-purple/60 transition-colors"
      >
        <div className="h-9 w-9 shrink-0 rounded-lg bg-totw-purple/20 flex items-center justify-center text-gold-400">
          <Trophy size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gold-200">Equipo de la Jornada generado</div>
          <div className="text-[11px] text-floodlight-300/40 truncate">
            {names}
            {rest > 0 ? ` y ${rest} más` : ""}
          </div>
        </div>
        <span className="text-[10px] text-floodlight-300/30 shrink-0">{timeAgo(event.timestamp)}</span>
      </Link>
    );
  }

  if (event.type === "badge_unlocked") {
    const Icon = BADGE_ICONS[event.badge_code] ?? Trophy;
    return (
      <Link
        to={`/jugadores/${event.player_id}`}
        className="surface surface-interactive flex items-center gap-3 rounded-xl px-3.5 py-3 hover:border-gold-500/40"
      >
        <div className="h-9 w-9 shrink-0 rounded-full bg-pitch-900 border border-gold-500/60 overflow-hidden flex items-center justify-center text-floodlight-200 font-display text-sm">
          {event.photo_url ? (
            <img src={event.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            event.username?.[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-floodlight-300">
            <span className="font-semibold">{event.username}</span> consiguió{" "}
            <span className="text-gold-400">{event.badge_name}</span>
          </div>
        </div>
        <Icon size={16} className="text-gold-400 shrink-0" />
        <span className="text-[10px] text-floodlight-300/30 shrink-0">{timeAgo(event.timestamp)}</span>
      </Link>
    );
  }

  return null;
}

/** Feed cronológico de novedades del grupo: partidos, TOTJ, insignias. */
export default function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .activityFeed()
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2">
          Novedades
        </h2>
        <div className="space-y-2">
          <div className="h-14 rounded-xl bg-pitch-850 animate-pulse" />
          <div className="h-14 rounded-xl bg-pitch-850 animate-pulse" />
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2">
        Novedades
      </h2>
      <div className="space-y-2">
        {events.map((event, i) => (
          <FeedItem key={`${event.type}-${event.match_id ?? event.player_id}-${event.badge_code ?? i}-${i}`} event={event} />
        ))}
      </div>
    </section>
  );
}
