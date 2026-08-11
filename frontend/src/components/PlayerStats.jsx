import { Swords, Trophy, Goal, Footprints } from "lucide-react";

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-pitch-850 border border-pitch-700 p-3 flex flex-col items-center gap-1">
      <Icon size={15} className="text-gold-400" />
      <span className="font-display text-2xl text-floodlight-300 leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-floodlight-300/50">{label}</span>
    </div>
  );
}

/** Estadísticas de carrera: partidos, récord V-E-D, goles y asistencias. */
export default function PlayerStats({ stats }) {
  if (!stats) return null;

  return (
    <section className="w-full">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
        Estadísticas
      </h2>
      <div className="grid grid-cols-4 gap-2">
        <StatTile icon={Swords} label="Partidos" value={stats.matches_played} />
        <StatTile
          icon={Trophy}
          label="V-E-D"
          value={`${stats.wins}-${stats.draws}-${stats.losses}`}
        />
        <StatTile icon={Goal} label="Goles" value={stats.goals} />
        <StatTile icon={Footprints} label="Asist." value={stats.assists} />
      </div>
    </section>
  );
}
