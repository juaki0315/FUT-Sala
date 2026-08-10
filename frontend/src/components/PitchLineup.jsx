import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

const TEAM_LABEL = { A: "Equipo A", B: "Equipo B" };

function PlayerChip({ mp }) {
  const p = mp.player_detail;
  if (!p) return null;
  return (
    <Link to={`/jugadores/${mp.player}`} className="flex flex-col items-center gap-1 w-[4.2rem] shrink-0">
      <div className="relative h-12 w-12 rounded-full bg-pitch-900 border-2 border-gold-500/80 overflow-hidden flex items-center justify-center text-floodlight-200 font-display text-lg shadow-lg shadow-black/40">
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.username} className="h-full w-full object-cover" />
        ) : (
          p.username?.[0]?.toUpperCase() ?? "?"
        )}
        {mp.is_totw && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold-500 text-pitch-900 flex items-center justify-center">
            <Trophy size={9} />
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold text-floodlight-200 truncate w-full text-center">
        {p.username}
      </span>
      <span className="text-[10px] font-display text-gold-400 leading-none">
        {p.current_card_rating ?? p.overall_rating}
      </span>
    </Link>
  );
}

function PitchLines() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 200 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="188" height="308" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <line x1="6" y1="160" x2="194" y2="160" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <circle cx="100" cy="160" r="28" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <circle cx="100" cy="160" r="2" fill="var(--color-pitch-600)" />
      <rect x="60" y="6" width="80" height="34" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <rect x="60" y="280" width="80" height="34" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
    </svg>
  );
}

export default function PitchLineup({ teamA, teamB }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-pitch-700 bg-gradient-to-b from-pitch-850 via-pitch-800 to-pitch-850 min-h-[320px]">
      <PitchLines />
      <div className="relative z-10 flex flex-col h-full min-h-[320px] py-4">
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-floodlight-300/40 mb-1">
            {TEAM_LABEL.A}
          </span>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
            {teamA.length === 0 ? (
              <span className="text-xs text-floodlight-300/30">Sin jugadores</span>
            ) : (
              teamA.map((mp) => <PlayerChip key={mp.id} mp={mp} />)
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
            {teamB.length === 0 ? (
              <span className="text-xs text-floodlight-300/30">Sin jugadores</span>
            ) : (
              teamB.map((mp) => <PlayerChip key={mp.id} mp={mp} />)
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-floodlight-300/40 mt-1">
            {TEAM_LABEL.B}
          </span>
        </div>
      </div>
    </div>
  );
}
