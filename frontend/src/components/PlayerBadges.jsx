import {
  Target,
  Hand,
  Send,
  Flame,
  ShieldCheck,
  Zap,
  Medal,
  Award,
  Trophy,
  Star,
  Crown,
} from "lucide-react";

const BADGE_CATALOG = [
  { code: "hat_trick", name: "Hat-trick", description: "Marcó 3 o más goles en un partido.", icon: Target },
  { code: "manita", name: "Manita", description: "Marcó 5 o más goles en un partido.", icon: Hand },
  { code: "playmaker", name: "Asistente", description: "Dio 3 o más asistencias en un partido.", icon: Send },
  { code: "streak_3_wins", name: "Racha ganadora", description: "3 victorias seguidas.", icon: Flame },
  { code: "unbeaten_5", name: "Invicto", description: "5 partidos seguidos sin perder.", icon: ShieldCheck },
  { code: "scoring_streak_3", name: "Racha goleadora", description: "Marcó en 3 partidos seguidos.", icon: Zap },
  { code: "matches_3", name: "Debutante", description: "3 partidos disputados.", icon: Medal },
  { code: "matches_6", name: "Habitual", description: "6 partidos disputados.", icon: Award },
  { code: "matches_10", name: "Veterano", description: "10 partidos disputados.", icon: Trophy },
  { code: "totw_first", name: "Convocado", description: "Primera convocatoria al Equipo de la Jornada.", icon: Star },
  { code: "mvp", name: "MVP", description: "Fue el jugador más votado de una jornada.", icon: Crown },
];

/** Vitrina de logros: insignias desbloqueadas y pendientes de conseguir. */
export default function PlayerBadges({ badges }) {
  const unlockedCodes = new Set((badges || []).map((b) => b.code));

  return (
    <section className="w-full">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
        Vitrina de logros
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {BADGE_CATALOG.map((b) => {
          const unlocked = unlockedCodes.has(b.code);
          const Icon = b.icon;
          return (
            <div
              key={b.code}
              title={b.description}
              className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center ${
                unlocked
                  ? "bg-gold-500/10 border-gold-500/40"
                  : "bg-pitch-850 border-pitch-700 opacity-40"
              }`}
            >
              <Icon size={20} className={unlocked ? "text-gold-400" : "text-floodlight-300/40"} />
              <span
                className={`text-[11px] font-semibold leading-tight ${
                  unlocked ? "text-floodlight-300" : "text-floodlight-300/50"
                }`}
              >
                {b.name}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
