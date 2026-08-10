import PlayerCard from "./PlayerCard";

function PitchLines() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 320 460"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="304" height="444" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <line x1="8" y1="230" x2="312" y2="230" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <circle cx="160" cy="230" r="40" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <circle cx="160" cy="230" r="2" fill="var(--color-pitch-600)" />
      <rect x="100" y="8" width="120" height="46" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
      <rect x="100" y="406" width="120" height="46" fill="none" stroke="var(--color-pitch-600)" strokeWidth="2" />
    </svg>
  );
}

/**
 * Muestra el Top 5 de la jornada como una alineación 2-2-1 sobre un campo de
 * futsal: el MVP (rank 1) arriba del todo en solitario (pívot), 2 en la fila
 * intermedia (alas) y 2 abajo (cierres) — sin datos reales de posición, el
 * reparto sale directo del ranking de la votación.
 */
export default function TotwPitch({ entries }) {
  const rows = [entries.slice(0, 1), entries.slice(1, 3), entries.slice(3, 5)].filter(
    (row) => row.length > 0
  );

  return (
    <div className="relative rounded-2xl overflow-hidden border border-pitch-700 bg-gradient-to-b from-pitch-850 via-pitch-800 to-pitch-850 p-4">
      <PitchLines />
      <div className="relative z-10 flex flex-col gap-6">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-3">
            {row.map((mp) => (
              <div key={mp.id} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-gold-400 font-display text-base leading-none">
                  #{mp.totw_rank} {mp.totw_rank === 1 ? "· MVP" : ""}
                </span>
                <PlayerCard player={mp.player_detail} size="sm" animated={false} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
